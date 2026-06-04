-- Allow repeated X handles and repeated article URLs only for test article contests.
-- Production article contests still enforce one X account and one article URL per task.

DROP INDEX IF EXISTS article_submissions_task_x_uidx;
DROP INDEX IF EXISTS article_submissions_task_url_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_x_uidx
  ON article_submissions (task_id, lower(x_handle))
  WHERE task_id NOT LIKE 'x-article-contest-test-%';

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_url_uidx
  ON article_submissions (task_id, lower(article_url))
  WHERE task_id NOT LIKE 'x-article-contest-test-%';
