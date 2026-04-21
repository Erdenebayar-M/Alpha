## Track 1 — Human recording (dictation audio)

0 files currently. These MUST be human-recorded because the child learns spelling
from what they hear. No TTS is acceptable for dictation.

Track 1 will grow when TT4_DICTATION, TT5_MINI_TEXT, or TT1_CHOICE (audio_trigger=true)
tasks are added to `validated/`. Re-run `audioPlan.ts` to regenerate the script.

Checklist for recording:
- Quiet room, any decent microphone (phone is fine for MVP)
- Speak at a natural Mongolian pace — not too slow, not rushed
- For dictation words: 1 second gap between each word
- For sentences: comfortable speed for a 7-year-old listener
- Save as WAV or MP3, mono preferred
- Filename must match exactly: `dict_{task_id}.mp3` or `audio_{task_id}.mp3`
- Place finished files in: `content-pipeline/audio/human/`

Total estimated recording time: ~0 minutes active speaking (no tasks yet)

## Track 2 — Gemini TTS (instruction audio)

32 files. Run:

```
npx tsx content-pipeline/scripts/generateTts.ts
```

**Prerequisites:** Add `GEMINI_API_KEY=AIza...` to `.env` first.
Get a free key at https://aistudio.google.com

Estimated cost: ~$0.10 (at avg 5s/file)

### Test one file first

```
npx tsx content-pipeline/scripts/generateTts.ts --only "G12-009"
```

Listen to `content-pipeline/audio/tts/prompt_G12-009-v1.wav` and confirm
Mongolian sounds natural before running the full batch.

## After both tracks are done

1. Copy human recordings to `public/audio/`
2. Run `convertToMp3.ps1` (Windows) to convert TTS .wav → .mp3:
   ```
   .\content-pipeline\scripts\convertToMp3.ps1
   ```
3. Update `audio_url` in DB: `/audio/{filename}`
