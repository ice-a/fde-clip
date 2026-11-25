import type { Recipe } from "./types";

/** Small, practical toolset. CyberChef ops run as-is; custom ops run in the worker. */
export const BUILTIN_RECIPES: Recipe[] = [
  {
    name: "JSON 转 YAML",
    description: "把 JSON 文本转换为 YAML",
    ops: [{ op: "JSON to YAML", args: [] }],
  },
  {
    name: "YAML 转 JSON",
    description: "把 YAML 文本转换为 JSON",
    ops: [{ op: "YAML to JSON", args: [] }],
  },
  {
    name: "时间戳转日期",
    description: "秒级 Unix 时间戳转 UTC 日期",
    ops: [{ op: "From UNIX Timestamp", args: ["Seconds (s)"] }],
  },
  {
    name: "日期转时间戳",
    description: "文本日期转秒级 Unix 时间戳",
    ops: [{ op: "To UNIX Timestamp", args: ["Seconds (s)", true, true] }],
  },
  {
    name: "Cron 解析",
    description: "解析 5 段 cron 表达式并给出可读说明",
    ops: [{ op: "Cron Parse", args: [] }],
  },
  {
    name: "Base64 文本编码",
    description: "把文本编码为 Base64",
    ops: [{ op: "To Base64", args: ["A-Za-z0-9+/="] }],
  },
  {
    name: "Base64 文本解码",
    description: "把 Base64 还原为文本",
    ops: [{ op: "From Base64", args: ["A-Za-z0-9+/=", true] }],
  },
  {
    name: "图片转 Base64",
    description: "把图片文件或 data URL 转为 Base64 data URL",
    ops: [{ op: "Image To Base64", args: [] }],
  },
  {
    name: "Base64 转图片",
    description: "把图片 Base64 转为可预览的 data URL",
    ops: [{ op: "Base64 To Image", args: [] }],
  },
  {
    name: "JSON 格式化",
    description: "四空格缩进美化 JSON",
    ops: [{ op: "JSON Beautify", args: ["    ", false, true] }],
  },
  {
    name: "SQL 格式化",
    description: "SQL Beautify：格式化 SQL 语句",
    ops: [{ op: "SQL Beautify", args: ["\t"] }],
  },
  {
    name: "生成 Hash",
    description: "计算 SHA-256 摘要",
    ops: [{ op: "SHA2", args: ["256", 64] }],
  },
  {
    name: "密码生成器",
    description: "用系统 CSPRNG 生成随机密码，参数为长度",
    ops: [{ op: "Password Generate", args: [16] }],
  },
  {
    name: "生成 UUID",
    description: "生成版本 4 随机 UUID",
    ops: [{ op: "Generate UUID", args: ["v4"] }],
  },
  {
    name: "图片压缩",
    description: "把图片转换为 WebP，参数为质量 0-1",
    ops: [{ op: "Image Compress", args: [0.7] }],
  },
];
