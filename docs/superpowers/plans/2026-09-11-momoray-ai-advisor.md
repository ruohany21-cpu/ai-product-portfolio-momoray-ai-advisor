# MomoRay AI Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, responsive Next.js chat demo that sends user questions through a server-only route to the published MomoRay Coze Workflow and renders its real `output`.

**Architecture:** A Next.js App Router page owns the chat experience, while `POST /api/advisor` is the only browser-to-server boundary. The route validates input and delegates to a focused Coze client that reads server-only environment variables, calls the official non-streaming endpoint, normalizes `data.output`, and exposes no upstream secrets or diagnostics to the browser.

**Tech Stack:** Node.js 24, npm, Next.js App Router (current stable installed and pinned by `package-lock.json`), React, TypeScript, CSS Modules/global CSS, Vitest, React Testing Library, jsdom.

**Spec:** `docs/superpowers/specs/2026-09-11-momoray-ai-advisor-design.md`

## Global Constraints

- The deliverable is one standalone webpage linked from Notion; do not rebuild or edit the Notion portfolio.
- Use `POST https://api.coze.cn/v1/workflow/run` with `workflow_id` and `parameters: { input }` only.
- Read `COZE_API_TOKEN` and `COZE_WORKFLOW_ID` only on the server; never use a `NEXT_PUBLIC_` variable.
- Trim input, reject empty input, and reject input longer than 2,000 characters.
- Abort the upstream request after 60 seconds.
- Use the exact loading copy `Running workflow...` and failure copy `Workflow request failed. Please try again.`
- Keep the first version non-streaming and stateless: no login, database, attachments, voice, or conversation persistence.
- Use white/light-gray surfaces, purple accents, thin borders, and restrained shadows; no glassmorphism, gradients, e-commerce support styling, or cartoon avatar.

---

### Task 1: Scaffold the Tested Next.js Page Shell

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `app/layout.tsx`
- Create: `app/page.test.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`

**Interfaces:**
- Consumes: no application interfaces.
- Produces: the `/` App Router page and a working `npm test` command for Tasks 2–7.

- [ ] **Step 1: Create package and test configuration**

Create `package.json` with scripts `dev`, `build`, `start`, `lint`, `typecheck`, and `test`. Install current stable packages and let npm pin exact resolved versions in `package-lock.json`:

```powershell
npm install next@latest react@latest react-dom@latest
npm install --save-dev typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest eslint@latest eslint-config-next@latest vitest@latest jsdom@latest @vitejs/plugin-react@latest @testing-library/react@latest @testing-library/jest-dom@latest @testing-library/user-event@latest
npm pkg set scripts.dev="next dev" scripts.build="next build" scripts.start="next start" scripts.lint="eslint ." scripts.typecheck="tsc --noEmit" scripts.test="vitest run"
```

Use this Vitest contract in `vitest.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"] },
});
```

- [ ] **Step 2: Write the failing page-shell test**

Create `app/page.test.tsx` before `app/page.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import Home from "./page";

test("presents the MomoRay advisor as a live workflow demo", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "MomoRay AI Advisor" })).toBeInTheDocument();
  expect(screen.getByText("Agent Workflow Demo")).toBeInTheDocument();
  expect(screen.getByText("LIVE")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test -- app/page.test.tsx`

Expected: FAIL because `./page` does not exist.

- [ ] **Step 4: Implement the minimal page shell**

Create `app/page.tsx` with a semantic main region and the three tested labels. Create `app/layout.tsx` with metadata title `MomoRay AI Advisor` and import `app/globals.css`.


```tsx
export default function Home() {
  return (
    <main>
      <h1>MomoRay AI Advisor</h1>
      <p>Agent Workflow Demo</p>
      <span>LIVE</span>
    </main>
  );
}
```

- [ ] **Step 5: Run the test and verify GREEN**

Run: `npm test -- app/page.test.tsx`

Expected: PASS with no warnings.

- [ ] **Step 6: Commit the independently working shell**

Initialize Git if this directory is still not a repository, then commit:

```powershell
git init
git add package.json package-lock.json tsconfig.json next-env.d.ts next.config.ts eslint.config.mjs vitest.config.ts vitest.setup.ts app .gitignore
git commit -m "chore: scaffold MomoRay advisor app"
```

