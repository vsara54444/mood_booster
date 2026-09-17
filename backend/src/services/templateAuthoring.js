// Offline batch generation + AI self-filter for the curated joke_templates
// table. Run via scripts/generateJokeTemplates.js - never called from the
// request path (see aiService.js, which only reads approved templates).

const { callClaude } = require('./anthropicClient');
const { callOpenAI } = require('./openaiClient');
const { availableProviders } = require('./providers');
const { CATEGORY_LABELS, TONE_BY_CATEGORY, connectionBlock, LOCAL_LANGUAGE_STYLES, TAMIL_MECHANISMS } = require('./humorStyles');
const { normalizedTokenString, scoreAgainstHistory } = require('./similarityService');

const STORY_SLOT_NAMES = ['subject', 'object', 'event', 'detail'];
const PLACEHOLDER_RE = /\{(\w+)\}/g;
const DEDUPE_THRESHOLD = parseFloat(process.env.JOKE_SIMILARITY_THRESHOLD || '0.55');
const DEFAULT_TOP_N = 3;

function parseJsonArray(raw) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw err;
  }
}

const TEMPLATE_INSTRUCTIONS = `Instead of reacting to one fixed story, you are writing a REUSABLE JOKE TEMPLATE that a template engine will later fill in with a real user's own story details. Use ONLY these placeholders, and only the ones this particular joke's structure actually needs (most templates should use 2-3, never invent other placeholder names):
- {subject} - the person/animal/thing that caused or drove the moment
- {object} - the thing/person affected or targeted
- {event} - the situational context, time, or occasion
- {detail} - any other standout concrete noun or number
Every placeholder you use in ANY field MUST also be listed in "requiredSlots" for that template.`;

function tamilInstructions(mechanism) {
  const m = TAMIL_MECHANISMS[mechanism] || TAMIL_MECHANISMS.escalation;
  return `VOICE: Write this as natural spoken Tamil humor. Do not translate an English joke into Tamil - think in Tamil first. Use Tamil cultural context, deadpan delivery, unexpected observations, exaggeration, and conversational timing, the way a clever Tamil friend would spontaneously riff on the story out loud. Avoid generic AI humor, emojis, motivational language, and obvious telegraphed punchlines. Use plain, everyday spoken Tamil that any Tamil speaker easily understands - never literary/written-Tamil vocabulary, formal passive verb forms, or essay-like phrasing (if it sounds like something printed in a newspaper rather than said out loud, rewrite it in plainer words).

1. "humorTemplate": one line written IN TAMIL SCRIPT (தமிழ் எழுத்துக்களில்), colloquial spoken Tamil, PERFORMED like an actual comedy-scene beat: ${m.instruction} Never quote real movie dialogue verbatim - write an original line performed in that exact comic style. Max ~30 words.
2. "perspectiveTemplate": one short reframe IN ENGLISH (max 20 words), genuinely warm and helpful, never a generic platitude or toxic positivity.
3. "actionTemplate": one concrete small next step IN ENGLISH (max 16 words).
4. "songTemplate": OPTIONAL. Only if a well-known Tamil movie song genuinely fits, name it as "🎵 <song title> - <movie name>" (title/movie only, never lyrics). Otherwise null. Prefer A.R. Rahman when a few options fit equally well, but rotate across his catalog rather than defaulting to the same song every time. Most templates should NOT have one.`;
}

function localLanguageInstructions(motherTongue) {
  const s = LOCAL_LANGUAGE_STYLES[motherTongue];
  return `1. "humorTemplate": one line written IN ${s.colloquial}, PERFORMED like an actual beat from a ${s.audience} comedy movie scene, not typed like a plain text message. Use ${s.comedy} - specifically: ${s.mechanism}. Naming the comedian or a well-known meme phrase (e.g. ${s.meme}) directly in the line is encouraged whenever it sharpens the punch. Never quote real movie dialogue verbatim. Max ~30 words.
2. "perspectiveTemplate": one short reframe IN ENGLISH (max 20 words), genuinely warm and helpful, never a generic platitude or toxic positivity.
3. "actionTemplate": one concrete small next step IN ENGLISH (max 16 words).
4. "songTemplate": OPTIONAL. Only if a well-known ${s.songCulture} genuinely fits, name it as "🎵 <song title> - <movie name>" (title/movie only, never lyrics). Otherwise null. Most templates should NOT have one.`;
}

