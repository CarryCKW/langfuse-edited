import { sessionsViewCols } from "@langfuse/shared";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import type { ColumnToBackendKeyMap } from "@/src/features/filters/lib/filter-transform";

/**
 * Maps frontend column IDs to backend-expected column IDs
 * Frontend uses "tags" but backend CH mapping expects "traceTags" for trace tags on sessions table
 */
export const SESSION_COLUMN_TO_BACKEND_KEY: ColumnToBackendKeyMap = {
  tags: "traceTags",
};

export const sessionFilterConfig: FilterConfig = {
  tableName: "sessions",

  columnDefinitions: sessionsViewCols,

  defaultExpanded: ["environment", "bookmarked"],

  facets: [
    // {
    //   type: "categorical" as const,
    //   column: "environment",
    //   label: "Environment",
    // },
    {
      type: "string" as const,
      column: "id",
      label: "Session ID",
    },
    // {
    //   type: "categorical" as const,
    //   column: "userIds",
    //   label: "User IDs",
    // },
    {
      type: "categorical" as const,
      column: "tags",
      label: "Trace标签", //Tags
    },
    {
      type: "boolean" as const,
      column: "bookmarked",
      label: "已收藏", //Bookmarked
      trueLabel: "已收藏", //Bookmarked
      falseLabel: "未收藏", //Not bookmarked
    },
    {
      type: "numeric" as const,
      column: "sessionDuration",
      label: "Session会话时长", //Duration
      min: 0,
      max: 3600,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "countTraces",
      label: "Traces数量", //Count
      min: 0,
      max: 1000,
    },
    {
      type: "numeric" as const,
      column: "inputTokens",
      label: "输入Tokens量", //Input
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "outputTokens",
      label: "输出Tokens量", //Output
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "totalTokens",
      label: "总Tokens量", //Total
      min: 0,
      max: 1000000,
    },
    // {
    //   type: "numeric" as const,
    //   column: "inputCost",
    //   label: "Input Cost",
    //   min: 0,
    //   max: 100,
    //   unit: "$",
    // },
    // {
    //   type: "numeric" as const,
    //   column: "outputCost",
    //   label: "Output Cost",
    //   min: 0,
    //   max: 100,
    //   unit: "$",
    // },
    // {
    //   type: "numeric" as const,
    //   column: "totalCost",
    //   label: "Total Cost",
    //   min: 0,
    //   max: 100,
    //   unit: "$",
    // },
    // {
    //   type: "keyValue" as const,
    //   column: "score_categories",
    //   label: "Categorical Scores",
    // },
    // {
    //   type: "numericKeyValue" as const,
    //   column: "scores_avg",
    //   label: "Numeric Scores",
    // },
    {
      type: "numeric" as const,
      column: "commentCount",
      label: "评论数量", //Comment Count
      min: 0,
      max: 100,
    },
    {
      type: "string" as const,
      column: "commentContent",
      label: "评论内容", //Comment Content
    },
  ],
};
