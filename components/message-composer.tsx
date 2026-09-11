import { ArrowUp } from "@phosphor-icons/react";
import type { FormEvent, KeyboardEvent } from "react";
import styles from "./advisor.module.css";

type MessageComposerProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function MessageComposer({
  value,
  disabled,
  onChange,
  onSubmit,
}: MessageComposerProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const submitWithEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <textarea
        aria-label="Ask MomoRay AI Advisor"
        disabled={disabled}
        maxLength={2_000}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={submitWithEnter}
        placeholder="Ask MomoRay AI Advisor"
        rows={1}
        value={value}
      />
      <button
        className={styles.sendButton}
        type="submit"
        aria-label="Send message"
        disabled={disabled || !value.trim()}
      >
        <ArrowUp size={20} weight="bold" aria-hidden="true" />
      </button>
    </form>
  );
}
