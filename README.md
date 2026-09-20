# MomoRay AI Advisor

A standalone portfolio demo that sends product questions to a published Coze Workflow directly from the browser for Cloudflare Pages static hosting.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`.

3. In Coze, create an access token with the `run` permission and confirm that Workflow `7684655278651277347` is published.

4. Add the token to `.env.local`:

   ```env
   COZE_API_TOKEN=
   COZE_WORKFLOW_ID=7684655278651277347
   COZE_BOT_ID=7686779008054607872
   ```

   Do not add a `NEXT_PUBLIC_` prefix. Do not commit `.env.local`.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Deployment

For Cloudflare Pages, use the `Next.js (Static HTML Export)` preset and set `NEXT_PUBLIC_COZE_API_TOKEN` and `NEXT_PUBLIC_COZE_WORKFLOW_ID` as environment variables. The browser calls Coze directly, so the token is necessarily exposed to visitors; use a restricted, workflow-only token.

Coze API reference: <https://docs.coze.cn/developer_guides_workflow_run>
