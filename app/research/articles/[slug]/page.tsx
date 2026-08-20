import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import { marked } from "marked";
import styles from "../../research.module.css";
import { researchArticles } from "../../../lib/researchArticles";

export const dynamic = "force-dynamic";

export default async function ResearchArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = researchArticles.find((item) => item.slug === slug);
  if (!article) notFound();

  const filePath = path.join(process.cwd(), "content", "research", `${slug}.md`);
  const markdown = await readFile(filePath, "utf8");
  const html = await marked.parse(markdown);

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
        <Link href="/research" className={styles.backLink}>
          ← Research
        </Link>
        <article className={styles.article}>
          <div className={styles.kicker}>AI2HUMAN · RESEARCH</div>
          <h1 className={styles.articleTitle}>{article.title}</h1>
          <p className={styles.paperDate}>
            {article.date} · {article.status}
          </p>
          <div
            className={styles.articleBody}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </main>
    </div>
  );
}