### Task 2: Implement the Coze Workflow Client

**Files:**
- Create: `lib/coze.test.ts`
- Create: `lib/coze.ts`

**Interfaces:**
- Consumes: global server `fetch`, `COZE_API_TOKEN`, and `COZE_WORKFLOW_ID`.
- Produces: `runCozeWorkflow(input: string, options?: CozeClientOptions): Promise<string>`, `CozeConfigurationError`, and `CozeWorkflowError`.

- [ ] **Step 1: Write failing tests for the upstream contract**

Create table-focused tests using a local `fetchImpl` fake. Cover the exact request, output parsing, missing configuration, non-zero Coze code, malformed `data`, missing `output`, and non-2xx HTTP response.

```ts
import { describe, expect, test, vi } from "vitest";
import { runCozeWorkflow } from "./coze";

describe("runCozeWorkflow", () => {
  test("posts the documented payload and returns data.output", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      msg: "Success",
      data: JSON.stringify({ output: "可以，通过增减模块调节高度。" }),
    }), { status: 200 }));

    const output = await runCozeWorkflow("可以调高度吗？", {
      token: "server-token",
      workflowId: "7679774858637492267",
      fetchImpl,
    });

    expect(output).toBe("可以，通过增减模块调节高度。");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.coze.cn/v1/workflow/run");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer server-token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      workflow_id: "7679774858637492267",
      parameters: { input: "可以调高度吗？" },
    });
  });
});
```

Add the following table test so each invalid upstream branch must reject with the normalized error:

```ts
test.each([
  ["HTTP failure", new Response("upstream unavailable", { status: 503 })],
  ["business failure", new Response(JSON.stringify({ code: 4000, msg: "bad request", data: "" }), { status: 200 })],
  ["invalid data JSON", new Response(JSON.stringify({ code: 0, data: "not-json" }), { status: 200 })],
  ["missing output", new Response(JSON.stringify({ code: 0, data: JSON.stringify({}) }), { status: 200 })],
])("normalizes %s", async (_name, response) => {
  const fetchImpl = vi.fn(async () => response);
  await expect(runCozeWorkflow("question", {
    token: "server-token",
    workflowId: "7679774858637492267",
    fetchImpl,
  })).rejects.toThrow("Workflow request failed");
});

test("rejects missing server configuration separately", async () => {
  await expect(runCozeWorkflow("question", { token: "", workflowId: "" }))
    .rejects.toThrow("Coze server configuration is missing");
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/coze.test.ts`

Expected: FAIL because `lib/coze.ts` does not exist.

- [ ] **Step 3: Implement the minimal server client**

Use the exact interface below. Default options read `process.env`, while tests inject the external boundary. Use `AbortSignal.timeout(60_000)` for the production request.

```ts
export type CozeClientOptions = {
  token?: string;
  workflowId?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

export class CozeWorkflowError extends Error {
  constructor() {
    super("Workflow request failed");
    this.name = "CozeWorkflowError";
  }
}

export class CozeConfigurationError extends Error {
  constructor() {
    super("Coze server configuration is missing");
    this.name = "CozeConfigurationError";
  }
}

export async function runCozeWorkflow(
  input: string,
  options: CozeClientOptions = {},
): Promise<string> {
  const token = options.token ?? process.env.COZE_API_TOKEN;
  const workflowId = options.workflowId ?? process.env.COZE_WORKFLOW_ID;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!token || !workflowId) throw new CozeConfigurationError();

  try {
    const response = await fetchImpl("https://api.coze.cn/v1/workflow/run", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workflow_id: workflowId, parameters: { input } }),
      signal: options.signal ?? AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new CozeWorkflowError();
    const payload: unknown = await response.json();
    if (!isSuccessfulCozePayload(payload)) throw new CozeWorkflowError();
    const data: unknown = JSON.parse(payload.data);
    if (!hasOutput(data)) throw new CozeWorkflowError();
    return data.output;
  } catch {
    throw new CozeWorkflowError();
  }
}
```

