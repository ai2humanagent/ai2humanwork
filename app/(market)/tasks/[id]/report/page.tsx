import Link from "next/link";
import { notFound } from "next/navigation";
import { readDb, type Task } from "../../../../lib/store";
import {
  deriveCampaignLifecycle,
  getPublicArticleWinners
} from "../../../../lib/campaignReport";
import { getArticleContestMinimumWinnerScore } from "../../../../lib/articleContest";
import { formatDateTimeUtc8 } from "../../../../lib/dateTime";
import styles from "./report.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function findLatestTaskById(tasks: Task[], taskId: string) {
  const matches = tasks.filter((item) => item.id === taskId);
  if (matches.length <= 1) return matches[0] ?? null;
  return matches.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
}

function modeLabel(mode: string | undefined) {
  if (mode === "lucky_draw") return "Lucky Draw";
  if (mode === "ranked_article_contest") return "Ranked Article";
  if (mode === "equal") return "Equal Split";
  return "Task Campaign";
}

function formatDate(value: string | undefined) {
  return formatDateTimeUtc8(value);
}

function shortAddress(value: string | undefined) {
  if (!value) return "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default async function CampaignReportPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDb();
  const task = findLatestTaskById(db.tasks, id);
  if (!task) notFound();

  const mode = task.rewardDistribution?.mode || "fcfs";
  const articleSubmissions = db.articleSubmissions.filter((submission) => submission.taskId === task.id);
  const payments = db.payments.filter((payment) => payment.taskId === task.id);
  const lifecycle = deriveCampaignLifecycle({ task, articleSubmissions, payments });
  const publicWinners = mode === "ranked_article_contest"
    ? getPublicArticleWinners(task, articleSubmissions)
    : [];
  const reviewedCount = articleSubmissions.filter((submission) => submission.aiScore != null).length;
  const hasAuditResults = articleSubmissions.some((submission) => Boolean(submission.aiRubric?.audit));
  const minimumWinnerScore = getArticleContestMinimumWinnerScore(task.rewardDistribution);
  const totalPool = task.rewardDistribution?.totalPool || task.budget;
  const reportReady = mode !== "ranked_article_contest" || hasAuditResults;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>AI2Human Campaign Report</div>
          <h1>{task.title}</h1>
          <p>
            Public summary of campaign status, entries, AI-assisted review, winner selection,
            and USDC settlement readiness.
          </p>
          <div className={styles.heroActions}>
            <Link href={`/tasks/${task.id}`} className={styles.primaryLink}>
              View Task
            </Link>
            <a href="https://x.com/ai2humanwork" target="_blank" rel="noreferrer" className={styles.secondaryLink}>
              @ai2humanwork
            </a>
          </div>
        </div>
        <div className={styles.reportCard}>
          <span>{modeLabel(mode)}</span>
          <strong>{totalPool}</strong>
          <p>Prize pool</p>
          <div className={styles.reportMeta}>
            <div>
              <strong>{articleSubmissions.length}</strong>
              <span>Submissions</span>
            </div>
            <div>
              <strong>{reviewedCount}</strong>
              <span>Reviewed</span>
            </div>
            <div>
              <strong>{publicWinners.length}</strong>
              <span>Public winners</span>
            </div>
          </div>
        </div>
      </section>

      {!reportReady && (
        <div className={styles.notice}>
          This report is showing legacy review data. Admin should re-run AI Review to publish
          source-audited results and reviewed text excerpts.
        </div>
      )}

      <section className={styles.lifecycle}>
        {lifecycle.map((step) => (
          <div key={step.key} className={`${styles.lifecycleStep} ${styles[step.state]}`}>
            <span>{step.label}</span>
            <p>{step.description}</p>
          </div>
        ))}
      </section>

      <section className={styles.summaryGrid}>
        <div>
          <span>Campaign mode</span>
          <strong>{modeLabel(mode)}</strong>
        </div>
        <div>
          <span>Minimum public winner score</span>
          <strong>{mode === "ranked_article_contest" ? minimumWinnerScore : "-"}</strong>
        </div>
        <div>
          <span>Deadline</span>
          <strong>{formatDate(task.deadline)}</strong>
        </div>
        <div>
          <span>Settlement</span>
          <strong>Base USDC</strong>
        </div>
      </section>

      {mode === "ranked_article_contest" && (
        <section className={styles.results}>
          <div className={styles.sectionHeader}>
            <div>
              <span>AI Review Results</span>
              <h2>Qualified Winners</h2>
            </div>
            <p>
              Scored by relevance, originality, clarity, evidence, and narrative.
              Live X embed/API text is preferred; submitted snapshot text is only used as fallback when live fetching fails.
            </p>
          </div>

          {publicWinners.length === 0 ? (
            <div className={styles.empty}>
              No public winners are ready yet. Run AI Review, confirm qualified winners,
              then use this report for sharing.
            </div>
          ) : (
            <div className={styles.winnerGrid}>
              {publicWinners.map((winner) => (
                <article key={winner.id} className={`${styles.winnerCard} ${winner.rank === 1 ? styles.first : ""}`}>
                  <div className={styles.winnerTop}>
                    <div>
                      <span>{winner.rankLabel}</span>
                      <h3>@{winner.xHandle}</h3>
                    </div>
                    <strong>{winner.prizeAmount}</strong>
                  </div>
                  <div className={styles.scoreRow}>
                    <strong>{winner.score.toFixed(1)}</strong>
                    <span>/100</span>
                  </div>
                  <h4>{winner.title}</h4>
                  <p className={styles.reviewSummary}>{winner.reviewSummary}</p>
                  <div className={styles.sourceLine}>{winner.sourceLabel}</div>
                  {winner.reviewedTextExcerpt && (
                    <blockquote>{winner.reviewedTextExcerpt}</blockquote>
                  )}
                  <div className={styles.rubric}>
                    {winner.rubric.map((entry) => (
                      <div key={entry.key}>
                        <span>{entry.key}</span>
                        <strong>{entry.value.toFixed(1)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className={styles.cardLinks}>
                    <a href={winner.articleUrl} target="_blank" rel="noreferrer">Open X link</a>
                    <span>{shortAddress(winner.walletAddress)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.footerNote}>
        <strong>Task - Human action - Proof - Verification - USDC settlement</strong>
        <p>
          ai2human keeps campaign execution and payout evidence in one auditable loop,
          so agents and humans can coordinate work without losing settlement traceability.
        </p>
      </section>
    </main>
  );
}
