import Link from "next/link";
import { notFound } from "next/navigation";
import { readDb, type Task } from "../../../../lib/store";
import {
  deriveCampaignLifecycle,
  getPublicArticleWinners
} from "../../../../lib/campaignReport";
import {
  getArticleContestMinimumWinnerScore,
  isArticleContestResultsVisible
} from "../../../../lib/articleContest";
import { formatDateTimeUtc8 } from "../../../../lib/dateTime";
import styles from "./report.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function findLatestTaskById(tasks: Task[], taskId: string) {
  const matches = tasks.filter((item) => item.id === taskId);
  if (matches.length <= 1) return matches[0] ?? null;
  return matches.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
}

function modeLabel(mode: string | undefined, action?: string, requiresImage?: boolean) {
  if (mode === "lucky_draw") return "Lucky Draw";
  if (mode === "ranked_article_contest") {
    if (action === "banner_image_contest") return "Banner Contest";
    if (requiresImage) return "Image Post Contest";
    return "Ranked Article";
  }
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

function currentLifecycleLabel(lifecycle: ReturnType<typeof deriveCampaignLifecycle>) {
  return lifecycle.find((step) => step.state === "current")?.label || "Draft";
}

function paymentLabel(winner: { status: string; paymentTxHash?: string }) {
  if (winner.status === "paid" || winner.paymentTxHash) return "Paid";
  return "Ready";
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
  const articleResultsVisible = mode !== "ranked_article_contest" || isArticleContestResultsVisible({
    deadline: task.deadline,
    taskState: task.taskState
  });
  const lifecycle = deriveCampaignLifecycle({ task, articleSubmissions, payments });
  const publicWinners = mode === "ranked_article_contest" && articleResultsVisible
    ? getPublicArticleWinners(task, articleSubmissions)
    : [];
  const reviewedCount = articleResultsVisible
    ? articleSubmissions.filter((submission) => submission.aiScore != null).length
    : 0;
  const hasAuditResults = articleSubmissions.some((submission) => Boolean(submission.aiRubric?.audit));
  const minimumWinnerScore = getArticleContestMinimumWinnerScore(task.rewardDistribution);
  const totalPool = task.rewardDistribution?.totalPool || task.budget;
  const reportReady = mode !== "ranked_article_contest" || (articleResultsVisible && hasAuditResults);
  const currentStep = currentLifecycleLabel(lifecycle);
  const paidWinnerCount = publicWinners.filter((winner) => winner.status === "paid" || winner.paymentTxHash).length;
  const firstWinner = publicWinners[0];
  const otherWinners = publicWinners.slice(1);
  const isBannerContest = task.campaign?.action === "banner_image_contest";
  const isImagePostContest = Boolean(task.campaign?.requiresImage);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>AI2Human Campaign Results</div>
          <h1>{task.title}</h1>
          <p>
            Public result report for entries, AI-assisted scoring, winner selection, and Base USDC payout readiness.
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
          <span>{currentStep}</span>
          <strong>{publicWinners.length || "-"}</strong>
          <p>public winners selected</p>
          <div className={styles.reportMeta}>
            <div>
              <strong>{totalPool}</strong>
              <span>Prize pool</span>
            </div>
            <div>
              <strong>{reviewedCount}</strong>
              <span>Reviewed</span>
            </div>
            <div>
              <strong>{paidWinnerCount}/{publicWinners.length || task.rewardDistribution?.maxWinners || 0}</strong>
              <span>Paid</span>
            </div>
          </div>
        </div>
      </section>

      {!reportReady && (
        <div className={styles.notice}>
          {isBannerContest
            ? "Banner contest results are hidden until the contest ends. Final scores, winners, and review excerpts will be published after admin locks the final results."
            : isImagePostContest
              ? "Image post contest results are hidden until the contest ends. Final scores, winners, and review excerpts will be published after admin locks the final results."
            : "Article contest results are hidden until the contest ends. Final scores, winners, and review excerpts will be published after admin locks the final results."}
        </div>
      )}

      <section className={styles.statusStrip} aria-label="Campaign lifecycle">
        {lifecycle.map((step) => (
          <div key={step.key} className={`${styles.statusStep} ${styles[step.state]}`}>
            <span>{step.label}</span>
          </div>
        ))}
      </section>

      <section className={styles.summaryGrid}>
        <div>
          <span>Campaign mode</span>
          <strong>{modeLabel(mode, task.campaign?.action, task.campaign?.requiresImage)}</strong>
        </div>
        <div>
          <span>Minimum public winner score</span>
          <strong>{mode === "ranked_article_contest" && articleResultsVisible ? minimumWinnerScore : "-"}</strong>
        </div>
        <div>
          <span>Deadline</span>
          <strong>{formatDate(task.deadline)}</strong>
        </div>
        <div>
          <span>Settlement</span>
          <strong>Base USDC</strong>
        </div>
        <div>
          <span>Review Anchor</span>
          <strong>
            {task.reviewAnchor?.txHash ? (
              <a href={task.reviewAnchor.explorerUrl} target="_blank" rel="noreferrer">
                Base anchored
              </a>
            ) : "-"}
          </strong>
        </div>
      </section>

      {mode === "ranked_article_contest" && articleResultsVisible && (
        <section className={styles.results}>
          <div className={styles.sectionHeader}>
            <div>
              <span>AI Review Results</span>
              <h2>Winners & Review Notes</h2>
            </div>
            <p>
              Scores are created when each submission is submitted or updated. Live X content is preferred;
              submitted fallback text is used only when live fetching fails.
            </p>
          </div>
          {task.reviewAnchor?.txHash && (
            <div className={styles.notice}>
              Final review anchored on Base:{" "}
              <a href={task.reviewAnchor.explorerUrl} target="_blank" rel="noreferrer">
                {task.reviewAnchor.txHash}
              </a>
            </div>
          )}

          {publicWinners.length === 0 ? (
            <div className={styles.empty}>
              No public winners are ready yet. Lock the final results after the deadline,
              then use this report for sharing.
            </div>
          ) : (
            <>
              {firstWinner && (
                <article className={`${styles.winnerCard} ${styles.first}`}>
                  <div className={styles.winnerTop}>
                    <div>
                      <span>{firstWinner.rankLabel}</span>
                      <h3>@{firstWinner.xHandle}</h3>
                    </div>
                    <strong>{firstWinner.prizeAmount}</strong>
                  </div>
                  <div className={styles.scoreRow}>
                    <strong>{firstWinner.score.toFixed(1)}</strong>
                    <span>/100</span>
                  </div>
                  <h4>{firstWinner.title}</h4>
                  <p className={styles.reviewSummary}>{firstWinner.reviewSummary}</p>
                  <div className={styles.resultBadges}>
                    <span>{firstWinner.sourceLabel}</span>
                    {firstWinner.modelConsensusLabel && <span>{firstWinner.modelConsensusLabel}</span>}
                    <span>{paymentLabel(firstWinner)}</span>
                    <span>{shortAddress(firstWinner.walletAddress)}</span>
                  </div>
                  {firstWinner.modelReviews.length > 0 && (
                    <div className={styles.modelStrip}>
                      {firstWinner.modelReviews.map((item) => (
                        <span key={`${firstWinner.id}-${item.providerLabel}`}>
                          {item.providerLabel}: {item.status === "scored" && item.score != null ? item.score.toFixed(1) : item.status}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={styles.rubric}>
                    {firstWinner.rubric.map((entry) => (
                      <div key={entry.key}>
                        <span>{entry.key}</span>
                        <strong>{entry.value.toFixed(1)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className={styles.cardLinks}>
                    <a href={firstWinner.articleUrl} target="_blank" rel="noreferrer">Open X link</a>
                    {firstWinner.paymentExplorerUrl ? (
                      <a href={firstWinner.paymentExplorerUrl} target="_blank" rel="noreferrer">View payout</a>
                    ) : (
                      <span>USDC payout pending</span>
                    )}
                  </div>
                </article>
              )}

              {otherWinners.length > 0 && (
                <div className={styles.runnerGrid}>
                  {otherWinners.map((winner) => (
                    <article key={winner.id} className={styles.runnerCard}>
                      <div className={styles.runnerRank}>
                        <span>{winner.rankLabel}</span>
                        <strong>{winner.prizeAmount}</strong>
                      </div>
                      <h3>@{winner.xHandle}</h3>
                      <p>{winner.title}</p>
                      <div className={styles.runnerScore}>
                        <strong>{winner.score.toFixed(1)}</strong>
                        <span>/100</span>
                      </div>
                      <p className={styles.runnerReview}>{winner.reviewSummary}</p>
                      {winner.modelConsensusLabel && <div className={styles.runnerModel}>{winner.modelConsensusLabel}</div>}
                      {winner.modelReviews.length > 0 && (
                        <div className={styles.modelStrip}>
                          {winner.modelReviews.map((item) => (
                            <span key={`${winner.id}-${item.providerLabel}`}>
                              {item.providerLabel}: {item.status === "scored" && item.score != null ? item.score.toFixed(1) : item.status}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className={styles.cardLinks}>
                        <a href={winner.articleUrl} target="_blank" rel="noreferrer">Open X</a>
                        <span>{paymentLabel(winner)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {mode === "ranked_article_contest" && articleResultsVisible && publicWinners.length > 0 && (
        <section className={styles.auditSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span>Audit Trail</span>
              <h2>Reviewed Text Sources</h2>
            </div>
            <p>These are compact audit excerpts for readability. Open the X link on each winner card to view the full source post.</p>
          </div>
          <div className={styles.auditGrid}>
            {publicWinners.map((winner) => (
              <article key={`audit-${winner.id}`} className={styles.auditCard}>
                <div>
                  <strong>@{winner.xHandle}</strong>
                  <span>{winner.sourceLabel}</span>
                </div>
                {winner.modelReviews.length > 0 && (
                  <div className={styles.auditModels}>
                    {winner.modelReviews.map((item) => (
                      <span key={`audit-model-${winner.id}-${item.providerLabel}`}>
                        {item.providerLabel}: {item.status === "scored" && item.score != null ? item.score.toFixed(1) : item.status}
                      </span>
                    ))}
                  </div>
                )}
                <p>{winner.reviewedTextExcerpt || "Reviewed source text is recorded in the internal audit log."}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={styles.footerNote}>
        <strong>Task - Human action - Proof - Verification - USDC settlement</strong>
        <p>
          AI2Human keeps campaign execution and payout evidence in one auditable loop,
          so agents and humans can coordinate work without losing settlement traceability.
        </p>
      </section>
    </main>
  );
}
