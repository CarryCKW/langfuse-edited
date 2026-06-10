import { type Session } from "next-auth";
import { prisma, Prisma } from "@langfuse/shared/src/db";
import { CloudConfigSchema } from "@langfuse/shared";
import { resolveProjectRole } from "@langfuse/shared/src/server";
import { parseFlags } from "@/src/features/feature-flags/utils";
import { env } from "@/src/env.mjs";
import {
  getOrganizationPlanServerSide,
  getSelfHostedInstancePlanServerSide,
} from "@/src/features/entitlements/server/getPlan";
import { projectRoleAccessRights } from "@/src/features/rbac/constants/projectAccessRights";
import { createSupportEmailHash } from "@/src/features/support-chat/createSupportEmailHash";
import { hasEntitlementBasedOnPlan } from "@/src/features/entitlements/server/hasEntitlement";

function canCreateOrganizations(userEmail: string | null): boolean {
  const instancePlan = getSelfHostedInstancePlanServerSide();

  if (
    !env.LANGFUSE_ALLOWED_ORGANIZATION_CREATORS ||
    !hasEntitlementBasedOnPlan({
      plan: instancePlan,
      entitlement: "self-host-allowed-organization-creators",
    })
  ) {
    return true;
  }

  if (!userEmail) return false;

  const allowedOrgCreators =
    env.LANGFUSE_ALLOWED_ORGANIZATION_CREATORS.toLowerCase().split(",");
  return allowedOrgCreators.includes(userEmail.toLowerCase());
}

const userWithMembershipsArgs = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
    name: true,
    email: true,
    image: true,
    emailVerified: true,
    featureFlags: true,
    admin: true,
    organizationMemberships: {
      include: {
        organization: {
          include: {
            projects: {
              where: {
                deletedAt: {
                  equals: null,
                },
              },
            },
          },
        },
        ProjectMemberships: {
          include: {
            project: true,
          },
        },
      },
    },
  },
});

type DbUserWithMemberships = Prisma.UserGetPayload<
  typeof userWithMembershipsArgs
>;

export function buildAppSessionFromDbUser(
  dbUser: DbUserWithMemberships | null,
): Session {
  const expires = new Date(
    Date.now() + env.AUTH_SESSION_MAX_AGE * 60 * 1000,
  ).toISOString();

  return {
    expires,
    environment: {
      enableExperimentalFeatures:
        env.LANGFUSE_ENABLE_EXPERIMENTAL_FEATURES === "true",
      selfHostedInstancePlan: getSelfHostedInstancePlanServerSide(),
    },
    user:
      dbUser !== null
        ? {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            emailSupportHash: dbUser.email
              ? createSupportEmailHash(dbUser.email)
              : undefined,
            image: dbUser.image,
            admin: dbUser.admin,
            canCreateOrganizations: canCreateOrganizations(dbUser.email),
            organizations: dbUser.organizationMemberships.map(
              (orgMembership) => {
                const parsedCloudConfig = CloudConfigSchema.safeParse(
                  orgMembership.organization.cloudConfig,
                );
                return {
                  id: orgMembership.organization.id,
                  name: orgMembership.organization.name,
                  role: orgMembership.role,
                  metadata:
                    (orgMembership.organization.metadata as Record<
                      string,
                      unknown
                    >) ?? {},
                  aiFeaturesEnabled:
                    orgMembership.organization.aiFeaturesEnabled,
                  cloudConfig: parsedCloudConfig.data,
                  projects: orgMembership.organization.projects
                    .map((project) => {
                      const projectRole = resolveProjectRole({
                        projectId: project.id,
                        projectMemberships: orgMembership.ProjectMemberships,
                        orgMembershipRole: orgMembership.role,
                      });
                      return {
                        id: project.id,
                        name: project.name,
                        role: projectRole,
                        retentionDays: project.retentionDays,
                        deletedAt: project.deletedAt,
                        metadata:
                          (project.metadata as Record<string, unknown>) ?? {},
                      };
                    })
                    .filter((project) =>
                      projectRoleAccessRights[project.role].includes(
                        "project:read",
                      ),
                    ),
                  plan: getOrganizationPlanServerSide(parsedCloudConfig.data),
                };
              },
            ),
            emailVerified: dbUser.emailVerified?.toISOString(),
            featureFlags: parseFlags(dbUser.featureFlags),
          }
        : null,
  } as Session;
}

export async function buildAppSessionForEmail(
  email: string,
): Promise<Session | null> {
  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    ...userWithMembershipsArgs,
  });

  if (!dbUser) return null;

  return buildAppSessionFromDbUser(dbUser);
}
