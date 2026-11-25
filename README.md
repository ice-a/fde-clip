# fde-clip

轻量级、全平台的智能剪贴板工作台：自动嗅探复制内容、本地诊断风险、CyberChef 级配方处理（506 operations），可选接入任意 OpenAI 兼容大模型。

> 当前范围：20 条诊断规则 + 20 个内置配方 + 完整 CyberChef 引擎 + 一个流式 AI Provider。详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 功能

- 后台监听剪贴板，历史落本地 SQLite，支持全文 / 正则搜索、置顶、自动过期
- 复制后立即本地诊断（目标 < 200ms）：密钥泄露、JSON 语法、危险 shell、时间戳、Base64/Hex/JWT 等
- 高危内容非侵入 toast 提示，一键本地打码
- 配方 pipeline：拖拽排序，20 个内置配方，可从 506 个 CyberChef 操作中自由组合，支持导出 JSON
- OpenAI 兼容 SSE 流式对话；API Key 存系统钥匙串，请求走 Rust 代理
- 系统托盘 + 全局快捷键：`Ctrl+Shift+V` 呼出，`Ctrl+Shift+C` 打开 AI 分析

![主面板截图]([IMAGE_PLACEHOLDER])

![配方编辑器截图]([IMAGE_PLACEHOLDER_2])

## 安装

开发版（需 Node 22+、Rust 1.90+、pnpm 12+）：

```bash
pnpm install
pnpm tauri dev
```

正式构建：

```bash
pnpm tauri build
```

产物位于 `src-tauri/target/release/bundle/`。Windows 生成 NSIS/msi，macOS 生成 dmg，Linux 生成 AppImage/deb。macOS 签名需配置 `APPLE_CERTIFICATE` 等 secrets（见 `.github/workflows/release.yml`）。
> 已验证产物：Windows NSIS `fde-clip_0.1.0_x64-setup.exe`（8.66 MiB）、MSI `fde-clip_0.1.0_x64_en-US.msi`（10.47 MiB），均低于 25 MB。macOS dmg 与 Linux AppImage/deb 由 `.github/workflows/release.yml` 的 matrix 在各自 runner 上出包，本机无法交叉构建。

## 本地验证（MVP）

1. `pnpm tauri dev` 启动；复制任意文本，历史流出现新条目并弹出诊断 toast。
2. 复制一段含假 Key 的 JSON：`{"api_key": "sk-00000000000000000000000000000000"}`，诊断卡标红并显示 `openai_key`，耗时 < 200ms。
3. 选中一段 Base64（如 `SGVsbG8gZmRlLWNsaXAh`），点「用配方解码」→ 运行配方 → 输出 `Hello fde-clip!`；配方页可看到 20 个内置配方与 506 个操作。
4. 设置页填入 OpenAI 兼容 `baseURL` + Key，打开 AI 抽屉发送消息，逐字流式输出。
> dev 说明：首次 `pnpm tauri dev` 会自动执行一次 `pnpm build`，生成并复用已验证的 CyberChef worker bundle；之后配方编辑器的 506 个操作与全部 20 个配方在开发模式下同样可执行。
> 验证状态：生产 bundle 与 dev 模式均已实测 Base64、Hex、MD5、Magic、JWT Decode、Fork、JSON Beautify 配方执行成功。

> 后台与自启已验证：关闭窗口后进程存活、窗口隐藏到托盘；`Ctrl+Shift+V` 可唤出。开机自启开关经 WebView IPC 实测，开启后注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 写入 fde-clip，关闭后移除。

## 隐私

- 剪贴板内容、诊断结果只写本地 SQLite，不上云。
- API Key 存系统钥匙串（Windows Credential Manager / macOS Keychain / Linux Secret Service）。
- 只有用户主动点击「发送给 AI」才发送选中片段与场景 prompt。
- 一键打码在前端本地完成，不调用网络。

## 许可

MIT 或 Apache-2.0，任选其一。详见 [LICENSE-MIT](LICENSE-MIT) 与 [LICENSE-APACHE](LICENSE-APACHE)。
