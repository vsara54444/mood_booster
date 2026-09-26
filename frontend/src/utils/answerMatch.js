// Local (no network/API call) answer checking for the Boost page's puzzle and
// song-guess games. The correct answer is already in hand once the reveal
// response arrives - this just compares it to what the user typed instead of
// silently accepting any non-empty input.

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accent diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation - \p{L}/\p{N} are unicode-aware, so Tamil/Telugu script survives
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(normA, normB) {
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  const dist = levenshtein(normA, normB);
  return 1 - dist / Math.max(normA.length, normB.length);
}

// Obvious placeholder/keyboard-mash answers - typing one of these should
// never count as a real attempt, regardless of what the actual answer is.
const JUNK_ANSWERS = new Set(['abc', 'abcd', 'asdf', 'asdfgh', 'qwerty', 'test', 'testing', 'xyz', 'idk', 'na', 'none', 'x', '123', '1234']);

// Blocks the "type one throwaway character/word, tap reveal" pattern before
// the user even gets to the answer - not a correctness check, just a floor
// for what counts as a genuine attempt.
export function isJunkGuess(guess) {
  const n = normalize(guess);
  return n.length < 2 || JUNK_ANSWERS.has(n);
}

// Typo-tolerant correctness check: exact match, one string meaningfully
// containing the other (handles "42" vs "the answer is 42", or a partial
// song title), or a generous edit-distance similarity for spelling/
// transliteration variance (song titles especially - Tamil/Telugu
// transliteration spelling is inconsistent even among native speakers).
export function checkAnswer(guess, correctAnswer) {
  const ng = normalize(guess);
  const nc = normalize(correctAnswer);
  if (!ng || !nc) return false;
  if (ng === nc) return true;

  // Whole-word containment handles short answers like "42" showing up inside
  // a full-sentence guess ("the answer is 42") - a raw substring check alone
  // would also match "42" against something unrelated like "1421", so this
  // only counts a match when it's a standalone word on either side.
  const guessWords = ng.split(' ');
  const correctWords = nc.split(' ');
  if (guessWords.includes(nc) || correctWords.includes(ng)) return true;

  if (nc.length >= 3 && (ng.includes(nc) || nc.includes(ng))) return true;
  return similarity(ng, nc) >= 0.72;
}
