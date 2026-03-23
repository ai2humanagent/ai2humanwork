import Link from "next/link";
import { notFound } from "next/navigation";
import { readDb } from "../../../lib/store";
import styles from "./detail.module.css";

export default async function ServiceDetailPage({
  params
}: {
  params: { providerId: string; serviceId: string };
}) {
  const db = await readDb();
  const service = db.services.find((item) => item.id === params.serviceId);
  const provider = service
    ? db.humans.find((human) => human.id === service.providerId) || null
    : null;
  if (!service || !provider) return notFound();
  if (provider.handle !== params.providerId) {
    return notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <Link href="/services">← back to services</Link>
        <Link href="/app/profile">provider profile</Link>
      </div>

      <h1 className={styles.title}>{service.title}</h1>
      <p className={styles.muted}>
        {service.category} · {service.pricing} · {service.durationMinutes}m
      </p>

      <section className={styles.layout}>
        <article className={styles.card}>
          <h2>Service description</h2>
          <p className={styles.desc}>{service.description}</p>

          <h3>Delivery scope</h3>
          <ul className={styles.list}>
            <li>Structured output with clear assumptions and completion notes.</li>
            <li>Timestamped execution trace for reviewer verification.</li>
            <li>Escalation path for AI fallback and human proof capture.</li>
          </ul>

          <h3>Proof requirements</h3>
          <ul className={styles.list}>
            <li>At least one evidence log item with actor + timestamp.</li>
            <li>If on-site: photo/video proof + location context.</li>
            <li>If research/content: source links and final summary payload.</li>
          </ul>
        </article>

        <aside className={styles.card}>
          <div className={styles.provider}>
            <div className={`${styles.avatar} ${styles[`seed${provider.avatarSeed}`]}`} />
            <div>
              <p className={styles.name}>{provider.name}</p>
              <p className={styles.muted}>
                {provider.city}, {provider.country}
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span>Price</span>
            <strong>
              ${service.price}
              {service.pricing === "hourly" ? "/hr" : ""}
            </strong>
          </div>
          <div className={styles.row}>
            <span>Rating</span>
            <strong>
              {provider.rating} ({service.ratingCount})
            </strong>
          </div>
          <div className={styles.row}>
            <span>Completed jobs</span>
            <strong>{provider.completedJobs}</strong>
          </div>
          <div className={styles.row}>
            <span>Verified</span>
            <strong>{provider.verified ? "yes" : "no"}</strong>
          </div>
          <div className={styles.row}>
            <span>Languages</span>
            <strong>{provider.languages.join(", ")}</strong>
          </div>

          <button className={styles.cta}>Book service</button>
          <button className={`${styles.cta} ${styles.warn}`}>Escalate to bounty</button>
        </aside>
      </section>
    </main>
  );
}
