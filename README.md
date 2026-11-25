# fde-clip

轻量级、全平台的离线剪贴板工具箱：自动嗅探复制内容、本地诊断风险、常用编解码与格式化工具。

> 当前范围：20 条诊断规则 + 15 个常用工具配方 + 完整 CyberChef 引擎，纯本地运行，无网络功能。详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 功能

- 后台监听剪贴板，历史落本地 SQLite，支持全文 / 正则搜索、置顶、自动过期
- 复制后立即本地诊断（目标 < 200ms）：密钥泄露、JSON 语法、危险 shell、时间戳、Base64/Hex/JWT 等
- 高危内容非侵入 toast 提示，一键本地打码
- 配方 pipeline：拖拽排序，15 个常用配方（JSON/YAML 互转、时间戳互转、Cron 解析、Base64 文本与图片编解码、JSON/SQL 格式化、Hash、密码生成、UUID、图片压缩），支持导出 JSON；操作库含 506 个 CyberChef ops
- 系统托盘 + 全局快捷键：`Ctrl+Shift+V` 呼出；关闭窗口隐藏到托盘；可选开机自启

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
> 已验证产物：Windows NSIS `fde-clip_0.1.0_x64-setup.exe`（7.76 MiB）、MSI `fde-clip_0.1.0_x64_en-US.msi`（9.28 MiB）。macOS dmg 与 Linux AppImage/deb/rpm 由 `.github/workflows/release.yml` 的 matrix 在各自 runner 上出包。

## Android

构建：`pnpm tauri android build --ci --apk --aab -t aarch64`（需 Android SDK/NDK 与 `aarch64-linux-android` Rust target）。

Android 10+ 禁止后台应用读取剪贴板。应用内的「后台剪贴板监听」需要用户主动到系统设置 → 无障碍 → 已下载的服务中开启「fde-clip 剪贴板监听」；设置页提供跳转入口与授权状态显示。未授权时应用只在前台手动使用，不会读取剪贴板。

## 本地验证（MVP）

1. `pnpm tauri dev` 启动；复制任意文本，历史流出现新条目并弹出诊断 toast。
2. 复制一段含假 Key 的 JSON：`{"api_key": "sk-00000000000000000000000000000000"}`，诊断卡标红并显示 `openai_key`，耗时 < 200ms。
3. 选中一段 Base64（如 `SGVsbG8gZmRlLWNsaXAh`），点「用配方解码」→ 运行「Base64 文本解码」→ 输出 `Hello fde-clip!`；配方页只保留 15 个常用工具。
> dev 说明：首次 `pnpm tauri dev` 会自动执行一次 `pnpm build`，生成并复用已验证的 CyberChef worker bundle；配方在 dev 与生产模式下均可执行。
> 验证状态：生产 bundle 与 dev 模式均已实测 JSON/YAML 互转、时间戳互转、Base64 文本编解码、Hash、UUID、JSON/SQL 格式化等配方执行成功。

> 后台与自启已验证：关闭窗口后进程存活、窗口隐藏到托盘；`Ctrl+Shift+V` 可唤出。开机自启开关经 WebView IPC 实测，开启后注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 写入 fde-clip，关闭后移除。

## 隐私

- 剪贴板内容、诊断结果只写本地 SQLite，不上云。
- 应用无网络请求，不需要账号，不上传任何内容。
- 一键打码在前端本地完成，不调用网络。

## 许可

MIT 或 Apache-2.0，任选其一。详见 [LICENSE-MIT](LICENSE-MIT) 与 [LICENSE-APACHE](LICENSE-APACHE)。
