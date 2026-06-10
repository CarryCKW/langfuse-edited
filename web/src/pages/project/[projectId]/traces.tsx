import React from "react";
import { useRouter } from "next/router";
import TracesTable from "@/src/components/table/use-cases/traces";
import Page from "@/src/components/layouts/page";
import { api } from "@/src/utils/api";
import { TracesOnboarding } from "@/src/components/onboarding/TracesOnboarding";
import {
  getTracingTabs,
  TRACING_TABS,
} from "@/src/features/navigation/utils/tracing-tabs";

export default function Traces() {
  const router = useRouter();
  const projectId = router.query.projectId as string;

  // Check if the user has tracing configured
  const { data: hasTracingConfigured, isLoading } =
    api.traces.hasTracingConfigured.useQuery(
      { projectId },
      {
        enabled: !!projectId,
        trpc: {
          context: {
            skipBatch: true,
          },
        },
        refetchInterval: 10_000,
      },
    );

  const showOnboarding = !isLoading && !hasTracingConfigured;

  if (showOnboarding) {
    return (
      <Page
        headerProps={{
          title: "Tracing", //Tracing
          // help: {
          //   description:
          //     "A trace represents a single function/api invocation. Traces contain observations. See docs to learn more.",
          //   // href: "https://langfuse.com/docs/observability/data-model",
          // },
        }}
        scrollable
      >
        <TracesOnboarding projectId={projectId} />
      </Page>
    );
  }

  return (
    <Page
      headerProps={{
        title: "Tracing", //Tracing
        help: {
          description:
            "Trace代表一次完整的端到端交互或执行链路的生命周期，如用户的一次请求，智能体的一次调用等",
          // href: "https://langfuse.com/docs/observability/data-model",
        },
        tabsProps: {
          tabs: getTracingTabs(projectId),
          activeTab: TRACING_TABS.TRACES,
        },
      }}
    >
      <TracesTable projectId={projectId} />
    </Page>
  );
}
