import { CaretRight, Sparkle, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import styles from "./advisor.module.css";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      status: "loading" | "complete" | "error" | "cancelled";
      text: string;
      durationMs?: number;
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
                <AssistantReply
                  text={message.text}
                  durationMs={message.durationMs ?? 0}
                />
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

function AssistantReply({ text, durationMs }: { text: string; durationMs: number }) {
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
      <WorkflowDisclosure durationMs={durationMs} />
    </div>
  );
}

function WorkflowDisclosure({ durationMs }: { durationMs: number }) {
  const [expanded, setExpanded] = useState(false);
  const duration = formatDuration(durationMs);

  return (
    <div className={styles.workflowDisclosure}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`${expanded ? "收起" : "查看"}工作流过程，用时 ${duration}`}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>用时 {duration}</span>
        <CaretRight size={15} weight="bold" aria-hidden="true" />
      </button>
      {expanded ? (
        <div className={styles.workflowDetails}>
          <p>工作流过程</p>
          <ol>
            <li>已提交问题</li>
            <li>已运行 Coze Workflow</li>
            <li>已返回精简建议</li>
          </ol>
        </div>
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

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}
