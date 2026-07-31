# Examinai 开发代理指南

本文件面向在本仓库中修改代码、文档、数据或部署配置的编码代理。开始工作前先阅读 `README.md`；当本文件与临时任务要求冲突时，以用户的明确要求为准。

## 项目目标与边界

Examinai 是一个无需账号的 IELTS Academic Writing Task 1 / Task 2 智能批改站点，生产地址为 `https://ielts.akai.ink/writing`。

- 评分维度：TA/TR、CC、LR、GRA 及综合反馈。
- 反馈包含原句批改、近义词、相关话题表达和 PDF/JSON 报告导出。
- 评分 API 使用 DeepSeek 等 OpenAI 兼容接口；自定义 Task 1 图表仅在没有本地事实时使用智谱视觉模型。
- 剑雅 C10–C21 Task 1 优先使用 `data/cambridge-chart-facts/index.json` 中人工核对的图表事实。不要让视觉识别覆盖已验证的本地事实。
- 不引入用户账号、云数据库、Supabase、Drizzle 或云端用户资料。

## 常用命令

```bash
corepack enable
pnpm install
pnpm dev          # 本地开发，http://localhost:3000/writing
pnpm run lint     # ESLint
pnpm run build    # TypeScript + Next.js 生产构建
pnpm start        # 运行已构建的应用
```

提交前至少运行与改动相称的检查；涉及 TypeScript、API、布局或构建配置时，必须运行：

```bash
pnpm run lint
pnpm run build
```

目前没有独立测试命令。不要把 `next build` 的成功误写成已执行端到端或模型质量测试。

## 代码结构

| 路径 | 作用 |
| --- | --- |
| `app/writing/client.tsx` | 写作输入、题目选择、报告页和历史页的客户端状态 |
| `app/api/writing/assess/route.ts` | 流式评分主流程、题目事实解析和模型调用编排 |
| `app/api/writing/questions/route.ts` | 剑雅题库与图表事实查询 |
| `app/api/writing/history/route.ts` | 兼容旧版服务端评分历史的 API |
| `app/api/writing/models/route.ts` | OpenAI 兼容模型列表代理 |
| `components/writing/` | 评分报告、批改视图与 PDF/JSON 导出 |
| `components/api-settings-dialog.tsx` | 居中 API 设置弹窗与本地导出目录选择 |
| `lib/ai/models.ts` | DeepSeek / 智谱模型和外部 API URL 安全校验 |
| `lib/ai/prompts.ts` | 评分、批改、近义词和话题表达提示词 |
| `lib/question-bank/` | 剑雅题目和人工核对图表事实的服务端读取逻辑 |
| `lib/browser/` | 浏览器 localStorage、IndexedDB 和 File System Access API 封装 |
| `lib/storage/assessment-history.ts` | 兼容旧版的服务端本地 JSON 历史快照 |
| `data/cambridge-chart-facts/index.json` | 已追踪的 Task 1 图表事实；评分证据源 |
| `tools/import-cambridge-questions.mjs` | 导入 C10–C21 题目与 Task 1 图片的本地脚本 |
| `deploy/` | systemd、Nginx 和服务器发布脚本模板 |
| `.github/workflows/deploy.yml` | GitHub Actions 构建与生产发布流程 |

## 开发规则

### 前端与交互

- 保持当前红色 Examinai 品牌、中文优先/中英文切换和响应式布局。
- 批改标签的高亮语义不可改变：红色=严重或语法错误，黄色=表达优化/建议，绿色=亮点。
- “原句批改”“近义词”“相关话题”切换时，只高亮对应类型的原文内容。
- 报告右侧内容区须独立可滚动；不要把长报告改成依赖整页滚动。
- API 设置必须保留在页面右上角，通过居中模态弹窗打开。

### 数据与评分

- 不要伪造图表数值、趋势或剑雅来源。修改 `chart-facts` 前必须以对应图表为依据人工核对。
- 已知剑雅 Task 1 的 `questionSource` 与题目文本都要服务端校验；不要仅信任客户端元数据。
- 自定义图表或缺少事实的数据可走视觉回退；视觉模型输出只能作为评分上下文，不能声称为已验证数据。
- 模型输出必须继续遵守现有 JSON 校验、解析和失败分区逻辑。即使一个评分分区失败，其他可用分区仍应返回给用户。

### 设置、历史与隐私

