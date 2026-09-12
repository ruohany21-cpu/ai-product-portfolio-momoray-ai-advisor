"use client";

import { useRef, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { AdvisorShell } from "./advisor-shell";
import styles from "./advisor.module.css";
import { MessageComposer } from "./message-composer";
import { MessageList, type ChatMessage } from "./message-list";
import { PromptSuggestions } from "./prompt-suggestions";

const FAILURE_MESSAGE = "Workflow request failed. Please try again.";
const CANCELLED_MESSAGE = "已取消本次请求。";

export function ChatExperience() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  const send = async (rawInput: string) => {
    const input = rawInput.trim();
    if (!input || input.length > 2_000 || pending) return;

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    const startedAt = Date.now();
    activeRequest.current = controller;
    setPending(true);
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: input },
      {
        id: assistantId,
        role: "assistant",
        status: "loading",
        text: "正在分析你的需求…",
      },
    ]);

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok || !hasOutput(payload)) {
        throw new Error("Invalid advisor response");
      }
      setMessages((current) =>
        replaceAssistant(
          current,
          assistantId,
          payload.output,
          "complete",
          Date.now() - startedAt,
        ),
      );
    } catch {
      setMessages((current) =>
        replaceAssistant(
          current,
          assistantId,
          controller.signal.aborted ? CANCELLED_MESSAGE : FAILURE_MESSAGE,
          controller.signal.aborted ? "cancelled" : "error",
        ),
      );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }
      setPending(false);
    }
  };

  const reset = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setMessages([]);
    setDraft("");
    setPending(false);
  };

  const cancel = () => {
    activeRequest.current?.abort();
  };

  return (
    <AdvisorShell onReset={reset}>
      <section className={styles.experience}>
        <button
          className={styles.mobileReset}
          type="button"
          onClick={reset}
          aria-label="Reset conversation"
        >
          <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" />
        </button>
        {messages.length === 0 ? (
          <div className={styles.welcomeStage}>
            <p className={styles.eyebrow}>MOMORAY PRODUCT GUIDANCE</p>
            <h2 className={styles.heroTitle}>今天想了解怎样的睡眠支撑？</h2>
            <p className={styles.welcomeCopy}>Ask the workflow anything.</p>
            <PromptSuggestions disabled={pending} onSelect={send} />
          </div>
        ) : (
          <div className={styles.conversation}>
            <MessageList messages={messages} onCancel={cancel} />
          </div>
        )}
        <div className={styles.composerDock}>
          <MessageComposer
            value={draft}
            disabled={pending}
            onChange={setDraft}
            onSubmit={() => void send(draft)}
          />
        </div>
      </section>
    </AdvisorShell>
  );
}

function hasOutput(payload: unknown): payload is { output: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "output" in payload &&
    typeof payload.output === "string"
  );
}

function replaceAssistant(
  messages: ChatMessage[],
  id: string,
  text: string,
  status: "complete" | "error" | "cancelled",
  durationMs?: number,
) {
  return messages.map((message): ChatMessage =>
    message.id === id
      ? { id, role: "assistant", status, text, durationMs }
      : message,
  );
}
