export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      status: "loading" | "complete" | "error";
      text: string;
    };

type MessageListProps = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: MessageListProps) {
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
            <span className={styles.messageIcon} aria-hidden="true">
              <Sparkle size={16} weight="fill" />
            </span>
          ) : null}
          <p>{message.text}</p>
        </article>
      ))}
    </div>
  );
}
import { Sparkle } from "@phosphor-icons/react";
import styles from "./advisor.module.css";
