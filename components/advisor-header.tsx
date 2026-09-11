import { Pulse } from "@phosphor-icons/react";
import styles from "./advisor.module.css";

export function AdvisorHeader() {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.productName}>MomoRay AI Advisor</h1>
        <p className={styles.productMeta}>Agent Workflow Demo</p>
      </div>
      <div className={styles.liveBadge} aria-label="Workflow live">
        <Pulse size={15} weight="bold" aria-hidden="true" />
        <span>LIVE</span>
      </div>
    </header>
  );
}
