import { observationsTableCols } from "@langfuse/shared";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import type { ColumnToBackendKeyMap } from "@/src/features/filters/lib/filter-transform";

/**
 * Maps frontend column IDs to backend-expected column IDs
 * Frontend uses "tags" but backend CH mapping expects "traceTags" for trace tags on observations table
 */
export const OBSERVATION_COLUMN_TO_BACKEND_KEY: ColumnToBackendKeyMap = {
  tags: "traceTags",
};

export const observationFilterConfig: FilterConfig = {
  tableName: "observations",

  columnDefinitions: observationsTableCols,

  defaultExpanded: ["environment", "name"],

  facets: [
    // {
    //   type: "categorical" as const,
    //   column: "environment",
    //   label: "Environment",
    // },
    {
      type: "categorical" as const,
      column: "type",
      label: "类别", //Type
    },
    {
      type: "categorical" as const,
      column: "name",
      label: "名称", //Name
    },
    {
      type: "categorical" as const,
      column: "traceName",
      label: "Trace名称",
    },
    {
      type: "categorical" as const,
      column: "level",
      label: "模式等级",
    },
    {
      type: "categorical" as const,
      column: "model",
      label: "模型",
    },
    {
      type: "categorical" as const,
      column: "modelId",
      label: "模型ID",
    },
    {
      type: "categorical" as const,
      column: "promptName",
      label: "Prompt名称",
    },
    {
      type: "categorical" as const,
      column: "tags",
      label: "Trace标签", //Trace Tags
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
      column: "timeToFirstToken",
      label: "首Token时延", //Time to First Token
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "inputTokens",
      label: "输入Tokens量", //Input Tokens
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "outputTokens",
      label: "输出Tokens量", //Output Tokens
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "totalTokens",
      label: "Tokens总量", //Total Tokens
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
    {
      type: "categorical" as const,
      column: "toolNames",
      label: "可用工具名称", //Available Tool Names
    },
    {
      type: "categorical" as const,
      column: "calledToolNames",
      label: "调用工具名", //Called Tool Names
    },
    {
      type: "numeric" as const,
      column: "toolDefinitions",
      label: "可用工具", //Available Tools
      min: 0,
      max: 25,
    },
    {
      type: "numeric" as const,
      column: "toolCalls",
      label: "调用工具次数", //Tool Calls
      min: 0,
      max: 25,
    },
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
    // {
    //   type: "numeric" as const,
    //   column: "commentCount",
    //   label: "评论数量", //Comment Count
    //   min: 0,
    //   max: 100,
    // },
    // {
    //   type: "string" as const,
    //   column: "commentContent",
    //   label: "评论内容", //Comment Content
    // },
  ],
};
