// Live (request-time) joke writer - only called on a humor-library cache
// miss (see humorService.js). Unlike templateAuthoring.js's offline batch
// writer, this bakes the real story details directly into the line instead
// of writing a reusable {subject}/{object}/{event}/{detail} template, since
// the result gets stored as a finished joke in `humors` and reused later by
// EMBEDDING similarity on the worry itself, not by refilling placeholders.
//
// Never sourced from or imitating a specific book/author's actual wording -
// only the high-level style descriptions in humorStyles.js (comedian
// techniques, tone) feed the prompt. See humorStyles.js top-of-file note.

const { availableProviders } = require('./providers');
const { callClaude } = require('./anthropicClient');
const { callOpenAI } = require('./openaiClient');
const { CATEGORY_LABELS, connectionBlock, LOCAL_LANGUAGE_STYLES, TAMIL_MECHANISMS } = require('./humorStyles');

const CANDIDATES_PER_PROVIDER = 2;

const VOICE_GUARDRAIL = `VOICE: Write this as natural spoken Tamil humor. Do not translate an English joke into Tamil - think in Tamil first. Use Tamil cultural context, deadpan delivery, unexpected observations, exaggeration, and conversational timing, the way a clever Tamil friend would spontaneously riff on the story out loud. Avoid generic AI humor, emojis, motivational language, and obvious telegraphed punchlines. Use plain, everyday spoken Tamil that any Tamil speaker easily understands - never literary/written-Tamil vocabulary, formal passive verb forms, or essay-like phrasing (if it sounds like something printed in a newspaper rather than said out loud, rewrite it in plainer words).`;

function tamilBody(mechanism) {
  const m = TAMIL_MECHANISMS[mechanism] || TAMIL_MECHANISMS.escalation;
  return `${VOICE_GUARDRAIL}

1. "humor": one line IN TAMIL SCRIPT (தமிழ் எழுத்துக்களில்), colloquial spoken Tamil, PERFORMED like an actual comedy-scene beat: ${m.instruction} Never quote real movie dialogue verbatim - write an original line performed in that exact comic style. Bake the story's real details directly into the line - do not use placeholders. Max ~30 words.
2. "perspective": one short reframe IN ENGLISH (max 20 words), genuinely warm and helpful, never a generic platitude or toxic positivity.
3. "action": one concrete small next step IN ENGLISH (max 16 words).
4. "song": OPTIONAL. Only if a well-known Tamil movie song genuinely fits, name it as "🎵 <song title> - <movie name>". Otherwise null. Most should NOT have one.`;
}

function localLanguageBody(motherTongue) {
  const s = LOCAL_LANGUAGE_STYLES[motherTongue];
  return `1. "humor": one line written IN ${s.colloquial}, PERFORMED like an actual beat from a ${s.audience} comedy movie scene, not typed like a plain text message. Use ${s.comedy} - specifically: ${s.mechanism}. Naming the comedian or a well-known meme phrase (e.g. ${s.meme}) directly in the line is encouraged whenever it sharpens the punch. Never quote real movie dialogue verbatim. Bake the story's real details directly into the line - do not use placeholders. Max ~30 words.
2. "perspective": one short reframe IN ENGLISH (max 20 words), genuinely warm and helpful, never a generic platitude or toxic positivity.
3. "action": one concrete small next step IN ENGLISH (max 16 words).
4. "song": OPTIONAL. Only if a well-known ${s.songCulture} genuinely fits, name it as "🎵 <song title> - <movie name>". Otherwise null. Most should NOT have one.`;
}

function defaultBody() {
  return `${VOICE_GUARDRAIL}

1. "humor": one line written IN TAMIL SCRIPT (தமிழ் எழுத்துக்களில்), PERFORMED like an actual beat from a Tamil comedy movie scene: build a normal-sounding setup, then snap hard into Vadivelu-style big dramatic over-the-top despair about a small everyday thing. Naming Vadivelu or a well-known meme phrase directly in the line is encouraged whenever it sharpens the punch. Bake the story's real details directly into the line - do not use placeholders. Max ~25 Tamil words. Do not quote real movie dialogue verbatim.
2. "perspective": one short reframe IN ENGLISH (max 20 words), genuinely warm and helpful.
3. "action": one concrete small next step IN ENGLISH (max 16 words).
4. "song": leave null.`;
}

function favoritesLine(favorites) {
  const comedian = favorites?.find((f) => f.label === 'Favorite Comedian')?.values?.[0];
  const musician = favorites?.find((f) => f.label === 'Favorite Musician')?.values?.[0];
  if (!comedian && !musician) return '';
  const bits = [comedian && `favorite comedian is ${comedian}`, musician && `favorite musician is ${musician}`].filter(Boolean);
  return `\nThis user's ${bits.join(' and ')} - you may reference them by name (or pick a song of theirs) when it genuinely fits, but don't force it every time.`;
}

function buildWriterPrompt({ category, motherTongue, mechanism, worry, favorites }) {
  let body;
  let karmaExamples;
  if (motherTongue === 'tamil') {
    body = tamilBody(mechanism);
    karmaExamples = '"என் கர்மமே", "ஏன் எனக்கு மட்டும்", "என் தலைவிதி"';
  } else if (LOCAL_LANGUAGE_STYLES[motherTongue]) {
    body = localLanguageBody(motherTongue);
    karmaExamples = LOCAL_LANGUAGE_STYLES[motherTongue].karma;
  } else {
    body = defaultBody();
    karmaExamples = '"என் கர்மமே", "ஏன் எனக்கு மட்டும்", "என் தலைவிதி"';
  }

  const details = ['subject', 'object', 'event', 'detail']
    .map((k) => worry.slots?.[k])
    .filter(Boolean)
    .join(', ');

  return `You are the comedy writer for MoodBooster - a daily stress-relief app. You are writing for ONE real user's ONE specific story right now, not a reusable template.

${body}

${connectionBlock(category, karmaExamples)}

The user's story (already cleaned): "${worry.cleanedText}"
Concrete details to anchor on: ${details || 'none extracted - work from the story text itself'}${favoritesLine(favorites)}

Write ${CANDIDATES_PER_PROVIDER} DISTINCT takes on this exact story - vary the comedic angle so they don't feel repetitive of each other.

Respond ONLY with a JSON array, one object per take:
[{"humor": "...", "perspective": "...", "action": "...", "song": "..." or null}]`;
}

