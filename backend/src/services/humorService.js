// Orchestrates the reusable humor library's 4-level lookup cascade - each
// level is strictly more expensive than the last, and the first one that
// produces a hit wins:
//   LEVEL 1 - exact/normalized worry match (no API call at all)
//   LEVEL 2 - category + subcategory + language (narrows the candidate set)
//   LEVEL 3 - keyword/semantic/vector similarity (1 Gemini embed call, ranks
//             within the Level 2 candidate set)
//   LEVEL 4 - only on a miss at every level above: call Claude/Groq
//             (freshHumorWriter.js) and store the result so the next
//             similar worry reuses it instead of calling an AI again.
// This is what makes the system get MORE useful and LESS API-dependent over
// time. See humorRepository.js for the actual Level 1/2+3 queries.

const { cleanAndExtractSlots } = require('./slotExtraction');
const { embedText } = require('./geminiEmbeddingClient');
const { findExactWorryMatch, findSuitableHumor, storeHumor, recordHumorUsage } = require('./humorRepository');
const { generateFreshHumor } = require('./freshHumorWriter');

function embeddingInputFor(classification) {
  const keywords = (classification.topicKeywords || []).join(' ');
  return `${classification.cleanedText} ${keywords}`.trim();
}

function fromStoredHumor(row) {
  return {
    humor: row.humor_text,
    perspective: row.perspective_text,
    action: row.action_text,
    song: row.song_text,
    provider: 'reused',
    mechanism: row.humor_style,
    humorId: row.id,
  };
}

async function resolveHumor(pool, { userId, category, motherTongue, mechanism, classification, favorites }) {
  const subcategory = classification.subcategory;

  // LEVEL 1
  let outcome = null;
  const exactMatch = await findExactWorryMatch(pool, {
    userId, motherTongue, category, subcategory, mechanism, cleanedText: classification.cleanedText,
  });
  if (exactMatch) outcome = fromStoredHumor(exactMatch);

  // LEVEL 2 + LEVEL 3 (only reached on a Level 1 miss)
  if (!outcome) {
    const embedding = await embedText(embeddingInputFor(classification));
    const semanticMatch = await findSuitableHumor(pool, { userId, motherTongue, category, subcategory, mechanism, embedding });

    if (semanticMatch) {
      outcome = fromStoredHumor(semanticMatch);
    } else {
      // LEVEL 4 - nothing close enough anywhere in the library.
      const generated = await generateFreshHumor({ category, motherTongue, mechanism, worry: classification, favorites });
      const humorId = await storeHumor(pool, {
        motherTongue,
        category,
        subcategory,
        emotion: classification.emotion,
        mechanism: generated.mechanism,
        topicKeywords: classification.topicKeywords,
        worryText: classification.cleanedText,
        humorText: generated.humor,
        perspectiveText: generated.perspective,
        actionText: generated.action,
        songText: generated.song,
        embedding,
        qualityScore: generated.qualityScore,
        generationModel: generated.provider,
      });
      outcome = { ...generated, humorId };
    }
  }

  await recordHumorUsage(pool, { userId, humorId: outcome.humorId });
  return outcome;
}

// Entry point for a brand-new daily entry - runs classification from raw text.
async function getHumorForWorry(pool, { userId, rawText, category, motherTongue, mechanism, favorites }) {
  const classification = await cleanAndExtractSlots(rawText, category);
  const outcome = await resolveHumor(pool, { userId, category, motherTongue, mechanism, classification, favorites });

  return {
    cleanedText: classification.cleanedText,
    topicTag: classification.topicTag,
    subcategory: classification.subcategory,
    emotion: classification.emotion,
    topicKeywords: classification.topicKeywords,
    slots: classification.slots,
    ...outcome,
  };
}

// "Try a different joke" for an existing entry - reuses the classification
// already stored on that entry (no extra Claude call needed), and the
// per-user recent-history exclusion in findSuitableHumor naturally keeps
// this from immediately re-serving the joke just shown.
async function regenerateHumor(pool, { userId, category, motherTongue, mechanism, classification, favorites }) {
  return resolveHumor(pool, { userId, category, motherTongue, mechanism, classification, favorites });
}

module.exports = { getHumorForWorry, regenerateHumor };
