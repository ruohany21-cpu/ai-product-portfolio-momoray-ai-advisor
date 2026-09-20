import { afterEach, describe, expect, test, vi } from "vitest";
import {
  CozeConfigurationError,
  CozeWorkflowError,
  runCozeConversation,
} from "./coze";

function sseResponse(events: Array<[string, unknown]>) {
  const body = events
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join("");
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("runCozeConversation", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("starts a dialogue flow and returns its answer and conversation id", async () => {
    const fetchImpl = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return sseResponse([
        ["conversation.chat.created", { id: "chat-1", conversation_id: "conversation-1", status: "created" }],
        ["conversation.message.completed", { id: "message-1", conversation_id: "conversation-1", role: "assistant", type: "answer", content_type: "text", content: "可以，通过增减模块调节高度。" }],
        ["done", { debug_url: "https://www.coze.cn/work_flow?execute_id=1" }],
      ]);
    });

    const result = await runCozeConversation("可以调高度吗？", undefined, {
      token: "server-token",
      workflowId: "7684655278651277347",
      botId: "7686779008054607872",
      fetchImpl,
    });

    expect(result).toEqual({ output: "可以，通过增减模块调节高度。", conversationId: "conversation-1" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.coze.cn/v1/workflows/chat");
    expect(init?.headers).toEqual({ Authorization: "Bearer server-token", "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual({
      workflow_id: "7684655278651277347",
      parameters: {
        CONVERSATION_NAME: "Default",
        USER_INPUT: "可以调高度吗？",
        input: "",
      },
      additional_messages: [{
        content: "可以调高度吗？",
        content_type: "text",
        role: "user",
      }],
    });
  });

  test("continues the same Coze conversation when an id is supplied", async () => {
    const fetchImpl = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return sseResponse([
        ["conversation.message.completed", { conversation_id: "conversation-1", role: "assistant", type: "answer", content: "记得，你主要侧睡。" }],
        ["done", {}],
      ]);
    });

    await runCozeConversation("你记得我的睡姿吗？", "conversation-1", {
      token: "server-token",
      workflowId: "7684655278651277347",
      botId: "7686779008054607872",
      fetchImpl,
    });

    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({ conversation_id: "conversation-1" });
  });

  test("reads all server credentials from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_COZE_API_TOKEN", "environment-token");
    vi.stubEnv("NEXT_PUBLIC_COZE_WORKFLOW_ID", "7684655278651277347");
    vi.stubEnv("NEXT_PUBLIC_COZE_BOT_ID", "7686779008054607872");
    const fetchImpl = vi.fn(async () =>
      sseResponse([
        ["conversation.message.completed", { conversation_id: "conversation-2", role: "assistant", type: "answer", content: "环境变量可用" }],
        ["done", {}],
      ]),
    );

    await expect(runCozeConversation("question", undefined, { fetchImpl })).resolves.toEqual({
      output: "环境变量可用",
      conversationId: "conversation-2",
    });
  });

  test.each([
    ["HTTP failure", new Response("upstream unavailable", { status: 503 })],
    ["error event", sseResponse([["error", { code: 4000, msg: "bad request" }]])],
    ["failed chat", sseResponse([["conversation.chat.failed", { last_error: { code: 4000, msg: "bad" } }]])],
    ["missing answer", sseResponse([["done", {}]])],
  ])("normalizes %s", async (_name, response) => {
    await expect(
      runCozeConversation("question", undefined, {
        token: "server-token",
        workflowId: "7684655278651277347",
        botId: "7686779008054607872",
        fetchImpl: vi.fn(async () => response),
      }),
    ).rejects.toBeInstanceOf(CozeWorkflowError);
  });

  test("rejects missing server configuration separately", async () => {
    await expect(
      runCozeConversation("question", undefined, { token: "", workflowId: "", botId: "" }),
    ).rejects.toBeInstanceOf(CozeConfigurationError);
  });
});
