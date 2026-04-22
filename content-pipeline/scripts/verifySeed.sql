-- Verify Task seed results
-- Run against the mongolian_app database after npm run db:seed

SELECT COUNT(*) AS total_tasks FROM "Task";

SELECT "primary_skill", COUNT(*) AS task_count
  FROM "Task"
  GROUP BY "primary_skill"
  ORDER BY 1;

SELECT "level_target", COUNT(*) AS task_count
  FROM "Task"
  GROUP BY "level_target"
  ORDER BY 1;

SELECT unnest("error_targets") AS err, COUNT(*) AS task_count
  FROM "Task"
  GROUP BY 1
  ORDER BY 2 DESC;
