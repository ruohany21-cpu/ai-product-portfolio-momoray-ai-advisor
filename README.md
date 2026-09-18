# MomoRay AI Advisor

A standalone portfolio demo that sends product questions to a published Coze Workflow through a server-only Next.js API Route.

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

Deploy as a Next.js application. Add `COZE_API_TOKEN` and `COZE_WORKFLOW_ID` to the hosting platform's server-side environment variables. The browser only calls `/api/advisor`; it never receives the Coze token.

Coze API reference: <https://docs.coze.cn/developer_guides_workflow_run>
