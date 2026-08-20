import Link from "next/link";
import styles from "./research.module.css";
import { researchArticles } from "../lib/researchArticles";

const paper = {
  num: "01",
  title:
    "When Agents Need the Real World: Verifiable Human Execution for Reality-Bound Agent Tasks",
  sub: "A System Model, Prototype, and Evaluation Plan for AI2Human",
  date: "June 27, 2026 · arXiv v1",
  status: "Systems paper · Published",
  href: "/papers/when-agents-need-the-real-world.pdf",
  abstract:
    "Autonomous agents can browse, call APIs, write code, and coordinate digital workflows — but they still fail when a workflow requires someone to enter a store, inspect a shelf, verify a delivery, collect a signature, or produce fresh evidence from a physical location. We introduce Structured Human Execution Infrastructure: a system layer that lets agents turn a blocked real-world step into a bounded human-executable task, receive structured proof, verify the result, and release payment only after acceptance. The contribution is an agent-native interface in which tasks, proof requirements, verification state, settlement state, and audit logs are machine-readable and can be reintegrated into an agent workflow.",
};

export default function ResearchPage() {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.mark}>A2H</span>
          <span>AI2Human</span>
        </Link>
        <nav className={styles.toplinks}>
          <Link href="/">Home</Link>
          <Link href="/whitepaper">Whitepaper</Link>
          <Link href="/tasks">Protocol Demo</Link>
        </nav>
      </header>

      <main className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.kicker}>AI2HUMAN · RESEARCH</div>
          <h1>We publish the verification layer for AGI.</h1>
          <p className={styles.heroLead}>
            When agents touch the open world, completion cannot be inferred from
            plausible output alone — it has to be specified, evidenced, verified,
            and settled. Our systems paper is available as an open PDF.
          </p>
        </section>

        <section className={styles.papers}>
          <article className={styles.paper}>
            <div className={styles.paperHead}>
              <span className={styles.paperNum}>{paper.num}</span>
              <span className={styles.paperStatus}>{paper.status}</span>
            </div>
            <h2 className={styles.paperTitle}>{paper.title}</h2>
            <p className={styles.paperSub}>{paper.sub}</p>
            <p className={styles.paperAbstract}>{paper.abstract}</p>
            <div className={styles.paperFoot}>
              <span className={styles.paperDate}>{paper.date}</span>
              <a
                className={styles.download}
                href={paper.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read PDF ↗
              </a>
            </div>
          </article>
        </section>

        <section className={styles.papers} style={{ marginTop: 34 }}>
          {researchArticles.map((article, index) => (
            <article key={article.slug} className={styles.paper}>
              <div className={styles.paperHead}>
                <span className={styles.paperNum}>
                  {String(index + 2).padStart(2, "0")}
                </span>
                <span className={styles.paperStatus}>{article.status}</span>
              </div>
              <h2 className={styles.paperTitle}>
                <Link href={`/research/articles/${article.slug}`} className={styles.paperLink}>
                  {article.title}
                </Link>
              </h2>
              <p className={styles.paperAbstract}>{article.excerpt}</p>
              <div className={styles.paperFoot}>
                <span className={styles.paperDate}>{article.date}</span>
                <Link className={styles.download} href={`/research/articles/${article.slug}`}>
                  Read ↗
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.cta}>
          <h2>Read the live protocol.</h2>
          <p>
            The papers define the abstraction; the production system runs it —
            task → human execution → proof → verify → settle.
          </p>
          <div className={styles.ctaActions}>
            <Link className={styles.primary} href="/verification-whitepaper">
              Protocol Whitepaper
            </Link>
            <Link className={styles.secondary} href="/livedemo">
              Live Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
