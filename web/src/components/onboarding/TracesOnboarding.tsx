import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { setupTracingRoute } from "@/src/features/setup/setupRoutes";
import { BarChart4, GitMerge, Search, Zap } from "lucide-react";

interface TracesOnboardingProps {
  projectId: string;
}

export function TracesOnboarding({ projectId }: TracesOnboardingProps) {
  const valuePropositions: ValueProposition[] = [
    {
      title: "Full context capture",
      description:
        "Track the complete execution flow including API calls, context, prompts, parallelism and more",
      icon: <GitMerge className="h-4 w-4" />,
    },
    {
      title: "Cost monitoring",
      description: "Track model usage and costs across your application",
      icon: <BarChart4 className="h-4 w-4" />,
    },
    {
      title: "Basis for evaluation",
      description:
        "Add evaluation scores to identify issues and track metrics over time",
      icon: <Search className="h-4 w-4" />,
    },
    {
      title: "Open and Multi-modal",
      description:
        "Langfuse traces can include images, audio, and other modalities. You can fully customize them to fit your needs",
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title="开始使用Tracing"
      description="Tracing允许您跟踪应用程序/智能体中的每个LLM调用和其他相关逻辑。可观测中的嵌套跟踪有助于追踪正在发生的过程，并定位问题的根本原因。"
      valuePropositions={valuePropositions}
      primaryAction={{
        label: "Configure Tracing",
        href: setupTracingRoute(projectId),
      }}
      secondaryAction={{
        label: "View Documentation",
        href: "https://langfuse.com/docs/observability/overview",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/tracing-overview-v1.mp4"
    />
  );
}
