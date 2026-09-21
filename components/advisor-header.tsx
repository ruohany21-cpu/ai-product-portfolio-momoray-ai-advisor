import { Pulse } from "@phosphor-icons/react";
import styles from "./advisor.module.css";

export function AdvisorHeader() {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.productName}>MomoRay 智能睡眠顾问</h1>
        <p className={styles.productMeta}>Modular sleep support, made personal</p>
      </div>
      <div className={styles.liveBadge} aria-label="Workflow live">
        <Pulse size={15} weight="bold" aria-hidden="true" />
        <span>在线服务</span>
      </div>
    </header>
  );
}