Add narrow type guards that require `code === 0`, string `data`, and a non-empty string `output`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- lib/coze.test.ts`

Expected: all Coze client tests PASS.

- [ ] **Step 5: Commit the server client**

```powershell
git add lib/coze.ts lib/coze.test.ts
git commit -m "feat: add secure Coze workflow client"
```

### Task 3: Add the Server-Side Advisor API Route

**Files:**
- Create: `app/api/advisor/route.test.ts`
- Create: `app/api/advisor/route.ts`

**Interfaces:**
- Consumes: `runCozeWorkflow(input): Promise<string>` from Task 2.
- Produces: `POST(request: Request): Promise<Response>` returning `{ output: string }` on success or `{ error: "Workflow request failed. Please try again." }` on failure.

- [ ] **Step 1: Write failing route tests**

Invoke the route handler with real `Request` objects and mock only global `fetch`, the external Coze boundary. Cover trimmed input, empty/non-string input, more than 2,000 characters, success, and upstream failure.

```ts
test("returns the normalized workflow output", async () => {
  vi.stubEnv("COZE_API_TOKEN", "server-token");
  vi.stubEnv("COZE_WORKFLOW_ID", "7679774858637492267");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    code: 0,
    data: JSON.stringify({ output: "建议先从中等高度开始。" }),
  }), { status: 200 })));

  const response = await POST(new Request("http://localhost/api/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "  推荐一个配置  " }),
  }));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ output: "建议先从中等高度开始。" });
});
```

Use `afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); })` to isolate cases.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- app/api/advisor/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement input validation and route normalization**

```ts
import { NextResponse } from "next/server";
import { CozeConfigurationError, runCozeWorkflow } from "@/lib/coze";

const FAILURE_MESSAGE = "Workflow request failed. Please try again.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: FAILURE_MESSAGE }, { status: 400 });
  }

  const input = readInput(body);
  if (!input) {
    return NextResponse.json({ error: FAILURE_MESSAGE }, { status: 400 });
  }

  try {
    const output = await runCozeWorkflow(input);
    return NextResponse.json({ output });
  } catch (error) {
    if (error instanceof CozeConfigurationError) {
      return NextResponse.json({ error: FAILURE_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: FAILURE_MESSAGE }, { status: 502 });
  }
}

function readInput(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("input" in body)) return null;
  if (typeof body.input !== "string") return null;
  const input = body.input.trim();
  return input.length > 0 && input.length <= 2_000 ? input : null;
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- app/api/advisor/route.test.ts`

Expected: all route tests PASS and no response contains the Token.

- [ ] **Step 5: Commit the API boundary**

```powershell
git add app/api/advisor/route.ts app/api/advisor/route.test.ts
git commit -m "feat: proxy advisor requests through server route"
```

### Task 4: Build the Chat Interaction with Tests

**Files:**
- Create: `components/chat-experience.test.tsx`
- Create: `components/chat-experience.tsx`
- Create: `components/message-composer.tsx`
- Create: `components/message-list.tsx`
- Create: `components/prompt-suggestions.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: browser `fetch("/api/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) })`.
- Produces: `ChatExperience` with suggestion click, typed submission, loading, success, failure, and reset behavior.

- [ ] **Step 1: Write failing interaction tests**

Test the observable user flow, not internal state. Use a controllable promise for loading and a `fetch` fake only at the HTTP boundary.

```tsx
test("clicking a suggestion sends it and renders the real response", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({ output: "可以通过模块组合调节高度。" }),
    { status: 200 },
  )));
  const user = userEvent.setup();
  render(<ChatExperience />);

  await user.click(screen.getByRole("button", { name: "这个枕头可以调高度吗？" }));

  expect(await screen.findByText("可以通过模块组合调节高度。")).toBeInTheDocument();
  expect(screen.getByText("这个枕头可以调高度吗？")).toBeInTheDocument();
});
```

Add separate cases for:

- typing a question and pressing Enter;
- showing `Running workflow...` while the request is pending;
- preventing an empty or second pending submission;
- showing `Workflow request failed. Please try again.` after a rejected or non-2xx request;
- clearing messages when `New conversation` is clicked;
- rendering all four exact suggested prompts in the initial state.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- components/chat-experience.test.tsx`

Expected: FAIL because `ChatExperience` does not exist.

- [ ] **Step 3: Implement the minimal chat state machine**

Use one message union and one submission path for both composer and suggestion buttons:

```ts
type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; status: "loading"; text: "Running workflow..." }
  | { id: string; role: "assistant"; status: "complete" | "error"; text: string };