function defaultInstructions() {
  return `VOICE: Write this as natural spoken Tamil humor. Do not translate an English joke into Tamil - think in Tamil first. Use Tamil cultural context, deadpan delivery, unexpected observations, exaggeration, and conversational timing, the way a clever Tamil friend would spontaneously riff on the story out loud. Avoid generic AI humor, emojis, motivational language, and obvious telegraphed punchlines. Use plain, everyday spoken Tamil that any Tamil speaker easily understands - never literary/written-Tamil vocabulary, formal passive verb forms, or essay-like phrasing (if it sounds like something printed in a newspaper rather than said out loud, rewrite it in plainer words).

1. "humorTemplate": one line written IN TAMIL SCRIPT (தமிழ் எழுத்துக்களில்), PERFORMED like an actual beat from a Tamil comedy movie scene: build a normal-sounding setup, then snap hard into Vadivelu-style big dramatic over-the-top despair ("why does this always happen to me", brahmanda-kashtam universe-scale-disaster exaggeration) about a small everyday thing. Naming Vadivelu or a well-known meme phrase directly in the line is encouraged whenever it sharpens the punch. Max ~25 Tamil words. Do not quote real movie dialogue verbatim.
2. "perspectiveTemplate": one short reframe IN ENGLISH (max 20 words), genuinely warm and helpful.
3. "actionTemplate": one concrete small next step IN ENGLISH (max 16 words).
4. "songTemplate": leave null.`;
}

function buildTemplatePrompt({ category, motherTongue, mechanism, count }) {
  let body;
  let karmaExamples;
  if (motherTongue === 'tamil') {
    body = tamilInstructions(mechanism);
    karmaExamples = '"என் கர்மமே", "ஏன் எனக்கு மட்டும்", "என் தலைவிதி"';
  } else if (LOCAL_LANGUAGE_STYLES[motherTongue]) {
    body = localLanguageInstructions(motherTongue);
    karmaExamples = LOCAL_LANGUAGE_STYLES[motherTongue].karma;
  } else {
    body = defaultInstructions();
    karmaExamples = '"என் கர்மமே", "ஏன் எனக்கு மட்டும்", "என் தலைவிதி"';
  }

  return `You are the comedy writer for MoodBooster - a daily stress-relief app. ${TEMPLATE_INSTRUCTIONS}

${body}

${connectionBlock(category, karmaExamples)}

Write ${count} DISTINCT templates for the "${CATEGORY_LABELS[category] || category}" mood category. Vary the everyday scenario, which placeholders each leans on, and the comedic angle so the ${count} templates don't feel repetitive of each other.

Respond ONLY with a JSON array, one object per template:
[{"humorTemplate": "...", "perspectiveTemplate": "...", "actionTemplate": "...", "songTemplate": "..." or null, "requiredSlots": ["subject","event"], "topicTag": "..."}]`;
}

function normalizeCandidate(item, providerKey) {
  return {
    provider: providerKey,
    humorTemplate: String(item.humorTemplate || '').trim(),
    perspectiveTemplate: String(item.perspectiveTemplate || '').trim(),
    actionTemplate: String(item.actionTemplate || '').trim(),
    songTemplate: item.songTemplate ? String(item.songTemplate).trim() : null,
    requiredSlots: Array.isArray(item.requiredSlots) ? item.requiredSlots.filter((s) => STORY_SLOT_NAMES.includes(s)) : [],
    topicTag: (item.topicTag || 'general').toLowerCase().trim(),
  };
}

