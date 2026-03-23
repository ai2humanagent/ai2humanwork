import NewTaskClient from "./NewTaskClient";
import styles from "../../market.module.css";

const privyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export default function NewTaskPage() {
  return (
    <section>
      <header className={styles.pageHeader}>
        <h1>Create a Task</h1>
        <p className={styles.pageLead}>
          Post a new task and let workers compete to complete it. Choose the mode that best fits your needs.
        </p>
      </header>

      <div className={styles.createWrap}>
        <NewTaskClient privyEnabled={privyEnabled} />
      </div>
    </section>
  );
}
