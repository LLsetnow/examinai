# Examinai

Anonymous IELTS Writing assessment for Task 1 and Task 2.

Paste a question and essay, optionally add a Task 1 chart, and receive a band-score report with colour-coded corrections, contextual synonym suggestions, and topic-language guidance.

## Privacy and scope

- No account, login, user profile, or history
- No database, Supabase, Drizzle, or cloud essay storage
- Each completed assessment is saved locally as JSON in `data/assessment-history/` (Git ignored)

## Setup

Create `.env` (or `.env.local`):

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
ZHIPUAI_API_KEY=your_zhipuai_api_key
```

DeepSeek produces all writing feedback. Zhipu GLM reads a Task 1 chart only when an image is attached.

Then run:

```bash
pnpm install
pnpm dev
```

## Local Cambridge question bank

The selector supports Cambridge IELTS Academic 10–21 after importing the local question bank:

```bash
node tools/import-cambridge-questions.mjs
```

This writes the prompts and Task 1 images to `data/cambridge-questions/`, which is ignored by Git. The import records its source URL in the generated index file.
