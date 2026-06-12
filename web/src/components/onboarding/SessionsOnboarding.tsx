import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { BarChart4, GitMerge, MessageSquare, Users } from "lucide-react";
import Link from "next/link";

export function SessionsOnboarding() {
  const valuePropositions: ValueProposition[] = [
    {
      title: "Group related traces",
      description:
        "Sessions allow you to group related traces, such as a conversation or thread, for better organization and analysis",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      title: "Track user interactions",
      description: "Monitor how users interact with your application over time",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Analyze conversation flows",
      description: "Understand the complete flow of multi-turn conversations",
      icon: <GitMerge className="h-4 w-4" />,
    },
    {
      title: "Session-level metrics",
      description:
        "Get aggregated metrics for entire sessions, including costs and token usage",
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title="从Sessions开始记录观测"
      description="Session是一组相关 Trace 的集合，例如一次多轮对话或话题串。"
      valuePropositions={valuePropositions}
      gettingStarted={
        <span>
          为了可以使用此Session记录观测数据，需要在智能体中进行对话。
          {/*To start using sessions, you need to add a `sessionId` to your traces.*/}
          {/*See{" "}*/}
          {/*<Link*/}
          {/*  href="https://langfuse.com/docs/observability/features/sessions"*/}
          {/*  className="underline"*/}
          {/*>*/}
          {/*  documentation*/}
          {/*</Link>{" "}*/}
          {/*for more details.*/}
        </span>
      }
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/sessions-overview-v1.mp4"
    />
  );
}
