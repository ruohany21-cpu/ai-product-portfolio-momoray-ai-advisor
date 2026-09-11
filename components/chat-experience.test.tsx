import { render, screen, waitFor } from "@testing-library/react";
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
    vi.unstubAllGlobals();
  });

  test("renders the welcome state and all suggested prompts", () => {
    render(<ChatExperience />);

    expect(screen.getByText("Ask the workflow anything.")).toBeInTheDocument();
    for (const prompt of prompts) {
      expect(screen.getByRole("button", { name: prompt })).toBeInTheDocument();
    }
  });

  test("clicking a suggestion sends it and renders the real response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ output: "可以通过模块组合调节高度。" }),
        { status: 200 },
      ),
    );
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

    expect(screen.getByText("Running workflow...")).toBeInTheDocument();
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