```

`send(input)` must trim and guard the value, append the user and loading messages in one state update, call `/api/advisor`, and replace only the matching loading message with success or error text. `reset()` clears messages, input, and pending state. Generate stable per-message IDs with `crypto.randomUUID()`.

Implement the shared submission path with this control flow:

```tsx
const send = async (rawInput: string) => {
  const input = rawInput.trim();
  if (!input || input.length > 2_000 || pending) return;

  const userId = crypto.randomUUID();
  const assistantId = crypto.randomUUID();
  setPending(true);
  setDraft("");
  setMessages((current) => [
    ...current,
    { id: userId, role: "user", text: input },
    { id: assistantId, role: "assistant", status: "loading", text: "Running workflow..." },
  ]);

  try {
    const response = await fetch("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const payload: unknown = await response.json();
    if (!response.ok || !payload || typeof payload !== "object" ||
        !("output" in payload) || typeof payload.output !== "string") {
      throw new Error("invalid advisor response");
    }
    setMessages((current) => current.map((message) =>
      message.id === assistantId
        ? { id: assistantId, role: "assistant", status: "complete", text: payload.output }
        : message,
    ));
  } catch {
    setMessages((current) => current.map((message) =>
      message.id === assistantId
        ? { id: assistantId, role: "assistant", status: "error", text: "Workflow request failed. Please try again." }
        : message,
    ));
  } finally {
    setPending(false);
  }
};
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- components/chat-experience.test.tsx`

Expected: all chat behavior tests PASS with no `act(...)` warnings.

- [ ] **Step 5: Refactor into focused presentational components**

Move rendering-only responsibilities into `MessageList`, `PromptSuggestions`, and `MessageComposer`; keep request and message state in `ChatExperience`. Re-run the same tests after each extraction.

- [ ] **Step 6: Commit the chat experience**

```powershell
git add components app/page.tsx
git commit -m "feat: add advisor chat interaction"
```

### Task 5: Apply the Gemini-Inspired MomoRay Visual System

**Files:**
- Create: `components/advisor-shell.tsx`
- Create: `components/advisor-header.tsx`
- Create: `components/advisor.module.css`
- Modify: `components/chat-experience.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `ChatExperience` from Task 4.
- Produces: responsive desktop/sidebar and mobile/full-width layouts with accessible labels and focus states.

- [ ] **Step 1: Add a failing semantic layout test**

Extend the component test to require navigation, main chat region, header labels, the initial hero copy, and the composer label:

```tsx
expect(screen.getByRole("navigation", { name: "Advisor navigation" })).toBeInTheDocument();
expect(screen.getByRole("main")).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "今天想了解怎样的睡眠支撑？" })).toBeInTheDocument();
expect(screen.getByRole("textbox", { name: "Ask MomoRay AI Advisor" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the semantic test and verify RED**

Run: `npm test -- components/chat-experience.test.tsx`

Expected: FAIL because the shell landmarks and accessible name are missing.

- [ ] **Step 3: Implement shell and tokens**

Use these global tokens in `app/globals.css`:

```css
:root {
  --canvas: #f7f7fa;
  --surface: #ffffff;
  --surface-muted: #f1f0f6;
  --text: #19171f;
  --text-muted: #706b7a;
  --border: #e4e1ea;
  --accent: #7057d9;
  --accent-soft: #eeebff;
  --danger: #b42318;
  --shadow: 0 12px 34px rgba(42, 34, 68, 0.10);
}
```

Build a `248px` desktop sidebar, a compact sticky header, a centered initial hero with a maximum width of `820px`, suggestion chips/cards, and a rounded composer. At `max-width: 760px`, hide the sidebar, remove desktop gutters, and make the composer and message column use the full available width. Use `:focus-visible` outlines in `--accent` and keep all interactive targets at least `44px` high.

The shell structure must remain semantic and flat:

```tsx
<div className={styles.shell}>
  <nav aria-label="Advisor navigation" className={styles.sidebar}>
    <a href="/" className={styles.brand}>MomoRay</a>
    <button type="button" onClick={onReset}>New conversation</button>
    <p>AI sales advisor powered by a live Coze workflow.</p>
  </nav>
  <section className={styles.workspace}>
    <AdvisorHeader />
    <main className={styles.main}>{children}</main>
  </section>
</div>
```

Use the following layout rules as the base of `components/advisor.module.css`:

```css
.shell { min-height: 100dvh; display: grid; grid-template-columns: 248px minmax(0, 1fr); background: var(--canvas); }
.sidebar { padding: 24px 18px; border-right: 1px solid var(--border); background: var(--surface-muted); }
.workspace { min-width: 0; min-height: 100dvh; display: grid; grid-template-rows: auto minmax(0, 1fr); }
.main { min-height: 0; display: flex; flex-direction: column; }
.hero { width: min(820px, calc(100% - 48px)); margin: auto; text-align: center; }
.messages { width: min(820px, calc(100% - 48px)); margin: 0 auto; overflow-y: auto; }
.composerDock { position: sticky; bottom: 0; padding: 16px 24px 24px; background: var(--canvas); }
button:focus-visible, textarea:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
@media (max-width: 760px) {
  .shell { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .hero, .messages { width: min(100% - 28px, 820px); }
  .composerDock { padding: 12px 14px 16px; }
}
```

- [ ] **Step 4: Run behavior and semantic tests and verify GREEN**

Run: `npm test -- app/page.test.tsx components/chat-experience.test.tsx`

Expected: PASS; styling changes do not alter the interaction contract.

- [ ] **Step 5: Commit the visual system**

```powershell
git add app components
git commit -m "feat: style the MomoRay advisor experience"
```

### Task 6: Add Safe Configuration and Operator Documentation

**Files:**
- Create: `.env.example`
- Create: `README.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: environment names used by `lib/coze.ts`.
- Produces: an exact local setup contract without a real secret.

- [ ] **Step 1: Add the environment template**

Create `.env.example` exactly as follows:

```env
COZE_API_TOKEN=
COZE_WORKFLOW_ID=7679774858637492267
```

Ensure `.gitignore` includes `.env*` and explicitly allows `!.env.example`.

- [ ] **Step 2: Document setup and Token acquisition**

In `README.md`, document:

1. Install with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. In Coze, create an access token with `run` permission and ensure Workflow `7679774858637492267` is published.
4. Put the token only in `.env.local` or the deployment platform's server-side secret manager.
5. Run `npm run dev` and open `http://localhost:3000`.
6. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

- [ ] **Step 3: Verify no Token can be committed**

Run:

```powershell
git check-ignore .env.local
git grep -n "COZE_API_TOKEN=" -- ':!README.md' ':!.env.example'
```

Expected: `.env.local` is ignored and no tracked file contains a real Token value.

- [ ] **Step 4: Commit documentation**

```powershell
git add .env.example .gitignore README.md
git commit -m "docs: add secure Coze configuration guide"
```

### Task 7: Verify the Complete Deliverable

**Files:**
- Modify only files needed to correct failures found by verification.

**Interfaces:**
- Consumes: the complete application.
- Produces: test, type, lint, build, and visual evidence that the deliverable is ready for a real Token and deployment.

- [ ] **Step 1: Run the automated verification suite**

Run each command independently:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits `0` with no test warnings, type errors, lint errors, or build failures.

- [ ] **Step 2: Start the production server without a real Token**

Run `npm run start` after the build. Open the page and verify the initial page renders, suggestion buttons are usable, and a request fails with the specified generic client message rather than exposing configuration details.

- [ ] **Step 3: Perform desktop and mobile visual checks**

At approximately `1440 × 900`, verify the sidebar, header, centered hero, suggestions, composer, and conversation scroll behavior. At approximately `390 × 844`, verify the sidebar is hidden, content does not overflow horizontally, the composer remains reachable, and focus/submit controls remain at least `44px` tall.

- [ ] **Step 4: Test the real Workflow when the user has configured the Token**

Send each of the four suggested prompts and verify that every assistant message comes from Coze `data.output`. Confirm the medical question is displayed exactly as returned by the Workflow; do not add or invent client-side medical advice.

- [ ] **Step 5: Commit only if verification required fixes**

```powershell
git add app components lib README.md package.json package-lock.json
git commit -m "fix: complete advisor verification"
```

If no files changed during verification, do not create an empty commit.
