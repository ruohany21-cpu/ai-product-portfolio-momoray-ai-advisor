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
    <div aria-live="polite">
      {messages.map((message) => (
        <article key={message.id} data-role={message.role}>
          <p>{message.text}</p>
        </article>
      ))}
    </div>
  );
}