function extractPlaceholders(text) {
  const found = new Set();
  let m;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(text || ''))) found.add(m[1]);
  return found;
}

// Structural guardrails, checked before spending a judge call: every field
// present, and every {placeholder} actually used is a known slot name that's
// also declared in requiredSlots (so templateSelector's slot-satisfaction
// check can never be fooled by an undeclared placeholder).
function isCandidateStructurallyValid(candidate) {
  if (!candidate.humorTemplate || !candidate.perspectiveTemplate || !candidate.actionTemplate) return false;
  const combined = [candidate.humorTemplate, candidate.perspectiveTemplate, candidate.actionTemplate, candidate.songTemplate || ''].join(' ');
  const used = extractPlaceholders(combined);
  for (const name of used) {
    if (!STORY_SLOT_NAMES.includes(name)) return false;
    if (!candidate.requiredSlots.includes(name)) return false;
  }
  return true;
}

async function generateTemplateCandidates({ category, motherTongue, mechanism, count }) {
  const providers = availableProviders();
  if (!providers.length) {
    throw new Error('No AI providers configured (check API keys in backend/.env).');
  }
  const system = buildTemplatePrompt({ category, motherTongue, mechanism, count });
  const settled = await Promise.allSettled(
    providers.map((p) => p.call({
      system,
      messages: [{ role: 'user', content: `Write ${count} templates now.` }],
      maxTokens: 350 * count,
      temperature: 1,
    }))
  );

  const candidates = [];
  settled.forEach((outcome, i) => {
    const provider = providers[i];
    if (outcome.status !== 'fulfilled') {
      console.error(`[templateAuthoring] provider ${provider.key} failed:`, outcome.reason?.message || outcome.reason);
      return;
    }
    try {
      const parsed = parseJsonArray(outcome.value);
      for (const item of parsed) candidates.push(normalizeCandidate(item, provider.key));
    } catch (err) {
      console.error(`[templateAuthoring] provider ${provider.key} returned unparseable response:`, err.message);
    }
  });
  return candidates;
}

function buildJudgeSystemPrompt(category, candidates) {
  const list = candidates
    .map((c, i) => `Template ${i}: ${JSON.stringify({ humor: c.humorTemplate, perspective: c.perspectiveTemplate, action: c.actionTemplate, requiredSlots: c.requiredSlots })}`)
    .join('\n');
  return `You are the head comedy writer for MoodBooster, self-reviewing a batch of curated JOKE TEMPLATES (each has {subject}/{object}/{event}/{detail} placeholders that will later be filled in with a real user's own story details) before they enter the live joke database. There is no human review after this - you are one of the gates, so be a strict, honest gatekeeper.

For EACH template, judge whether it would still land as genuinely funny once realistic details are substituted for its placeholders - not just "technically fine on paper". Reject anything that: is flat / not actually funny, could read as mocking the user rather than the situation, is inappropriate for a general audience, is a generic line that could be pasted under any story in this category, or has an incoherent setup+twist once you imagine it filled in.

Category: ${CATEGORY_LABELS[category] || category}

${list}

Respond ONLY with a JSON array covering every template listed, same order: [{"index": <int>, "approve": true|false, "score": 0-10}]`;
}

async function runJudge(callFn, label, category, candidates) {
  if (!candidates.length) return [];
  const system = buildJudgeSystemPrompt(category, candidates);
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
      const verdict = byIndex.get(i);
      return verdict ? { approve: !!verdict.approve, score: Number(verdict.score) || 0 } : { approve: false, score: 0 };
    });
  } catch (err) {
    console.error(`[templateAuthoring] ${label} judging failed, rejecting batch for this judge:`, err.message);
    return candidates.map(() => ({ approve: false, score: 0 }));
  }
}

