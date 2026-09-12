import { Sparkle, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import styles from "./advisor.module.css";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      status: "loading" | "complete" | "error" | "cancelled";
      text: string;
    };

type MessageListProps = {
  messages: ChatMessage[];
  onCancel: () => void;
};

export function MessageList({ messages, onCancel }: MessageListProps) {
  return (
    <div className={styles.messageList} aria-live="polite">
      {messages.map((message) => (
        <article
          className={styles.message}
          key={message.id}
          data-role={message.role}
          data-status={message.role === "assistant" ? message.status : undefined}
        >
          {message.role === "assistant" ? (
            <>
              <span className={styles.messageIcon} aria-hidden="true">
                <Sparkle size={16} weight="fill" />
              </span>
              {message.status === "loading" ? (
                <WorkflowProgress onCancel={onCancel} />
              ) : message.status === "complete" ? (
                <AssistantReply text={message.text} />
              ) : (
                <p className={styles.messageText}>{message.text}</p>
              )}
            </>
          ) : (
            <p className={styles.messageText}>{message.text}</p>
          )}
        </article>
      ))}
    </div>
  );
}

function AssistantReply({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = concisePreview(text);
  const hasDetails = preview !== text;

  return (
    <div className={styles.assistantBubble}>
      <p className={styles.replyText}>{expanded ? text : preview}</p>
      {hasDetails ? (
        <button
          className={styles.detailsButton}
          type="button"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "收起完整建议" : "查看完整建议"}
        </button>
      ) : null}
    </div>
  );
}

function WorkflowProgress({ onCancel }: { onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  const stage =
    elapsed >= 20
      ? "正在整理建议…"
      : elapsed >= 8
        ? "正在运行产品推荐流程…"
        : "正在分析你的需求…";

  return (
    <div className={styles.workflowProgress}>
      <p>{stage}</p>
      <div className={styles.progressMeta}>
        <span>已等待 {elapsed} 秒</span>
        <button type="button" onClick={onCancel} aria-label="取消请求">
          <X size={14} weight="bold" aria-hidden="true" />
          取消
        </button>
      </div>
    </div>
  );
}

function concisePreview(text: string) {
  if (text.length <= 220 && text.split("\n").length <= 6) return text;

  const firstParagraph = text.split(/\n\s*\n/)[0]?.trim() ?? text.trim();
  if (firstParagraph.length <= 180) return firstParagraph;

  const excerpt = firstParagraph.slice(0, 180);
  const sentenceEnd = Math.max(
    excerpt.lastIndexOf("。"),
    excerpt.lastIndexOf("！"),
    excerpt.lastIndexOf("？"),
  );

  return sentenceEnd >= 40
    ? excerpt.slice(0, sentenceEnd + 1)
    : `${excerpt.trimEnd()}…`;
}
