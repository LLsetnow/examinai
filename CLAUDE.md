# CLAUDE.md｜Examinai 项目上下文

本仓库是 Examinai：一个无需用户系统的 IELTS Academic Writing Task 1 / Task 2 AI 批改应用。线上入口为 `https://ielts.akai.ink/writing`，代码托管在 `LLsetnow/examinai`。

更完整的代理执行规则、数据约束和发布安全要求见 [AGENTS.md](AGENTS.md)。本文件提供快速上手、架构和部署上下文。

## 快速开始

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

本地地址：`http://localhost:3000/writing`

质量检查：

```bash
pnpm run lint
pnpm run build
```

项目使用 pnpm 11、Next.js 16（App Router）、React 19、TypeScript、Tailwind CSS 4、Base UI、Vercel AI SDK 和 Zod。图标使用 Lucide，部分动效来自 Lottie。

## 开发工作流（分支与 PR）

每次开发任务都在独立的 git worktree 中进行，基于最新 `main` branch out 新分支，改动拆成若干条聚焦的 PR 合并回 `main`；不要直接在 `main` 上提交或改写 `main` 历史。

1. 基于最新 `main` 新建 worktree 与分支（分支名用 Conventional 前缀，如 `feat/…`、`fix/…`、`docs/…`）：
   ```bash
   git fetch origin
   git worktree add ../examinai-<主题> -b <类型>/<主题> origin/main
   ```
2. 在该 worktree 内完成改动，按主题拆成单一、可独立评审的 PR，逐条合并到 `main`，避免一条大而杂的 PR。
3. 每条 PR 前运行与改动相称的检查：`pnpm run lint`、`pnpm run build`、`git diff --check`。
4. 合并后清理：`git worktree remove ../examinai-<主题>` 并删除已合并分支。
5. 改动 `CLAUDE.md` 或 `AGENTS.md` 时必须同步另一个文件，保持两者内容一致。

## 核心产品行为

1. 用户输入自定义题目或从剑雅 C10–C21 选择题目，填写作文；Task 1 可以带图表图片。
2. `/api/writing/assess` 根据 `questionSource` 在服务端匹配本地剑雅题目。
3. 如 Task 1 存在人工核对的 `data/cambridge-chart-facts/index.json`，直接将该事实作为评分证据，跳过视觉识图。
4. 自定义图表或没有本地事实时，才由智谱视觉模型提取图表信息；DeepSeek（或用户配置的 OpenAI 兼容服务）负责评分、批改与语言建议。
5. 评分结果通过 SSE 分区返回，页面逐步展示综合评价、评分、语言分析和提升建议。
6. 评分完成后会将 JSON 报告自动写入用户选定的本地目录；历史页通过 File System Access API 读取、打开和删除该目录中的报告。报告页仍支持 PDF/JSON 手动导出，未授权或不支持时退回浏览器下载。

## 重要目录

```text
app/writing/client.tsx              页面状态、题目选择、历史记录
app/api/writing/assess/route.ts     SSE 评分编排和错误隔离
components/writing/                 报告、原文高亮、导出
components/api-settings-dialog.tsx  API 设置与本地目录选择
lib/ai/models.ts                    模型/URL 校验
lib/ai/prompts.ts                   AI 提示词
lib/question-bank/                  剑雅题目和图表事实读取
lib/browser/                        localStorage、IndexedDB、文件夹历史读取/导出
lib/storage/assessment-history.ts   兼容旧版的服务端 JSON 历史快照
data/cambridge-chart-facts/         可提交的人工核对事实
data/cambridge-questions/           忽略的真题题库和图片
deploy/                              Nginx、systemd、发布脚本模板
```

## 配置与隐私

默认服务端密钥放在 `.env`：

```env
DEEPSEEK_API_KEY=...
ZHIPUAI_API_KEY=...
DEEPSEEK_MODEL=deepseek-v4-pro
ZHIPUAI_VISION_MODEL=glm-4.6v
```

用户可在网页右上角的“API 设置”中分别覆盖评分和识图服务的 API URL、密钥与模型。覆盖项保存在浏览器 `localStorage`，从不写入历史 JSON、服务器数据库或 Git。已选择的本地历史目录由 IndexedDB 保存句柄，历史页从中读取 JSON 报告；目录句柄不能塞入 localStorage。

不要读取、打印、提交或在文档中包含 `.env`、部署密钥、GitHub Secrets、真实服务器地址或任何用户作文内容。

## 剑雅数据的特殊规则

- C10–C21 共 96 道题；`tools/import-cambridge-questions.mjs` 从外部来源生成本地题目索引和 48 张 Task 1 图表。
- `data/cambridge-questions/` 与 `data/assessment-history/` 在 `.gitignore` 中；全新 clone 需要自行导入合法持有的题目资料。
- 图表事实属于评分依据。改动前必须人工比对原图，不能由模型 OCR 结果直接回写。
- 不能让模型把不清晰或缺失的数据伪装成准确数值。

## CI/CD 和线上架构

向 `main` 推送**且改动了应用源码或构建相关文件**时才会执行 `.github/workflows/deploy.yml`（触发路径：`app/`、`components/`、`lib/`、`public/`、`data/cambridge-chart-facts/` 及 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`next.config.*`、`postcss.config.mjs`、`tsconfig.json`）。纯文档改动不会触发部署；需要强制发布时用手动 `workflow_dispatch`。工作流步骤：

1. GitHub Actions 在 Ubuntu + Node 22 环境运行 `pnpm install --frozen-lockfile` 与 `pnpm run build`。
2. 工作流打包 `.next` 与 `git archive HEAD` 的源码，并通过 SSH 上传。
3. 服务器 `/var/examinai/deploy/release.sh` 解包源码、执行 `pnpm install --frozen-lockfile`、替换 `.next`、重启 systemd 服务 `examinai`。
4. `examinai` 以 Node/Next 在 `0.0.0.0:3004` 运行；Nginx 代理并在 `https://ielts.akai.ink` 提供 HTTPS。

部署依赖 GitHub Secrets：`DEPLOY_HOST`、`DEPLOY_KNOWN_HOSTS`、`DEPLOY_SSH_KEY`。生产 `.env` 位于 `/var/examinai/.env`，不在 Actions 构建产物或 Git 中。

生产机资源受限，因此严禁把 `next build` 移到服务器；只上传 CI 中生成的 Linux 构建产物。由于源码使用 `git archive`，被 Git 忽略的题库文件不会随发布上传；服务器已有数据不会被该解包流程删除。

## 修改时的检查清单

- 修改 UI：确保中英文文案、移动端、独立滚动栏及红黄绿高亮语义仍正确。
- 修改评分：保持 JSON schema、服务端输入校验、SSE 分区和局部失败降级。
- 修改图表：先确认是否应走本地事实，而不是无条件调用视觉模型。
- 修改设置：确认刷新页面后浏览器设置仍能恢复，且密钥不会进入服务端历史。
- 修改部署：同时核对 workflow、`deploy/release.sh`、`deploy/examinai.service` 和 Nginx 模板，避免在生产服务器构建。
- 提交前：运行 `pnpm run lint`、`pnpm run build`、`git diff --check`。
