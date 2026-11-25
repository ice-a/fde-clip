# 贡献指南

## 环境

- Node.js 22+、pnpm 12+、Rust 1.90+、平台 Tauri v2 前置依赖（见 tauri.app 文档）

```bash
pnpm install
pnpm tauri dev
```

## 结构

- `src/`：React + TS + Tailwind + Zustand 前端
- `src-tauri/src/commands/`：按 clipboard / vault / ai / chef / settings 划分的命令
- `src-tauri/crates/`：clipboard_watcher / sniffer / vault / ai_client / chef_bridge
- `docs/ARCHITECTURE.md`：模块图、数据流、隐私边界、性能预算

## 扩展诊断规则

编辑 `src-tauri/crates/sniffer/rules/default.toml`，每条 `[[rule]]` 含 id、kind、正则 pattern、severity、message、fix_hint。运行时可在设置页点「重载诊断规则」热加载，无需重启。

新增规则请附一条正反例文本，确保不误杀常见内容。

## 扩展配方

`src-tauri/crates/chef_bridge/src/lib.rs` 的 `execute()` 按 op 名分发。新增 op 需：

1. 实现纯函数，输入输出为 UTF-8 字符串或字节；
2. 在 `builtin_recipes()` 增加对应配方；
3. 在 `src/pages/RecipeEditor.tsx` 的 `availableOps` 中登记。

配方 JSON 使用 CyberChef 兼容的 `{op, args}` 数组，可直接从前端「导出 JSON」获得。

## 提交

- 分支：`feat/`、`fix/`、`docs/`
- 提交信息：`feat: 添加 XXX 规则`
- PR 前跑：`pnpm typecheck && pnpm build && cargo check --manifest-path src-tauri/Cargo.toml`

## 隐私红线

任何改动都不得让剪贴板内容在用户未主动触发时离开本机；API Key 不得写入日志、SQLite 或诊断结果。
