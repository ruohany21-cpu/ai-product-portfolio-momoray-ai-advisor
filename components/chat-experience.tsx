"use client";

import { useRef, useState } from "react";
import { ArrowCounterClockwise, CheckCircle, Cube, MoonStars, Sparkle } from "@phosphor-icons/react";
import { AdvisorShell } from "./advisor-shell";
import styles from "./advisor.module.css";
import { MessageComposer } from "./message-composer";
import { MessageList, type ChatMessage } from "./message-list";
import { PromptSuggestions } from "./prompt-suggestions";
import { runCozeConversation } from "@/lib/coze";

const FAILURE_MESSAGE = "Workflow request failed. Please try again.";
const CANCELLED_MESSAGE = "已取消本次请求。";

export function ChatExperience() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const conversationId = useRef<string | null>(null);
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
      const payload = await runCozeConversation(
        input,
        conversationId.current ?? undefined,
        { signal: controller.signal },
      );
      conversationId.current = payload.conversationId ?? null;
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
    conversationId.current = null;
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
            <div className={styles.heroPanel}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>MOMORAY SLEEP INTELLIGENCE</p>
                <h2 className={styles.heroTitle}>你的智能睡眠产品顾问</h2>
                <p className={styles.welcomeCopy}>
                  基于 MomoRay 模块化枕头知识库，<br />
                  帮助你找到适合自己的支撑方案。
                </p>
                <div className={styles.heroSignals}>
                  <span><CheckCircle size={16} weight="fill" />个性化建议</span>
                  <span><MoonStars size={16} weight="fill" />睡姿适配</span>
                </div>
              </div>
              <div className={styles.productDisplay} aria-label="MomoRay 模块化枕头产品结构">
                <div className={styles.productGlow} />
                <div className={styles.pillowCard}>
                  <div className={styles.pillowHeader}>
                    <span className={styles.pillowIcon}><Sparkle size={15} weight="fill" /></span>
                    <span>MomoRay</span>
                    <span className={styles.pillowStatus}>MODULAR</span>
                  </div>
                  <div className={styles.pillowStack}>
                    <span className={styles.stackLayer}>柔软释压层</span>
                    <span className={styles.stackLayer}>高度支撑层</span>
                    <span className={styles.stackLayer}>稳定承托层</span>
                  </div>
                  <div className={styles.pillowFooter}><Cube size={16} /> 可调节结构</div>
                </div>
              </div>
            </div>
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
