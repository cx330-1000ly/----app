# 记账APP

一款运行在 Windows 和 macOS 电脑上的个人记账软件。记录每一笔收入和支出（人民币），支持二级分类，帮你清楚掌握「钱花在了哪里」。

- 🖥 离线本地运行，无账号、无服务器，数据只存在你自己的电脑里
- 💰 金额精确到分，支出红色、收入绿色，一目了然
- 🗂 内置 9 大支出分类 + 5 大收入分类（共 50+ 二级小类），可在软件内自由增删改

## 功能特性

| 功能 | 说明 |
|---|---|
| 📝 记一笔 | 记录类型（支出/收入）、金额、日期、一级/二级分类、备注（选填） |
| 🗂 分类管理 | 二级分类体系，内置常用分类，可自行新增、改名、删除 |
| 📋 明细列表 | 按时间倒序展示所有记录；支持按备注/金额/分类搜索；支持按月份、类型、分类筛选 |
| ✏️ 编辑 / 删除 | 任何一条记录都可以随时修改或删除 |
| 📊 按月统计 | 本月总收入、总支出、结余；分类占比图表；近几个月支出趋势 |
| 🔒 数据安全 | 本地 SQLite 数据库，每次操作立即写盘；软件内一键导出备份文件 |

## 技术栈

- [Electron](https://www.electronjs.org/) — 跨平台桌面应用框架
- [Vue 3](https://cn.vuejs.org/) — 界面框架
- [TypeScript](https://www.typescriptlang.org/) — 代码语言
- [electron-vite](https://electron-vite.org/) — 构建工具
- [sql.js](https://sql.js.org/) — 纯 JS 实现的 SQLite，本地数据存储
- [ECharts](https://echarts.apache.org/) — 统计图表

## 快速开始

### 环境要求

- Node.js 18+（本项目在 Node.js 24 上开发验证）

### 安装依赖

```bash
npm install
```

> 国内网络环境已配置 [.npmrc](.npmrc) 镜像源，Electron 本体及打包工具会自动从 npmmirror 下载。

### 开发模式运行

```bash
npm run dev
```

### 打包安装包

```bash
# Windows
npm run build:win

# macOS（需在 Mac 电脑上打包）
npm run build:mac

# Linux
npm run build:linux
```

打包产物输出在 `dist/` 目录。

## 数据存储与备份

所有账目数据保存在本机 SQLite 数据库文件中：

| 平台 | 数据位置 |
|---|---|
| Windows | `%APPDATA%\heima-jizhang\heima-jizhang.db` |
| macOS | `~/Library/Application Support/heima-jizhang/heima-jizhang.db` |

**备份**：软件「设置」页提供「打开数据文件夹」和「导出备份」按钮。备份 = 复制 `.db` 文件。

**恢复**：把备份文件放回上方文件夹，改名为 `heima-jizhang.db`（覆盖原文件）后重启软件即可。

## 项目结构

```
.
├── src/
│   ├── main/            # Electron 主进程
│   │   ├── db.ts        # 数据库：建表、账目增删改查、统计、备份
│   │   └── index.ts     # 窗口创建与界面接口注册
│   ├── preload/         # 主进程与界面之间的安全桥接层
│   ├── renderer/        # Vue 3 界面
│   │   └── src/
│   │       ├── views/   # 四个页面：记一笔 / 明细 / 统计 / 设置
│   │       └── components/
│   └── shared/          # 主进程与界面共用的类型定义
├── resources/           # 应用图标
├── electron-builder.yml # 打包配置
└── package.json
```

## 路线图

以下为候选功能（未排期）：

- [ ] 预算管理
- [ ] Excel 导出
- [ ] 深色模式
- [ ] 云同步

## 许可证

仅供个人学习与使用。
