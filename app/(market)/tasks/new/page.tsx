import NewTaskClient from "./NewTaskClient";
import styles from "../../market.module.css";

const privyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export default function NewTaskPage() {
  return (
    <section>
      <header className={styles.pageHeader}>
        <h1>Create Human Task</h1>
        <p className={styles.pageLead}>
          Turn a blocked agent step into a human-verifiable task with reward, deadline, proof rules, and settlement criteria.
        </p>
      </header>

      <div className={styles.createWrap}>
        <NewTaskClient privyEnabled={privyEnabled} />
      </div>
    </section>
  );
}
