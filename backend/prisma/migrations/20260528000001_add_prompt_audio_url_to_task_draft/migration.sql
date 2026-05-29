-- Add prompt_audio_url to task_drafts for storing instruction/prompt audio separately from word dictation audio
ALTER TABLE "task_drafts" ADD COLUMN "prompt_audio_url" TEXT;
