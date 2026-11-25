import type { Recipe } from "./types";

/** Recipes use CyberChef's native `OperationConfig` names and argument shapes. */
export const BUILTIN_RECIPES: Recipe[] = [
  {
    name: "Base64 解码",
    description: "From Base64：还原 UTF-8 文本",
    ops: [{ op: "From Base64", args: ["A-Za-z0-9+/=", true] }],
  },
  {
    name: "Base64 套娃剥层",
    description: "连续三层 From Base64，自动剥离嵌套编码",
    ops: [
      { op: "From Base64", args: ["A-Za-z0-9+/=", true] },
      { op: "From Base64", args: ["A-Za-z0-9+/=", true] },
      { op: "From Base64", args: ["A-Za-z0-9+/=", true] },
    ],
  },
  {
    name: "Hex 解码",
    description: "From Hex：把十六进制串还原为文本",
    ops: [{ op: "From Hex", args: ["Auto"] }],
  },
  {
    name: "URL 解码",
    description: "URL Decode：还原百分号编码与加号",
    ops: [{ op: "URL Decode", args: [false, false] }],
  },
  {
    name: "Magic 自动识别",
    description: "Magic：深度 5 自动尝试编解码",
    ops: [{ op: "Magic", args: [5] }],
  },
  {
    name: "解密 JWT",
    description: "JWT Decode：查看 Header 与 Payload",
    ops: [{ op: "JWT Decode", args: [] }],
  },
  {
    name: "AES 解密前端密文",
    description: "AES Decrypt：CBC / Hex 输入 / Raw 输出，按需改密钥与 IV",
    ops: [
      {
        op: "AES Decrypt",
        args: ["password", "00000000000000000000000000000000", 16, "CBC", "Hex", "Raw", "", "", "Off"],
      },
    ],
  },
  {
    name: "解析 X.509 证书",
    description: "Parse X.509 certificate：读取 PEM 证书字段",
    ops: [{ op: "Parse X.509 certificate", args: [] }],
  },
  {
    name: "解压 Gzip",
    description: "Gunzip：解压 gzip 字节流",
    ops: [{ op: "Gunzip", args: [] }],
  },
  {
    name: "Zlib 解压",
    description: "Zlib Inflate：解压 zlib 数据流",
    ops: [{ op: "Zlib Inflate", args: [] }],
  },
  {
    name: "还原 Webpack 混淆字符串",
    description: "Strings：提取混淆代码中长度 ≥ 4 的可打印串",
    ops: [{ op: "Strings", args: ["Latin1", 4, "All", false, false, false] }],
  },
  {
    name: "计算 MD5",
    description: "MD5：输出 32 位十六进制摘要",
    ops: [{ op: "MD5", args: [] }],
  },
  {
    name: "计算 SHA-256",
    description: "SHA2：256 位摘要",
    ops: [{ op: "SHA2", args: ["256", 64] }],
  },
  {
    name: "计算 SHA3",
    description: "SHA3：512 位摘要",
    ops: [{ op: "SHA3", args: ["512"] }],
  },
  {
    name: "HMAC 签名",
    description: "HMAC：以 secret 为密钥、SHA256 为摘要算法",
    ops: [{ op: "HMAC", args: ["secret", "SHA256"] }],
  },
  {
    name: "时间戳转日期",
    description: "From UNIX Timestamp：秒级时间戳转 UTC",
    ops: [{ op: "From UNIX Timestamp", args: ["Seconds (s)"] }],
  },
  {
    name: "日期转时间戳",
    description: "To UNIX Timestamp：文本日期转秒级时间戳",
    ops: [{ op: "To UNIX Timestamp", args: ["Seconds (s)", true, true] }],
  },
  {
    name: "提取 URL",
    description: "Extract URLs：提取并去重链接",
    ops: [{ op: "Extract URLs", args: [false, true, true] }],
  },
  {
    name: "Fork 多行处理",
    description: "Fork + From Base64 + Merge：逐行解码后合并",
    ops: [
      { op: "Fork", args: ["\\n", "\\n", false] },
      { op: "From Base64", args: ["A-Za-z0-9+/=", true] },
      { op: "Merge", args: [true] },
    ],
  },
  {
    name: "JSON 美化",
    description: "JSON Beautify：四空格缩进",
    ops: [{ op: "JSON Beautify", args: ["    ", false, true] }],
  },
];
