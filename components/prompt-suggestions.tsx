export const suggestedPrompts = [
  "如何调节枕头高度？",
  "我是侧睡，帮我推荐配置",
  "不同睡姿怎么选择？",
  "了解 MomoRay 产品结构",
] as const;

type PromptSuggestionsProps = {
  disabled: boolean;
  onSelect: (prompt: string) => void;
};

export function PromptSuggestions({ disabled, onSelect }: PromptSuggestionsProps) {
  return (
    <div className={styles.suggestions}>
      {suggestedPrompts.map((prompt) => (
        <button
          key={prompt}
          className={styles.suggestion}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
        >
          {prompt}
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
import { ArrowUpRight } from "@phosphor-icons/react";
import styles from "./advisor.module.css";