// Dual-judge self-filter: Claude and OpenAI each independently rate every
// candidate. A template only survives if BOTH approve it (the stricter
// gate), and its combined score is the average of the two - this combined
// score is what authorAndStore ranks candidates by to pick the top N. Falls
// back to Claude-only if OPENAI_API_KEY isn't configured, so the pipeline
// still works with a single provider.
async function judgeTemplateBatch(category, candidates) {
  if (!candidates.length) return [];
  const claudeVerdicts = await runJudge(callClaude, 'Claude', category, candidates);
  const openaiVerdicts = process.env.OPENAI_API_KEY
    ? await runJudge(callOpenAI, 'OpenAI', category, candidates)
    : null;

  return candidates.map((_, i) => {
    const c = claudeVerdicts[i];
    const o = openaiVerdicts ? openaiVerdicts[i] : null;
    return {
      approve: o ? c.approve && o.approve : c.approve,
      score: o ? (c.score + o.score) / 2 : c.score,
      claudeScore: c.score,
      openaiScore: o ? o.score : null,
    };
  });
}

// Generates a batch for one (category, motherTongue, mechanism) combo,
// dual-self-judges it, and publishes only the top-ranked `topN` survivors
// (by combined judge score) that also clear the dedupe bar against
// already-approved templates AND siblings already picked in this same pass
// (reusing the live joke-dedupe machinery) - so a large raw batch collapses
// down to a small, curated, non-duplicate set. Every candidate is still
// written to joke_templates with its final status for audit; only
// 'approved' rows are eligible for templateSelector.js.
async function authorAndStore(pool, { category, motherTongue, mechanism = null, count = 6, topN = DEFAULT_TOP_N }) {
  const raw = await generateTemplateCandidates({ category, motherTongue, mechanism, count });
  const structurallyValid = raw.filter(isCandidateStructurallyValid);
  let rejected = raw.length - structurallyValid.length;
  let approved = 0;

  const verdicts = await judgeTemplateBatch(category, structurallyValid);

  const existing = await pool.query(
    `SELECT humor_template, normalized_tokens FROM joke_templates WHERE category = $1 AND mother_tongue = $2 AND status = 'approved'`,
    [category, motherTongue]
  );
  const historyForDedupe = existing.rows.map((r) => ({ joke_text: r.humor_template, normalized_tokens: r.normalized_tokens }));

  const entries = structurallyValid.map((candidate, i) => ({
    candidate,
    verdict: verdicts[i],
    strippedText: candidate.humorTemplate.replace(PLACEHOLDER_RE, ' '),
  }));

  const ranked = entries.filter((e) => e.verdict.approve).sort((a, b) => b.verdict.score - a.verdict.score);
  const approvedSet = new Set();
  for (const e of ranked) {
    if (approvedSet.size >= topN) break;
    const { maxSimilarity } = scoreAgainstHistory(e.strippedText, historyForDedupe);
    if (maxSimilarity <= DEDUPE_THRESHOLD) {
      approvedSet.add(e.candidate);
      historyForDedupe.push({ joke_text: e.strippedText, normalized_tokens: normalizedTokenString(e.strippedText) });
    }
  }

  for (const { candidate, verdict, strippedText } of entries) {
    const status = approvedSet.has(candidate) ? 'approved' : 'rejected';
    const tokens = normalizedTokenString(strippedText);

    await pool.query(
      `INSERT INTO joke_templates
         (category, topic_tag, mother_tongue, mechanism, humor_template, perspective_template, action_template, song_template, required_slots, status, quality_score, normalized_tokens)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [category, candidate.topicTag, motherTongue, mechanism, candidate.humorTemplate, candidate.perspectiveTemplate,
        candidate.actionTemplate, candidate.songTemplate, JSON.stringify(candidate.requiredSlots), status, verdict.score, tokens]
    );

    if (status === 'approved') approved += 1;
    else rejected += 1;
  }

  return { approved, rejected, total: raw.length };
}

module.exports = { authorAndStore, generateTemplateCandidates, judgeTemplateBatch, isCandidateStructurallyValid };