- 评分/视觉服务地址、密钥和模型配置必须只保存在当前浏览器的 `localStorage`；使用 `lib/browser/provider-settings.ts`，不要把密钥写入历史、日志、提交或服务器数据库。
- 历史页的主数据源是用户已授权目录中的 JSON 文件。完成评分后会自动写入该目录；读取、打开和删除都必须经由 `lib/browser/local-history-directory.ts` 的 File System Access API，不能改回服务端 API。
- 本地目录名称保存在 `localStorage`，实际 `FileSystemDirectoryHandle` 必须保存在 IndexedDB；浏览器无法把目录句柄安全序列化到 localStorage。
- `data/assessment-history/` 是被 Git 忽略的服务端兼容快照，不是历史页的主数据源。
- 禁止输出、提交或复述 `.env`、GitHub Secrets、SSH 私钥、服务器 IP、访问令牌或用户作文内容。

### 题库文件

- `data/cambridge-questions/` 和 `data/assessment-history/` 被 Git 忽略。不要假设全新 clone 已含题目图片；需要时运行导入脚本。
- 生产发布使用 `git archive HEAD`，不会上传 Git 忽略的数据。服务器现有的忽略数据会在解包时保留，但首次新环境必须单独导入/提供合法题库资料。
- 不要为了“方便部署”把未获许可的剑雅题目、图片或用户历史强行加入 Git。

## 构建与变更检查

1. 先检查 `git status --short`，不要覆盖用户已有的改动。
2. 小范围阅读相关 API、类型、翻译和 UI；不要只修改展示文本而破坏中英文类型约束。
3. 修改提示词、评分架构或图表事实后，至少用一个已知剑雅 Task 1 和一个自定义题目验证预期分支。
4. 运行 `pnpm run lint` 与 `pnpm run build`。
5. 提交前运行 `git diff --check`，并说明未能执行的验证与原因。

## CI/CD 与生产环境

### 发布链路

```text
push main（改动应用源码或构建相关文件时）
  → GitHub Actions（Ubuntu / Node 22）
  → pnpm install --frozen-lockfile + pnpm run build
  → 打包 .next-release.tgz 与 git archive 源码
  → SSH/SCP 上传至生产服务器 /var/examinai
  → deploy/release.sh 解包、pnpm install、替换 .next
  → systemctl restart examinai
  → Nginx 反向代理到 https://ielts.akai.ink
```

- 工作流：`.github/workflows/deploy.yml`；仅在向 `main` 推送**且改动应用源码或构建相关文件**（`app/`、`components/`、`lib/`、`public/`、`data/cambridge-chart-facts/`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`next.config.*`、`postcss.config.mjs`、`tsconfig.json`）时自动发布；纯文档改动不触发，手动 `workflow_dispatch` 可强制发布。
- 构建必须在 GitHub Actions 的 Linux Runner 上完成。**不要**在生产服务器执行 `next build`：服务器资源有限，构建会影响在线服务。
- 工作流需要 `DEPLOY_HOST`、`DEPLOY_KNOWN_HOSTS`、`DEPLOY_SSH_KEY` 三个 GitHub Secrets；它们只可在 GitHub 配置页面维护。
- 生产应用目录：`/var/examinai`；服务名：`examinai`；内部端口：`127.0.0.1:3004`。
- systemd 从 `/var/examinai/.env` 加载默认服务端密钥；Nginx 在 TLS 终止后代理访问。配置模板在 `deploy/`，不包含真实证书或凭证。
- 发布用户只能通过受限 sudo 权限重启 `examinai` 服务。不要扩大 sudo 规则或把 SSH 凭证放进仓库。

### 生产排障（仅在得到明确授权后）

```bash
sudo systemctl status examinai
sudo journalctl -u examinai -n 200 --no-pager
curl -I https://ielts.akai.ink/writing
```

优先检查 GitHub Actions 日志、服务状态、环境变量是否存在、Nginx 反向代理和 HTTPS 证书状态。不要在日志或工单中复制密钥。

## 提交与交付

- 使用清晰的 Conventional Commit 风格，例如 `feat: …`、`fix: …`、`docs: …`。
- 对影响线上站点的改动，说明已运行的检查、GitHub Actions 部署结果和可访问地址。
- 不要使用强制推送、`git reset --hard`、递归删除或覆盖生产配置；如确有必要，先说明精确影响并取得授权。