function parseJsonArray(raw) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw err;
  }
}

async function generateCandidates({ category, motherTongue, mechanism, worry, favorites }) {
  const providers = availableProviders();
  if (!providers.length) {
    throw new Error('No AI providers configured (check API keys in backend/.env).');
  }
  const system = buildWriterPrompt({ category, motherTongue, mechanism, worry, favorites });
  const settled = await Promise.allSettled(
    providers.map((p) => p.call({
      system,
      messages: [{ role: 'user', content: 'Write it now.' }],
      maxTokens: 400 * CANDIDATES_PER_PROVIDER,
      temperature: 1,
    }))
  );

  const candidates = [];
  settled.forEach((outcome, i) => {
    const provider = providers[i];
    if (outcome.status !== 'fulfilled') {
      console.error(`[freshHumorWriter] provider ${provider.key} failed:`, outcome.reason?.message || outcome.reason);
      return;
    }
    try {
      const parsed = parseJsonArray(outcome.value);
      for (const item of parsed) {
        candidates.push({
          provider: provider.key,
          humor: String(item.humor || '').trim(),
          perspective: String(item.perspective || '').trim(),
          action: String(item.action || '').trim(),
          song: item.song ? String(item.song).trim() : null,
        });
      }
    } catch (err) {
      console.error(`[freshHumorWriter] provider ${provider.key} returned unparseable response:`, err.message);
    }
  });
  return candidates.filter((c) => c.humor && c.perspective && c.action);
}

function buildJudgePrompt(category, candidates) {
  const list = candidates
    .map((c, i) => `Candidate ${i}: ${JSON.stringify({ humor: c.humor, perspective: c.perspective, action: c.action })}`)
    .join('\n');
  return `You are the head comedy writer for MoodBooster, self-reviewing jokes written for a real user's specific story before they're shown. There is no human review after this - be a strict, honest gatekeeper.

For EACH candidate, judge whether it would genuinely make this specific user smile or laugh - not just "technically fine on paper". Reject anything that: is flat / not actually funny, could read as mocking the user rather than the situation, is inappropriate for a general audience, sounds like a generic AI-written line rather than something a clever friend would spontaneously say, or doesn't actually reference the specific details of their story.

Category: ${CATEGORY_LABELS[category] || category}

${list}

Respond ONLY with a JSON array covering every candidate listed, same order: [{"index": <int>, "approve": true|false, "score": 0-10}]`;
}

async function runJudge(callFn, label, category, candidates) {
  if (!candidates.length) return [];
  const system = buildJudgePrompt(category, candidates);
  try {
    const raw = await callFn({
      system,
      messages: [{ role: 'user', content: 'Judge the batch now.' }],
      maxTokens: 200 + candidates.length * 40,
      temperature: 0,
    });
    const parsed = parseJsonArray(raw);
    const byIndex = new Map(parsed.map((p) => [Number(p.index), p]));
    return candidates.map((_, i) => {
      const v = byIndex.get(i);
      return v ? { approve: !!v.approve, score: Number(v.score) || 0 } : { approve: false, score: 0 };
    });
  } catch (err) {
    console.error(`[freshHumorWriter] ${label} judging failed, rejecting batch for this judge:`, err.message);
    return candidates.map(() => ({ approve: false, score: 0 }));
  }
}

async function judgeCandidates(category, candidates) {
  const claudeVerdicts = await runJudge(callClaude, 'Claude', category, candidates);
  const openaiVerdicts = process.env.OPENAI_API_KEY
    ? await runJudge(callOpenAI, 'OpenAI', category, candidates)
    : null;
  return candidates.map((_, i) => {
    const c = claudeVerdicts[i];
    const o = openaiVerdicts ? openaiVerdicts[i] : null;
    return { approve: o ? c.approve && o.approve : c.approve, score: o ? (c.score + o.score) / 2 : c.score };
  });
}

// Unlike the offline batch pipeline (which is allowed to reject an entire
// batch and just author again later), a live request needs SOMETHING to
// show the user right now. Prefer a candidate every configured judge
// approved; if none clears that bar (e.g. a judge provider is down), fall
// back to the single best-scored candidate rather than failing the request.
async function generateFreshHumor({ category, motherTongue, mechanism, worry, favorites }) {
  const candidates = await generateCandidates({ category, motherTongue, mechanism, worry, favorites });
  if (!candidates.length) {
    throw new Error(`All AI providers failed to write a joke for category "${category}" / language "${motherTongue}".`);
  }

  const verdicts = await judgeCandidates(category, candidates);
  const scored = candidates.map((c, i) => ({ c, v: verdicts[i] })).sort((a, b) => b.v.score - a.v.score);
  const winner = scored.find((e) => e.v.approve) || scored[0];

  return {
    humor: winner.c.humor,
    perspective: winner.c.perspective,
    action: winner.c.action,
    song: winner.c.song,
    provider: winner.c.provider,
    mechanism: mechanism || null,
    qualityScore: winner.v.score,
  };
}

module.exports = { generateFreshHumor };
