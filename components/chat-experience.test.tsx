import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ChatExperience } from "./chat-experience";

const prompts = [
  "这个枕头可以调高度吗？",
  "我主要侧睡，肩比较宽，喜欢高一点",
  "给我推荐一个配置",
  "我最近脖子一直痛，是不是颈椎病？",
];

describe("ChatExperience", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("renders the welcome state and all suggested prompts", () => {
    render(<ChatExperience />);

    expect(
      screen.getByRole("navigation", { name: "Advisor navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "你的 MomoRay AI 产品顾问",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "MomoRay AI Advisor" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent Workflow Demo")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("Ask the workflow anything.")).toBeInTheDocument();
    for (const prompt of prompts) {
      expect(screen.getByRole("button", { name: prompt })).toBeInTheDocument();
    }
  });

  test("clicking a suggestion sends it and renders the real response", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(
        JSON.stringify({ output: "可以通过模块组合调节高度。" }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ChatExperience />);

    await user.click(
      screen.getByRole("button", { name: "这个枕头可以调高度吗？" }),
    );

    expect(
      await screen.findByText("可以通过模块组合调节高度。"),
    ).toBeInTheDocument();
    expect(screen.getByText("这个枕头可以调高度吗？")).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      input: "这个枕头可以调高度吗？",
    });
  });

  test("pressing Enter sends a typed question", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ output: "先了解你的肩宽和睡姿。" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ChatExperience />);

    const input = screen.getByRole("textbox", { name: "Ask MomoRay AI Advisor" });
    await user.type(input, "适合侧睡吗？{enter}");

    expect(await screen.findByText("先了解你的肩宽和睡姿。")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("shows loading and prevents another submission while pending", async () => {
    let resolveRequest!: (response: Response) => void;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn(() => request);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ChatExperience />);

    await user.click(screen.getByRole("button", { name: "给我推荐一个配置" }));

    expect(screen.getByText("正在分析你的需求…")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Ask MomoRay AI Advisor" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest(
      new Response(JSON.stringify({ output: "从中等支撑开始。" }), { status: 200 }),
    );
    expect(await screen.findByText("从中等支撑开始。")).toBeInTheDocument();
  });

  test("keeps an overlong workflow response concise until details are requested", async () => {
    const concise = "建议从 8cm 基础高度开始试睡，再根据颈部感受逐档调整。";
    const full = `${concise}\n\n${"这里是更完整的判断依据和试睡说明。".repeat(18)}`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ output: full }), { status: 200 }),
      ),
    );
    const user = userEvent.setup();
    render(<ChatExperience />);

    await user.click(screen.getByRole("button", { name: "给我推荐一个配置" }));

    expect(await screen.findByText(concise)).toBeInTheDocument();
    expect(screen.queryByText(full)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看完整建议" }));
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" && element.textContent === full,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "收起完整建议" }),
    ).toBeInTheDocument();
  });

  test("shows staged elapsed progress and lets the user cancel a slow workflow", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          requestSignal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    );
    render(<ChatExperience />);

    fireEvent.click(screen.getByRole("button", { name: "给我推荐一个配置" }));

    expect(screen.getByText("正在分析你的需求…")).toBeInTheDocument();
    expect(screen.getByText("已等待 0 秒")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByText("正在整理建议…")).toBeInTheDocument();
    expect(screen.getByText("已等待 20 秒")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "取消请求" }));
    await act(async () => Promise.resolve());

    expect(requestSignal?.aborted).toBe(true);
    expect(screen.getByText("已取消本次请求。")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Ask MomoRay AI Advisor" }),
    ).toBeEnabled();
  });

  test("shows the real workflow duration in a collapsible process row", async () => {
    vi.useFakeTimers();
    let resolveRequest!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = resolve;
          }),
      ),
    );
    render(<ChatExperience />);

    fireEvent.click(screen.getByRole("button", { name: "给我推荐一个配置" }));
    act(() => vi.advanceTimersByTime(83_000));
    resolveRequest(
      new Response(JSON.stringify({ output: "建议先从基础高度开始。" }), {
        status: 200,
      }),
    );
    await act(async () => Promise.resolve());

    const processButton = screen.getByRole("button", {
      name: "查看工作流过程，用时 1 分 23 秒",
    });
    const reply = screen.getByText("建议先从基础高度开始。");
    expect(processButton).toHaveAttribute("aria-expanded", "false");
    expect(
      processButton.compareDocumentPosition(reply) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(reply.parentElement).not.toContainElement(processButton);
    expect(screen.queryByText("已提交问题")).not.toBeInTheDocument();

    fireEvent.click(processButton);

    expect(screen.getByText("已提交问题")).toBeInTheDocument();
    expect(screen.getByText("已运行 Coze Workflow")).toBeInTheDocument();
    expect(screen.getByText("已返回精简建议")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "收起工作流过程，用时 1 分 23 秒",
      }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("does not submit empty input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ChatExperience />);

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each(["network", "non-2xx"])(
    "shows the exact failure copy for a %s failure",
    async (failureType) => {
      vi.stubGlobal(
        "fetch",
        failureType === "network"
          ? vi.fn(async () => {
              throw new Error("offline");
            })
          : vi.fn(async () =>
              new Response(JSON.stringify({ error: "upstream" }), { status: 502 }),
            ),
      );
      const user = userEvent.setup();
      render(<ChatExperience />);

      await user.click(screen.getByRole("button", { name: "给我推荐一个配置" }));

      expect(
        await screen.findByText("Workflow request failed. Please try again."),
      ).toBeInTheDocument();
    },
  );

  test("new conversation clears messages and restores suggestions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ output: "一个真实回复" }), { status: 200 }),
      ),
    );
    const user = userEvent.setup();
    render(<ChatExperience />);

    await user.click(screen.getByRole("button", { name: "给我推荐一个配置" }));
    expect(await screen.findByText("一个真实回复")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New conversation" }));

    await waitFor(() => {
      expect(screen.queryByText("一个真实回复")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "给我推荐一个配置" }),
    ).toBeInTheDocument();
  });
});
