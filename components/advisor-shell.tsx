import { ChatCircleDots, Plus, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
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
        <Link className={styles.brand} href="/" aria-label="MomoRay home">
          <span className={styles.brandMark}>
            <Sparkle size={20} weight="fill" aria-hidden="true" />
          </span>
          <span>MomoRay</span>
        </Link>

        <button className={styles.newChatButton} type="button" onClick={onReset}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          新建对话
        </button>

        <div className={styles.sidebarSection}>
          <span className={styles.sidebarLabel}>MOMORAY SLEEP SYSTEM</span>
          <div className={styles.sidebarCard}>
            <ChatCircleDots size={20} aria-hidden="true" />
            <div>
              <strong>智能售前顾问</strong>
              <span>模块化支撑方案</span>
            </div>
          </div>
        </div>

        <p className={styles.sidebarNote}>
          从睡姿、肩宽和偏好出发，找到更适合你的睡眠支撑。
        </p>
      </nav>

      <section className={styles.workspace}>
        <AdvisorHeader />
        <main className={styles.main}>{children}</main>
      </section>
    </div>
  );
}
