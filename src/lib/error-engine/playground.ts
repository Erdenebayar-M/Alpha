/**
 * Interactive playground — run with:
 *   npx ts-node src/lib/error-engine/playground.ts
 *
 * Edit the examples at the bottom to try your own words/sentences.
 */

import { checkAnswer, checkSentence } from './answer-checker';
import { classifyWordErrors, classifySentenceErrors, calculateScore } from './error-classifier';

// ─── Word-level demo ─────────────────────────────────────────────────────────

function tryWord(expected: string, actual: string, label?: string) {
  console.log('\n' + '─'.repeat(50));
  console.log(`${label ?? 'Word'}: expected="${expected}"  actual="${actual}"`);

  const diff = checkAnswer(expected, actual);
  const errors = classifyWordErrors(diff, expected, actual);
  const score = calculateScore(errors);

  console.log(`  isCorrect   : ${diff.isCorrect}`);
  console.log(`  editDistance: ${diff.editDistance}`);
  console.log(`  score       : ${score}`);

  if (diff.missingChars.length)   console.log(`  missingChars: ${JSON.stringify(diff.missingChars)}`);
  if (diff.extraChars.length)     console.log(`  extraChars  : ${JSON.stringify(diff.extraChars)}`);
  if (diff.wrongChars.length)     console.log(`  wrongChars  : ${JSON.stringify(diff.wrongChars)}`);
  if (diff.transpositions.length) console.log(`  transpos.   : ${JSON.stringify(diff.transpositions)}`);

  if (errors.length) {
    console.log('  errors:');
    for (const e of errors) {
      console.log(`    [${e.errorCode}] sev=${e.severity} pos=${e.position}  ${e.message}`);
    }
  } else {
    console.log('  errors: none');
  }
}

// ─── Sentence-level demo ─────────────────────────────────────────────────────

function trySentence(expected: string, actual: string, label?: string) {
  console.log('\n' + '─'.repeat(50));
  console.log(`${label ?? 'Sentence'}: expected="${expected}"  actual="${actual}"`);

  const sentDiff = checkSentence(expected, actual);
  const errors = classifySentenceErrors(sentDiff);
  const score = calculateScore(errors);

  console.log(`  score: ${score}`);

  if (errors.length) {
    console.log('  errors:');
    for (const e of errors) {
      console.log(`    [${e.errorCode}] sev=${e.severity}  ${e.message}`);
    }
  } else {
    console.log('  errors: none — Зөв бичлээ!');
  }
}

// ─── Examples — edit these freely ────────────────────────────────────────────

console.log('\n=== B1: character omission ===');
tryWord('ном',  'нм');
tryWord('гэр',  'гр');
tryWord('морь', 'мрь');

console.log('\n=== C1: long vowel omission ===');
tryWord('тогоо',    'того');
tryWord('хоол',     'хол');
tryWord('сүү',      'сү');
tryWord('харандаа', 'харанда');

console.log('\n=== C2: long vowel excess ===');
tryWord('цас', 'цаас');
tryWord('ном',  'ноом');

console.log('\n=== C4: reduced vowel omission ===');
tryWord('дэвтэр', 'дэвтр');
tryWord('газар',  'газр');
tryWord('байшин', 'байшн');

console.log('\n=== D3: confusable consonants ===');
tryWord('гэр', 'кэр');
tryWord('нар', 'мар');
tryWord('цас', 'цаз');

console.log('\n=== B3: transposition ===');
tryWord('ном',  'нмо');
tryWord('алим', 'алми');

console.log('\n=== Sentence level ===');
trySentence('Бат ирлээ.', 'бат ирлээ',  'G1+G2');
trySentence('Би явна.',   'Би явна',     'G2 only');
trySentence('Би явна.',   'Би явна.',    'correct');

console.log('\n');
