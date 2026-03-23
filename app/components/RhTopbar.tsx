import Link from "next/link";
import styles from "../rh-clone.module.css";

type TopbarTab = "humans" | "services" | "bounties" | "verify";

type RhTopbarProps = {
  active?: TopbarTab;
};

export function RhTopbar({ active = "humans" }: RhTopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <Link href="/browse" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          <span className={styles.brandText}>ai2human // market</span>
        </Link>

        <nav className={styles.navLinks}>
          <Link
            href="/browse"
            className={active === "humans" ? styles.navActive : undefined}
          >
            talent
          </Link>
          <Link
            href="/services"
            className={active === "services" ? styles.navActive : undefined}
          >
            service kits
          </Link>
          <Link
            href="/fallback-orders"
            className={active === "bounties" ? styles.navActive : undefined}
          >
            orders
          </Link>
          <Link
            href="/dashboard"
            className={active === "verify" ? styles.navActive : undefined}
          >
            console
          </Link>
        </nav>

        <div className={styles.topActions}>
          <span className={styles.bubble} aria-hidden>
            💬
          </span>
          <Link href="/humans/yLw1guaJW9UU4lo8G7wU" className={styles.avatarMini}>
            k
          </Link>
        </div>
      </div>
    </header>
  );
}
