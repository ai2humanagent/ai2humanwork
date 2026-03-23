import Link from "next/link";
import { RhTopbar } from "../components/RhTopbar";
import styles from "../rh-clone.module.css";
import { rentHumans } from "../lib/rentMock";

function avatarSeedClass(seed: number) {
  const map = {
    1: styles.seed1,
    2: styles.seed2,
    3: styles.seed3,
    4: styles.seed4,
    5: styles.seed5,
    6: styles.seed6,
    7: styles.seed7,
    8: styles.seed8
  } as const;

  return map[seed as keyof typeof map] ?? styles.seed1;
}

export default function BrowsePage() {
  const featured = rentHumans.slice(0, 6);

  return (
    <div className={styles.shell}>
      <RhTopbar active="humans" />

      <main className={styles.container}>
        <section className={`${styles.panel} ${styles.heroPanelAlt}`}>
          <h1 className={styles.pageTitle}>Human Talent Exchange</h1>
          <p className={styles.pageSubtitle}>
            Route AI fallback work to local operators with proof and settlement.
          </p>
          <div className={styles.miniStats}>
            <span>9,655 operators</span>
            <span>117 cities</span>
            <span>24/7 dispatch</span>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.ctaPrimary}>post fallback order</button>
            <button className={styles.ctaGhost}>create talent squad</button>
            <button className={styles.ctaGhost}>run dry-run dispatch</button>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.filters}`}> 
          <label className={styles.field}>
            <span>capability</span>
            <input placeholder="on-site photo, pickup, signature..." />
          </label>
          <label className={styles.field}>
            <span>city</span>
            <input placeholder="San Francisco, Shanghai..." />
          </label>
          <label className={styles.field}>
            <span>country</span>
            <input placeholder="USA, Japan..." />
          </label>
          <label className={styles.field}>
            <span>budget ceiling</span>
            <input placeholder="$100/hr" />
          </label>
        </section>

        <section className={styles.marketLayout}>
          <div className={styles.humanGrid}>
            {featured.map((human) => (
              <article key={human.id} className={`${styles.panel} ${styles.humanCard}`}>
                <div className={styles.cardHead}>
                  <div className={styles.cardIdentity}>
                    <div className={`${styles.avatar} ${avatarSeedClass(human.avatarSeed)}`}>
                      {human.name.slice(0, 1).toLowerCase()}
                    </div>

                    <div className={styles.identityText}>
                      <div className={styles.nameLine}>
                        <h3>{human.name}</h3>
                        {human.verified ? <span className={styles.checkBadge} aria-hidden /> : null}
                      </div>
                      <p>{human.headline}</p>
                      <div className={styles.metaLine}>
                        <span>⭐ new</span>
                        <span>👁 {human.views}</span>
                      </div>
                    </div>
                  </div>

                  <span className={styles.remoteBadge}>hybrid</span>
                </div>

                <div className={styles.locationRow}>📍 {human.location}</div>
                <p className={styles.bio}>{human.bio}</p>

                <div className={styles.tagRow}>
                  {(human.tags.length > 0 ? human.tags : human.skills.slice(0, 2)).map((tag) => (
                    <span key={tag} className={styles.skillTag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className={styles.microMetrics}>
                  <span>avg response: 14m</span>
                  <span>proof modes: photo + logs</span>
                </div>

                <div className={styles.cardBottom}>
                  <p className={styles.rateLine}>
                    ${human.ratePerHour}
                    <span>/hr</span>
                  </p>
                  <Link href={`/humans/${human.id}`} className={styles.rentButton}>
                    open profile
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <aside className={`${styles.panel} ${styles.dispatchRail}`}>
            <h2>Dispatch Rail</h2>
            <p>Watch how AI fallback routes through operators in real time.</p>
            <ul className={styles.dispatchList}>
              <li>
                <span>task_2184</span>
                <strong>captcha override</strong>
                <em>matched in 22s</em>
              </li>
              <li>
                <span>task_2183</span>
                <strong>store photo proof</strong>
                <em>awaiting upload</em>
              </li>
              <li>
                <span>task_2182</span>
                <strong>signature relay</strong>
                <em>settled</em>
              </li>
            </ul>
            <div className={styles.railFooter}>
              <button className={styles.ctaPrimary}>open live routing</button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
