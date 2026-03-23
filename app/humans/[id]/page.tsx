import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../../rh-clone.module.css";
import { getHumanById } from "../../lib/rentMock";

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

type HumanPageProps = {
  params: {
    id: string;
  };
};

export default function HumanDetailPage({ params }: HumanPageProps) {
  const human = getHumanById(params.id);

  if (!human) {
    notFound();
  }

  const avatarClass = `${styles.heroAvatar} ${avatarSeedClass(human.avatarSeed)}`;

  if (human.mode === "profile") {
    return (
      <div className={styles.shell}>
        <main className={`${styles.container} ${styles.detailLayout}`}>
          <div className={styles.pageControls}>
            <Link href="/browse" className={styles.backLink}>
              ← back
            </Link>
            <button className={styles.shareButton}>share</button>
          </div>

          <section className={`${styles.panel} ${styles.heroPanel}`}>
            <div className={styles.heroMain}>
              <div className={avatarClass}>{human.name.slice(0, 1).toLowerCase()}</div>

              <div className={styles.heroInfo}>
                <div className={styles.heroNameLine}>
                  <h1>{human.name}</h1>
                  <span className={styles.availableBadge}>available</span>
                </div>

                <p className={styles.locationLine}>📍 {human.location}</p>
                <div className={styles.metaLine}>
                  <span className={styles.remoteBadge}>remote</span>
                  <span className={styles.remoteBadge}>ok</span>
                  <span>⭐ new</span>
                  <span>👁 {human.views} views</span>
                </div>
              </div>
            </div>

            <div className={styles.heroRate}>${human.ratePerHour}<span>/hr</span></div>
          </section>

          <section className={`${styles.panel} ${styles.metricsBand}`}>
            <article>
              <h3>response SLA</h3>
              <p>&lt; 15 min</p>
            </article>
            <article>
              <h3>coverage</h3>
              <p>remote + local errands</p>
            </article>
            <article>
              <h3>evidence mode</h3>
              <p>photo · timestamp · logs</p>
            </article>
          </section>

          <section className={`${styles.panel} ${styles.stackSection}`}>
            <h2>active workboard</h2>
            <div className={styles.emptyCard}>
              <p>no live jobs yet</p>
              <button className={styles.rentButton}>+ publish first order</button>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.stackSection}`}>
            <h2>capability tags</h2>
            <div className={styles.tagRow}>
              {human.skills.map((skill) => (
                <span key={skill} className={styles.skillTag}>
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.stackSection}`}>
            <h2>languages</h2>
            <div className={styles.tagRow}>
              {human.languages.map((language) => (
                <span key={language} className={styles.skillTag}>
                  {language}
                </span>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <main className={`${styles.container} ${styles.detailLayout}`}>
        <div className={styles.pageControls}>
          <Link href="/browse" className={styles.backLink}>
            ← back
          </Link>
          <button className={styles.shareButton}>share</button>
        </div>

        <section className={`${styles.panel} ${styles.heroPanel}`}>
          <div className={styles.heroMainWithAction}>
            <div className={styles.heroMain}>
              <div className={avatarClass}>{human.name.slice(0, 1).toLowerCase()}</div>

              <div className={styles.heroInfo}>
                <div className={styles.heroNameLine}>
                  <h1>{human.name}</h1>
                  {human.verified ? <span className={styles.checkBadge} aria-hidden /> : null}
                  <span className={styles.availableBadge}>available</span>
                </div>

                <p className={styles.heroHeadline}>{human.headline}</p>
                {human.email ? <p className={styles.locationLine}>📧 {human.email}</p> : null}
                <div className={styles.metaLine}>
                  <span>📍 {human.location}</span>
                  <span className={styles.remoteBadge}>remote</span>
                  <span className={styles.remoteBadge}>ok</span>
                </div>
                <div className={styles.metaLine}>
                  <span>⭐ new</span>
                  <span>👁 {human.views} views</span>
                </div>
              </div>
            </div>

            <button className={styles.rentButton}>hire now</button>
          </div>

          <div className={styles.heroRate}>${human.ratePerHour}<span>/hr</span></div>
        </section>

        <section className={`${styles.panel} ${styles.metricsBand}`}>
          <article>
            <h3>response SLA</h3>
            <p>&lt; 12 min</p>
          </article>
          <article>
            <h3>completion rate</h3>
            <p>97.4%</p>
          </article>
          <article>
            <h3>proof quality</h3>
            <p>high-confidence evidence</p>
          </article>
        </section>

        <section className={`${styles.panel} ${styles.stackSection}`}>
          <h2>execution profile</h2>
          <p>{human.about ?? human.bio}</p>
        </section>

        <section className={`${styles.panel} ${styles.stackSection}`}>
          <h2>capability tags</h2>
          <div className={styles.tagRow}>
            {human.skills.map((skill) => (
              <span key={skill} className={styles.skillTag}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
