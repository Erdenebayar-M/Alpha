/**
 * AI quality reviewer for generated task drafts.
 * Sends each draft to the LLM and returns severity + issue list.
 * Called automatically after generation — results stored in ai_review_* columns.
 */

import OpenAI from 'openai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIReviewResult {
  severity: 'ok' | 'minor' | 'blocker';
  issues: string[];
  fix_suggestion: string | null;
}

export interface ReviewableDraft {
  task_type: string;
  grade_band: string[];
  difficulty: number;
  error_targets: string[];
  prompt_text: string;
  correct_answer: string;
  options: unknown;
  feedback_text: string;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const REVIEW_SYSTEM_PROMPT =
  'Чи монгол бага ангийн (1-4-р анги) зөв бичих даалгаврын чанар шалгагч.\n\n' +
  'Даалгаврыг шалгаад дараах JSON хэлбэрт хариул:\n' +
  '{\n' +
  '  "severity": "ok" | "minor" | "blocker",\n' +
  '  "issues": ["асуудал 1", ...],\n' +
  '  "fix_suggestion": "засах санал эсвэл null"\n' +
  '}\n\n' +
  'Severity:\n' +
  '• "ok" — даалгавар бүрэн зөв, хэрэглэхэд бэлэн\n' +
  '• "minor" — жижиг дутагдал бий, хэрэглэж болно\n' +
  '• "blocker" — даалгавар хэрэглэх боломжгүй, заавал засах хэрэгтэй\n\n' +
  'Шалгах зүйлс:\n' +
  '1. Монгол кирилл бичиглэл зөв байна уу (латин үсэг орсон эсэх)\n' +
  '2. correct_answer нь prompt_text-д тохирсон зөв хариулт мөн эсэх\n' +
  '3. task_type-д тохирсон options бүтэц байгаа эсэх:\n' +
  '   • CHOICE: choices массив, нэг л is_correct:true, distractor нь бодит боловч буруу\n' +
  '   • FILL: display_text-д _ байна, blank_answer нь зөв\n' +
  '   • CORRECTION: incorrect_text нь алдаатай, correct_text нь зөв засвар\n' +
  '   • DICTATION: audio_text ба expected_answers нийцэж байна\n' +
  '4. Хүүхдийн насанд тохирсон эсэх (1-4-р ангийн түвшин)\n' +
  '5. feedback_text нь хариултыг тайлбарласан байна уу\n\n' +
  'Зөвхөн JSON буцаа — markdown, тайлбар огт бичихгүй.';

// ─── Client factory ───────────────────────────────────────────────────────────

function makeClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Mongolian Writing App - AI Review',
    },
  });
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function reviewTaskDraft(
  draft: ReviewableDraft,
  apiKey: string,
): Promise<AIReviewResult> {
  const client = makeClient(apiKey);

  const userContent = JSON.stringify(
    {
      task_type:      draft.task_type,
      grade_band:     draft.grade_band,
      difficulty:     draft.difficulty,
      error_targets:  draft.error_targets,
      prompt_text:    draft.prompt_text,
      correct_answer: draft.correct_answer,
      options:        draft.options,
      feedback_text:  draft.feedback_text,
    },
    null,
    2,
  );

  try {
    const response = await client.chat.completions.create({
      model:       'google/gemini-2.5-flash',
      max_tokens:  400,
      temperature: 0.1,
      messages: [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'user',   content: userContent },
      ],
    });

    const text     = response.choices[0]?.message?.content ?? '';
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const start    = stripped.indexOf('{');
    if (start === -1) throw new Error('no JSON in review response');

    const parsed = JSON.parse(stripped.slice(start)) as {
      severity?:       unknown;
      issues?:         unknown;
      fix_suggestion?: unknown;
    };

    const VALID_SEVERITIES = ['ok', 'minor', 'blocker'] as const;
    const severity =
      VALID_SEVERITIES.find((s) => s === parsed.severity) ?? 'minor';
    const issues =
      Array.isArray(parsed.issues) ? parsed.issues.map(String) : [];
    const fix_suggestion =
      typeof parsed.fix_suggestion === 'string' && parsed.fix_suggestion.trim()
        ? parsed.fix_suggestion.trim()
        : null;

    return { severity, issues, fix_suggestion };
  } catch {
    return {
      severity:       'minor',
      issues:         ['AI review could not be completed'],
      fix_suggestion: null,
    };
  }
}
