import { ChatCircleDots, Plus, Sparkle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AdvisorHeader } from "./advisor-header";
import styles from "./advisor.module.css";

type AdvisorShellProps = {
  children: ReactNode;
  onReset: () => void;
};

export function AdvisorShell({ children, onReset }: AdvisorShellProps) {
  return (
    <div className={styles.shell}>
      <nav aria-label="Advisor navigation" className={styles.sidebar}>
        <a className={styles.brand} href="/" aria-label="MomoRay home">
          <span className={styles.brandMark}>
            <Sparkle size={20} weight="fill" aria-hidden="true" />
          </span>
          <span>MomoRay</span>
        </a>

        <button className={styles.newChatButton} type="button" onClick={onReset}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          New conversation
        </button>

        <div className={styles.sidebarSection}>
          <span className={styles.sidebarLabel}>WORKFLOW DEMO</span>
          <div className={styles.sidebarCard}>
            <ChatCircleDots size={20} aria-hidden="true" />
            <div>
              <strong>Sales advisor</strong>
              <span>Coze workflow</span>
            </div>
          </div>
        </div>

        <p className={styles.sidebarNote}>
          Product guidance based on a live MomoRay workflow.
        </p>
      </nav>

      <section className={styles.workspace}>
        <AdvisorHeader />
        <main className={styles.main}>{children}</main>
      </section>
    </div>
  );
}
