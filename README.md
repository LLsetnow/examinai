# Examinai｜雅思写作智能批改

[在线体验](https://ielts.akai.ink/writing) · [问题反馈](https://github.com/LLsetnow/examinai/issues)

Examinai 是一个面向 IELTS Academic Writing Task 1 与 Task 2 的 AI 作文批改工具。提交题目和作文后，系统会给出四项评分、综合评价、逐句批改、近义词和相关话题表达；界面支持中文/英文切换，且无需注册账号。

## 功能

- **Task 1 / Task 2 批改**：支持自定义题目、粘贴作文与上传 Task 1 图表。
- **四项评分与综合评价**：按任务完成度（TA/TR）、连贯与衔接（CC）、词汇资源（LR）、语法多样性与准确性（GRA）生成分项及总分参考。
- **可交互的批改报告**：
  - 原句批改以红、黄、绿标记严重/语法错误、表达优化建议和亮点句；
  - 切换到“近义词”或“相关话题”时，会在原文中高亮对应词汇；
  - 报告可导出为 PDF 或 JSON。
- **剑雅真题题库**：可选择 Cambridge IELTS Academic 10–21、共 96 道写作题；Task 1 同时提供本地图表文件。
- **真实图表事实优先**：内置剑雅 C10–C21 Task 1 的人工核对图表事实。选择已匹配的真题时，评分会直接使用本地事实并跳过识图，避免 OCR/视觉识别导致的 TA 误判；自定义或缺少本地事实的题目才会调用视觉模型。
- **本地历史与导出目录**：历史页会读取 Chromium 系浏览器已授权本地文件夹中的 JSON 报告。完成批改后，报告会自动保存至该目录；也可手动导出 PDF 或 JSON。不支持该能力的浏览器会改为下载 JSON 文件。
- **浏览器内设置持久化**：语言、评分 API、识图 API、模型和已选导出文件夹名称会在浏览器本地保存，重新打开页面无需重新配置。

## 模型与数据流

| 用途 | 默认服务 | 说明 |
| --- | --- | --- |
| 作文评分、批改、近义词、话题表达 | DeepSeek（OpenAI 兼容） | 生成全部文本类反馈 |
| Task 1 图表理解 | 智谱 AI GLM | 仅在上传图表且没有可用本地图表事实时使用 |
| 剑雅 Task 1 真题 | 本地人工核对数据 | 优先作为评分依据，不调用识图 |

右上角“API 设置”可分别配置评分与识图服务的 OpenAI 兼容 API 地址、密钥和模型，并可获取模型列表。配置仅保存在**当前浏览器的 localStorage** 中，并会在发起评分请求时传给本应用；不会写入历史报告或服务器配置。

> 请勿在公共电脑保存长期有效的 API 密钥。清除该站点的浏览器数据后，需要重新填写浏览器内配置。所选文件夹的实际浏览器授权句柄受 Web API 限制，保存在 IndexedDB 中；文件夹名称保存在 localStorage 中。

## 本地开发

### 环境要求

- Node.js 20 或更高版本
- pnpm（推荐通过 Corepack 启用）
- DeepSeek API Key
- 智谱 AI API Key（若需要识别自定义 Task 1 图表）

### 安装与启动

```bash
git clone https://github.com/LLsetnow/examinai.git
cd examinai
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

浏览器打开 [http://localhost:3000/writing](http://localhost:3000/writing)。

`.env` 用作服务端的默认配置：

```env
# DeepSeek：评分、批改、近义词和话题词汇
DEEPSEEK_API_KEY=your_deepseek_api_key

# 智谱 AI：Task 1 自定义图表识别
ZHIPUAI_API_KEY=your_zhipuai_api_key

# 可选：覆盖默认模型
DEEPSEEK_MODEL=deepseek-v4-pro
ZHIPUAI_VISION_MODEL=glm-4.6v
```

如已在网页“API 设置”中填写相应服务的地址、密钥和模型，浏览器配置会优先于上述默认值。自定义 API 地址必须是可公开访问的 HTTPS 地址。

### 导入剑雅题库

剑雅题库文件不会提交到 Git。首次本地运行、或需要刷新题库时执行：

```bash
node tools/import-cambridge-questions.mjs
```

该脚本会生成 `data/cambridge-questions/index.json` 并下载 C10–C21 的题目和 Task 1 图表到本地。请确保你对所使用的真题资料拥有合法使用权。

## 常用命令

```bash
pnpm dev       # 开发服务器
pnpm run lint  # ESLint 检查
pnpm run build # 生产构建
pnpm start     # 启动已构建的生产服务
```

## API 路由

| 路由 | 说明 |
| --- | --- |
| `POST /api/writing/assess` | 流式生成评分与批改报告 |
| `GET /api/writing/questions` | 读取剑雅题库，或按书册/测试/任务读取单题 |
| `GET/DELETE /api/writing/history` | 兼容旧版服务端本地评分历史 |
| `POST /api/writing/models` | 读取 OpenAI 兼容服务的可用模型列表 |

## 部署

推送 `main` 分支会触发 GitHub Actions：在 Linux 环境构建 Next.js 产物，将源码和构建产物上传到服务器的 `/var/examinai`，再重启 `examinai` 服务。Nginx 将 `https://ielts.akai.ink` 反向代理到应用。

部署工作流依赖以下 GitHub Secrets：

```text
DEPLOY_HOST
DEPLOY_KNOWN_HOSTS
DEPLOY_SSH_KEY
```

服务器还需在 `/var/examinai/.env` 配置默认模型密钥，并使用 `deploy/release.sh` 完成发布。

## 技术栈

- Next.js 16、React 19、TypeScript
- Tailwind CSS 与 Base UI
- Vercel AI SDK + OpenAI 兼容接口
- DeepSeek 与智谱 AI GLM
- 本地 JSON 文件与浏览器 File System Access API

## 隐私说明

本项目没有用户系统或云数据库。作文内容会发送给你选择的模型服务以生成反馈；历史页仅访问当前浏览器明确授权的本地文件夹，浏览器设置仅保存在当前设备中。服务端仍会保留兼容旧版的本地历史快照。请根据自己的隐私要求部署和使用。
