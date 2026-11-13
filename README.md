# Flowdeck · 个人 AI 工作台

第一阶段可操作前端原型。使用 React、TypeScript、Vite、Tailwind CSS 与 Radix UI 构建，并通过 Tauri 2 提供 macOS / Windows 桌面应用。桌面版通过本机 OneDrive 客户端在设备之间同步数据，浏览器开发模式继续使用 `localStorage`。

## 本地启动

需要 Node.js 18 或更高版本，以及 npm / pnpm。

```bash
pnpm install
pnpm dev
```

浏览器打开终端显示的地址（默认 `http://localhost:5173`）。

生产构建：

```bash
pnpm build
pnpm preview
```

使用 npm 时，将 `pnpm` 替换为 `npm` 即可。

## 桌面应用

当前本机安装文件位于：

- `src-tauri/target/release/bundle/macos/Flowdeck.app`：始终指向最新本机构建
- 桌面的 `Flowdeck.app`：指向上述应用，可直接双击运行

DMG 使用方法：双击打开，将 Flowdeck 拖入“应用程序”文件夹。当前版本使用 Tauri 官方支持的 ad-hoc 本地签名，适合个人测试使用；面向其他用户正式分发时，需要 Apple Developer ID 签名与公证。

首次构建需要安装 [Rust](https://rustup.rs/) 与对应平台的系统构建工具。macOS 需要 Xcode Command Line Tools，Windows 需要 Microsoft C++ Build Tools 和 WebView2。

启动桌面开发模式：

```bash
pnpm desktop:dev
```

生成当前平台的安装包：

```bash
pnpm desktop:build
```

只生成 macOS `.app`：

```bash
pnpm desktop:build:app
```

完成日常修改后，同步最新桌面应用：

```bash
sh scripts/sync-desktop-app.sh
```

该命令（对应包脚本 `desktop:sync`）会依次执行类型检查、前端生产构建和 `.app` 打包。桌面的 `Flowdeck.app` 固定入口指向该构建产物，因此同步成功后，退出正在运行的旧实例并重新双击桌面图标即可进入最新版。同步失败时会恢复上一个可运行的应用包。

只生成 macOS `.dmg`：

```bash
pnpm desktop:build:dmg
```

构建产物位于 `src-tauri/target/release/bundle/`。项目同时包含 `.github/workflows/build-desktop.yml`，推送 `v*` 标签或手动运行工作流即可生成 macOS 与 Windows 安装包。

当前发布版本为 `0.2.0`。Windows 构建会生成 x64 NSIS `-setup.exe` 和 MSI 安装包；个人测试版本未购买代码签名证书，因此首次安装时 Windows 可能显示 SmartScreen 提示。

桌面应用图标由 `app-icon.svg` 派生；需要重新生成时，可运行 `scripts/generate-icons.mjs`，再使用系统图标工具生成对应格式。

## 已实现

- 响应式应用框架、可折叠侧栏、移动端导航
- 全局搜索与任务 / 项目 / 笔记快速添加
- 工作台概览：今日、逾期、项目进度、最近笔记
- 任务完整 CRUD、状态、优先级、截止日期、项目关联和筛选
- 右侧任务详情抽屉与轻量新增弹窗
- 项目 CRUD、项目任务与完成进度
- Markdown 笔记 CRUD、编辑 / 预览与项目关联
- 已完成、取消和已归档内容的查看与恢复
- localStorage 持久化和首次启动演示数据
- macOS / Windows OneDrive 自动发现、旧数据迁移和本地安全备份
- 多设备独立快照、按记录更新时间合并和删除同步
- 顶部同步状态、最后写入时间与 OneDrive 重新检测
- Web App Manifest，为后续 PWA 安装能力预留入口
- Tauri 2 桌面壳、原生窗口尺寸与应用权限配置
- macOS `.app` / `.dmg` 和 Windows `.msi` / `.exe` 构建工作流
- Flowdeck 专属 macOS、Windows 和 PNG 应用图标

## 架构说明

`src/services/workspaceRepository.ts` 负责数据升级、设备快照合并和浏览器回退；`src-tauri/src/lib.rs` 负责发现 OneDrive、原子写入快照及本地备份。桌面版默认使用 OneDrive 根目录下的 `Flowdeck Sync/devices`，每台设备只写自己的快照文件。

## OneDrive 同步

两台电脑需要安装 OneDrive，并登录同一账号或能够访问同一个同步目录。首次启动新版桌面应用时，Flowdeck 会保留一份旧版 `localStorage` 数据并自动迁移。应用每 5 秒检查其他设备的快照；不同内容的修改会合并，同一条内容发生冲突时保留更新时间较新的完整记录。

如果 OneDrive 暂时不可用，Flowdeck 会写入应用数据目录中的 `Flowdeck Sync Local` 和 `workspace-backup.json`，不会阻止继续使用。OneDrive 恢复后，可点击顶部同步状态按钮并选择“重新检测 OneDrive”。

## 当前边界

- 同步依赖 OneDrive 桌面客户端，不包含独立账号系统或云端数据库
- 同一条记录的并发修改采用最后写入优先，不进行正文逐字段合并
- 不含 AI API、智能总结或语义检索
- Manifest 已预留，但暂未加入 Service Worker 和离线缓存策略
