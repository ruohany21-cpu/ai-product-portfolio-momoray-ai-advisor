"use client";

import { useState } from "react";
import { MessageComposer } from "./message-composer";
import { MessageList, type ChatMessage } from "./message-list";
import { PromptSuggestions } from "./prompt-suggestions";

const FAILURE_MESSAGE = "Workflow request failed. Please try again.";

export function ChatExperience() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const send = async (rawInput: string) => {
    const input = rawInput.trim();
    if (!input || input.length > 2_000 || pending) return;

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setPending(true);
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: input },
      {
        id: assistantId,
        role: "assistant",
        status: "loading",
        text: "Running workflow...",
      },
    ]);

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !hasOutput(payload)) {
        throw new Error("Invalid advisor response");
      }
      setMessages((current) =>
        replaceAssistant(current, assistantId, payload.output, "complete"),
      );
    } catch {
      setMessages((current) =>
        replaceAssistant(current, assistantId, FAILURE_MESSAGE, "error"),
      );
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setDraft("");
    setPending(false);
  };

  return (
    <section>
      <button type="button" onClick={reset}>
        New conversation
      </button>
      {messages.length === 0 ? (
        <div>
          <p>Ask the workflow anything.</p>
          <PromptSuggestions disabled={pending} onSelect={send} />
        </div>
      ) : (
        <MessageList messages={messages} />
      )}
      <MessageComposer
        value={draft}
        disabled={pending}
        onChange={setDraft}
        onSubmit={() => void send(draft)}
      />
    </section>
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
  status: "complete" | "error",
) {
  return messages.map((message): ChatMessage =>
    message.id === id ? { id, role: "assistant", status, text } : message,
  );
}
