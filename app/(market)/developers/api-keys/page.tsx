import Link from "next/link";
import styles from "../../market.module.css";
import ApiKeyRequestClient from "./ApiKeyRequestClient";

export default function ApiKeysPage() {
  return (
    <main className={styles.apiKeysPage}>
      <header className={styles.apiKeysHeader}>
        <h1>API Keys</h1>
        <Link href="/developers">
          Learn More
          <span aria-hidden="true">›</span>
        </Link>
      </header>

      <ApiKeyRequestClient />
    </main>
  );
}
