import { tracesTableCols } from "@langfuse/shared";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";

export const traceFilterConfig: FilterConfig = {
  tableName: "traces",

  columnDefinitions: tracesTableCols,

  defaultExpanded: ["environment", "name"],

  facets: [
    // {
    //   type: "categorical" as const,
    //   column: "environment",
    //   label: "Environment",
    // },
    {
      type: "categorical" as const,
      column: "name",
      label: "Trace名称", //Trace Name
    },
    {
      type: "string" as const,
      column: "id",
      label: "Trace ID",
    },
    // {
    //   type: "categorical" as const,
    //   column: "userId",
    //   label: "User ID",
    // },
    {
      type: "categorical" as const,
      column: "sessionId",
      label: "Session ID",
    },
    {
      type: "stringKeyValue" as const,
      column: "metadata",
      label: "元数据", //Metadata
    },
    // {
    //   type: "string" as const,
    //   column: "version",
    //   label: "Version",
    // },
    // {
    //   type: "string" as const,
    //   column: "release",
    //   label: "Release",
    // },
    {
      type: "boolean" as const,
      column: "bookmarked",
      label: "收藏", //Bookmarked
      trueLabel: "已收藏", // Bookmarked
      falseLabel: "未收藏", //Not Bookmarked
    },
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
    {
      type: "categorical" as const,
      column: "tags",
      label: "标签", //Tags
    },
    {
      type: "categorical" as const,
      column: "level",
      label: "模式等级", //Level
    },
    {
      type: "numeric" as const,
      column: "latency",
      label: "耗时", //Latency
      min: 0,
      max: 60,
      unit: "s",
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
      label: "输出Tokens量",
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
  ],
};
