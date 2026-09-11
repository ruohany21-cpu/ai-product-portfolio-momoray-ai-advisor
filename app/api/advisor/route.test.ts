import { afterEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";

const endpoint = "http://localhost/api/advisor";
const failure = { error: "Workflow request failed. Please try again." };

function advisorRequest(body: string) {
  return new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("POST /api/advisor", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("trims input and returns the normalized workflow output", async () => {
    vi.stubEnv("COZE_API_TOKEN", "server-token");
    vi.stubEnv("COZE_WORKFLOW_ID", "7679774858637492267");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: 0,
          data: JSON.stringify({ output: "建议先从中等高度开始。" }),
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      advisorRequest(JSON.stringify({ input: "  推荐一个配置  " })),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ output: "建议先从中等高度开始。" });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      workflow_id: "7679774858637492267",
      parameters: { input: "推荐一个配置" },
    });
  });

  test.each([
    ["empty input", JSON.stringify({ input: "   " })],
    ["missing input", JSON.stringify({ question: "hello" })],
    ["non-string input", JSON.stringify({ input: 42 })],
    ["overlong input", JSON.stringify({ input: "问".repeat(2_001) })],
    ["malformed JSON", "{not-json"],
  ])("returns 400 for %s", async (_name, body) => {
    const response = await POST(advisorRequest(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(failure);
  });

  test("returns 500 when server configuration is missing", async () => {
    vi.stubEnv("COZE_API_TOKEN", "");
    vi.stubEnv("COZE_WORKFLOW_ID", "");

    const response = await POST(
      advisorRequest(JSON.stringify({ input: "这个枕头可以调高度吗？" })),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(failure);
  });

  test("returns a secret-free 502 when Coze rejects the request", async () => {
    vi.stubEnv("COZE_API_TOKEN", "super-secret-token");
    vi.stubEnv("COZE_WORKFLOW_ID", "7679774858637492267");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ code: 4000, msg: "token super-secret-token invalid" }),
          { status: 200 },
        ),
      ),
    );

    const response = await POST(
      advisorRequest(JSON.stringify({ input: "推荐配置" })),
    );
    const responseText = await response.text();

    expect(response.status).toBe(502);
    expect(JSON.parse(responseText)).toEqual(failure);
    expect(responseText).not.toContain("super-secret-token");
  });
});
