import { afterEach, describe, expect, test, vi } from "vitest";
import {
  CozeConfigurationError,
  CozeWorkflowError,
  runCozeWorkflow,
} from "./coze";

describe("runCozeWorkflow", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("posts the documented payload and returns data.output", async () => {
    const fetchImpl = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(
        JSON.stringify({
          code: 0,
          msg: "Success",
          data: JSON.stringify({ output: "可以，通过增减模块调节高度。" }),
        }),
        { status: 200 },
      );
    });

    const output = await runCozeWorkflow("可以调高度吗？", {
      token: "server-token",
      workflowId: "7679774858637492267",
      fetchImpl,
    });

    expect(output).toBe("可以，通过增减模块调节高度。");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
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
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  test("reads credentials from server environment by default", async () => {
    vi.stubEnv("COZE_API_TOKEN", "environment-token");
    vi.stubEnv("COZE_WORKFLOW_ID", "7679774858637492267");
    const fetchImpl = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(
        JSON.stringify({ code: 0, data: JSON.stringify({ output: "环境变量可用" }) }),
        { status: 200 },
      );
    });

    await expect(runCozeWorkflow("question", { fetchImpl })).resolves.toBe(
      "环境变量可用",
    );
    expect(fetchImpl.mock.calls[0][1]?.headers).toEqual({
      Authorization: "Bearer environment-token",
      "Content-Type": "application/json",
    });
  });

  test.each([
    ["HTTP failure", new Response("upstream unavailable", { status: 503 })],
    [
      "business failure",
      new Response(
        JSON.stringify({ code: 4000, msg: "bad request", data: "" }),
        { status: 200 },
      ),
    ],
    [
      "invalid data JSON",
      new Response(JSON.stringify({ code: 0, data: "not-json" }), {
        status: 200,
      }),
    ],
    [
      "missing output",
      new Response(
        JSON.stringify({ code: 0, data: JSON.stringify({}) }),
        { status: 200 },
      ),
    ],
    [
      "empty output",
      new Response(
        JSON.stringify({ code: 0, data: JSON.stringify({ output: "" }) }),
        { status: 200 },
      ),
    ],
  ])("normalizes %s", async (_name, response) => {
    const fetchImpl = vi.fn(async () => response);

    await expect(
      runCozeWorkflow("question", {
        token: "server-token",
        workflowId: "7679774858637492267",
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(CozeWorkflowError);
  });

  test("normalizes a network rejection", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network details must stay server-side");
    });

    await expect(
      runCozeWorkflow("question", {
        token: "server-token",
        workflowId: "7679774858637492267",
        fetchImpl,
      }),
    ).rejects.toEqual(new CozeWorkflowError());
  });

  test("rejects missing server configuration separately", async () => {
    await expect(
      runCozeWorkflow("question", { token: "", workflowId: "" }),
    ).rejects.toBeInstanceOf(CozeConfigurationError);
  });
});
