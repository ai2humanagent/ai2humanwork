import { RhTopbar } from "../components/RhTopbar";
import styles from "../rh-clone.module.css";
import { getHumanById } from "../lib/rentMock";

export default function DashboardPage() {
  const profile = getHumanById("yLw1guaJW9UU4lo8G7wU");

  return (
    <div className={styles.shell}>
      <RhTopbar active="verify" />

      <main className={styles.dashboardWrap}>
        <section className={styles.verifyBanner}>
          <div>
            <p className={styles.verifyTitle}>operator verification</p>
            <p className={styles.verifyDesc}>unlock trust badge + routing priority for $9.99/month</p>
          </div>
          <button className={styles.verifyButton}>upgrade operator →</button>
        </section>

        <section className={styles.statsRow}>
          <article className={styles.statCard}>
            <strong>109</strong>
            <p>profile views</p>
          </article>
          <article className={styles.statCard}>
            <strong>💬</strong>
            <p>open threads</p>
          </article>
          <article className={styles.statCard}>
            <strong>—</strong>
            <p>reputation</p>
          </article>
        </section>

        <h1 className={styles.dashboardTitle}>operator console</h1>

        <nav className={styles.tabs}>
          <button className={styles.tabActive}>profile</button>
          <button className={styles.tab}>routing rules</button>
          <button className={styles.tab}>proof policy</button>
          <button className={styles.tab}>settlement</button>
          <button className={styles.tab}>identity</button>
          <button className={styles.tab}>api keys</button>
          <button className={styles.tab}>messages</button>
        </nav>

        <section className={`${styles.panel} ${styles.formPanel}`}>
          <div className={styles.profileHeader}>
            <div className={styles.profileAvatar}>k</div>
            <div>
              <h2>{profile?.name ?? "kris ming"}</h2>
              <p>{profile?.email ?? "ritsuyan4763@gmail.com"}</p>
              <span className={styles.availableText}>available</span>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>name</span>
              <input defaultValue={profile?.name ?? "kris ming"} />
            </label>
            <label className={styles.field}>
              <span>headline</span>
              <input defaultValue={profile?.headline ?? "what you do"} />
            </label>
            <label className={styles.field}>
              <span>gender</span>
              <select defaultValue="man">
                <option value="man">man</option>
                <option value="woman">woman</option>
                <option value="other">other</option>
              </select>
            </label>

            <label className={`${styles.field} ${styles.span3}`}>
              <span>bio</span>
              <textarea placeholder="bio" />
              <small className={styles.counter}>0/2000</small>
            </label>

            <label className={styles.field}>
              <span>city</span>
              <input defaultValue="shanghai" />
            </label>
            <label className={styles.field}>
              <span>state/region</span>
              <input defaultValue="California" />
            </label>
            <label className={styles.field}>
              <span>country</span>
              <input defaultValue="China" />
            </label>

            <label className={styles.field}>
              <span>hourly rate ($)</span>
              <input defaultValue="50" />
            </label>
            <label className={styles.field}>
              <span>timezone</span>
              <input defaultValue="UTC" />
            </label>
            <div className={styles.actionsRow}>
              <button className={styles.rentButton}>save</button>
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.policySection}`}>
          <h2>runtime policies</h2>
          <div className={styles.policyGrid}>
            <article>
              <h3>routing policy</h3>
              <p>AI-first. Escalate to human after 1 failure or 90s timeout.</p>
            </article>
            <article>
              <h3>evidence policy</h3>
              <p>Require logs + timestamp. Photo mandatory for onsite tasks.</p>
            </article>
            <article>
              <h3>settlement policy</h3>
              <p>Auto-settle on verification pass. Reject requires reason code.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
