-- GIN indexes for capability containment queries on the words table.
-- The core selection query is "WHERE errors_possible @> ARRAY['C1']" (and the
-- same for skills_possible / task_types_possible). Separate migration from the
-- column add so it's independently reversible.
CREATE INDEX "words_skills_possible_idx"     ON "words" USING GIN ("skills_possible");
CREATE INDEX "words_errors_possible_idx"     ON "words" USING GIN ("errors_possible");
CREATE INDEX "words_task_types_possible_idx" ON "words" USING GIN ("task_types_possible");
