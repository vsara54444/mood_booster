const { callClaude } = require('./anthropicClient');
const { parseJsonResponse } = require('./jsonUtils');
const { CATEGORY_LABELS } = require('./humorStyles');

const SLOT_NAMES = ['subject', 'object', 'event', 'detail'];
const ATTEMPTS = 2;

// Fixed taxonomy so subcategory reliably groups worries for the humor
// library's DB filter (humorRepository.js) instead of fragmenting into
// endless free-text variants that never match each other.
const SUBCATEGORIES = [
  'work', 'family', 'relationships', 'pets', 'health', 'commute',
  'technology', 'finance', 'chores', 'social', 'studies', 'sleep',
  'food', 'weather', 'general',
];

// Single Claude call that both cleans the entry (as before) and classifies
// it for the reusable humor library (humorService.js): subcategory/emotion/
// topicKeywords are used to search `humors` for a close-enough existing
// joke before ever calling a writer AI - see humorRepository.findSuitableHumor.
async function cleanAndExtractSlots(rawText, category) {
  const system = `You clean up short daily journal entries and classify them for a humor-matching engine.
Fix grammar and spelling. Make "cleanedText" concise (1-2 sentences, under 40 words). Preserve every real detail and emotional tone - especially concrete nouns (names, places, objects, numbers, times). Never invent new facts, and never smooth a specific detail into a vaguer generic one.
Assign a short "topicTag" (1-2 words, lowercase, e.g. "meetings", "commute", "parenting", "chores").
Assign "subcategory" as EXACTLY one of: ${SUBCATEGORIES.join(', ')}.
Assign "emotion" as one short word for the specific feeling behind it (e.g. "embarrassed", "overwhelmed", "irritated", "nostalgic", "relieved") - more specific than the mood category alone.
Assign "topicKeywords": up to 5 short lowercase English keywords/phrases capturing what this is actually about (e.g. ["cat","coffee mug","video call"]).
Also extract, in ENGLISH, up to four short slot values (2-5 words each) pulled directly from the story, or null if genuinely absent:
- "subject": the specific person/animal/thing that caused or drove the moment (e.g. "the cat", "my manager", "the traffic")
- "object": the specific thing/person affected or targeted (e.g. "my coffee mug", "the report")
- "event": the specific situational context, time, or occasion (e.g. "9am standup", "the family dinner")
- "detail": any other standout concrete noun, number, or moment worth calling out
Never invent a slot value that isn't actually in the story - use null instead.
Respond ONLY with JSON: {"cleanedText": "...", "topicTag": "...", "subcategory": "...", "emotion": "...", "topicKeywords": ["...", "..."], "slots": {"subject": "..."|null, "object": "..."|null, "event": "..."|null, "detail": "..."|null}}`;

  let lastErr;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const raw = await callClaude({
        system,
        messages: [{ role: 'user', content: `Category: ${CATEGORY_LABELS[category] || category}\nEntry: ${rawText}` }],
        maxTokens: 350,
        temperature: 0.3,
      });
      const parsed = parseJsonResponse(raw);
      const slots = {};
      for (const name of SLOT_NAMES) {
        const value = parsed.slots?.[name];
        slots[name] = typeof value === 'string' && value.trim() ? value.trim() : null;
      }
      const subcategory = SUBCATEGORIES.includes(parsed.subcategory) ? parsed.subcategory : 'general';
      const topicKeywords = Array.isArray(parsed.topicKeywords)
        ? parsed.topicKeywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean).slice(0, 5)
        : [];
      return {
        cleanedText: parsed.cleanedText.trim(),
        topicTag: (parsed.topicTag || 'general').toLowerCase().trim(),
        subcategory,
        emotion: typeof parsed.emotion === 'string' && parsed.emotion.trim() ? parsed.emotion.toLowerCase().trim() : null,
        topicKeywords,
        slots,
      };
    } catch (err) {
      lastErr = err;
      console.error(`[slotExtraction] attempt ${attempt} failed:`, err.message);
    }
  }
  throw lastErr;
}

module.exports = { cleanAndExtractSlots, SLOT_NAMES, SUBCATEGORIES };
