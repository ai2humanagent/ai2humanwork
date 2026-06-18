import Link from "next/link";
import { notFound } from "next/navigation";
import { readDb, type Task } from "../../../../lib/store";
import {
  deriveCampaignLifecycle,
  getPublicArticleReviewEntries,
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

function optionalScore(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "-";
}

function optionalMetric(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
  const publicReviewEntries = mode === "ranked_article_contest" && articleResultsVisible
    ? getPublicArticleReviewEntries(articleSubmissions)
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

      {mode === "ranked_article_contest" && articleResultsVisible && publicReviewEntries.length > 0 && (
        <section className={styles.auditSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span>Full Transparency</span>
              <h2>Complete Scoring Report</h2>
            </div>
            <p>
              Every reviewed submission is listed below with full AI review text, rubric, model status,
              engagement weighting, source excerpt, X link, and payout record when applicable.
            </p>
          </div>
          <div className={styles.fullReportList}>
            {publicReviewEntries.map((entry) => (
              <details key={`full-report-${entry.id}`} className={styles.fullReportCard} open={entry.isWinner}>
                <summary>
                  <span className={styles.reportRank}>{entry.rank ? `#${entry.rank}` : "—"}</span>
                  <span className={styles.reportHandle}>@{entry.xHandle}</span>
                  <span className={styles.reportTitle}>{entry.title}</span>
                  <strong>{entry.score.toFixed(1)}/100</strong>
                  <span className={styles.reportStatus}>{entry.statusLabel}</span>
                </summary>
                <div className={styles.fullReportBody}>
                  <div className={styles.reportFacts}>
                    <div>
                      <span>Prize</span>
                      <strong>{entry.prizeAmount || "-"}</strong>
                    </div>
                    <div>
                      <span>Wallet</span>
                      <strong>{shortAddress(entry.walletAddress)}</strong>
                    </div>
                    <div>
                      <span>Source</span>
                      <strong>{entry.sourceLabel}</strong>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>{paymentLabel(entry)}</strong>
                    </div>
                  </div>

                  <div className={styles.scoreBreakdown}>
                    <div>
                      <span>Content score</span>
                      <strong>{optionalScore(entry.contentScore)}</strong>
                    </div>
                    <div>
                      <span>Engagement score</span>
                      <strong>{optionalScore(entry.engagementScore)}</strong>
                    </div>
                    <div>
                      <span>Final score</span>
                      <strong>{optionalScore(entry.finalScore || entry.score)}</strong>
                    </div>
                  </div>

                  {entry.finalScoreFormula && (
                    <p className={styles.formula}>{entry.finalScoreFormula}</p>
                  )}

                  <div className={styles.rubric}>
                    {entry.rubric.map((rubricEntry) => (
                      <div key={`${entry.id}-${rubricEntry.key}`}>
                        <span>{rubricEntry.key}</span>
                        <strong>{rubricEntry.value.toFixed(1)}</strong>
                      </div>
                    ))}
                  </div>

                  {entry.modelReviews.length > 0 && (
                    <div className={styles.modelStrip}>
                      {entry.modelReviews.map((item) => (
                        <span key={`full-model-${entry.id}-${item.providerLabel}`}>
                          {item.providerLabel}: {item.status === "scored" && item.score != null ? item.score.toFixed(1) : item.status}
                        </span>
                      ))}
                    </div>
                  )}

                  {entry.engagementMetrics && (
                    <div className={styles.engagementGrid}>
                      <div><span>Likes</span><strong>{optionalMetric(entry.engagementMetrics.likes)}</strong></div>
                      <div><span>Reposts</span><strong>{optionalMetric(entry.engagementMetrics.reposts)}</strong></div>
                      <div><span>Replies</span><strong>{optionalMetric(entry.engagementMetrics.replies)}</strong></div>
                      <div><span>Quotes</span><strong>{optionalMetric(entry.engagementMetrics.quotes)}</strong></div>
                      <div><span>Views</span><strong>{optionalMetric(entry.engagementMetrics.views)}</strong></div>
                      <div><span>Raw heat</span><strong>{optionalMetric(entry.engagementMetrics.rawScore)}</strong></div>
                    </div>
                  )}

                  {entry.prizeIneligible && (
                    <div className={styles.reviewWarning}>
                      Prize eligibility: {entry.prizeIneligibleReason || "This entry was reviewed but excluded from prize ranking."}
                    </div>
                  )}

                  <div className={styles.fullReviewBlock}>
                    <span>Full AI Review</span>
                    <p>{entry.fullReview}</p>
                  </div>

                  <div className={styles.fullReviewBlock}>
                    <span>Reviewed Source Excerpt</span>
                    <p>{entry.reviewedTextExcerpt || "Reviewed source text is recorded in the internal audit log."}</p>
                  </div>

                  <div className={styles.cardLinks}>
                    <a href={entry.articleUrl} target="_blank" rel="noreferrer">Open full X post</a>
                    {entry.paymentExplorerUrl && (
                      <a href={entry.paymentExplorerUrl} target="_blank" rel="noreferrer">View payout</a>
                    )}
                  </div>
                </div>
              </details>
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
