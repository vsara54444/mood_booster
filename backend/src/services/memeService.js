/**
 * Picks a well-known meme template and writes short top/bottom captions for
 * a journal entry, using Claude. Template-based instead of freeform AI image
 * generation - far more reliable than asking an image model to "draw" a joke.
 */
const { callClaude, parseJsonResponse } = require('./anthropicClient');

// Popular, general-audience-safe, 2-text-box templates with stable Imgflip ids.
const ENGLISH_TEMPLATES = [
  { id: '181913649', name: 'Drake Hotline Bling', useCase: 'rejecting one thing in favor of a funnier/better alternative' },
  { id: '87743020', name: 'Two Buttons', useCase: 'a sweaty, anxious choice between two options' },
  { id: '61579', name: 'One Does Not Simply', useCase: 'something that sounds easy but is actually hard' },
  { id: '4087833', name: 'Waiting Skeleton', useCase: 'waiting a long, long time for something' },
  { id: '55311130', name: 'This Is Fine', useCase: 'pretending everything is okay while it clearly is not' },
];

// Real Vadivelu (Tamil comedian) film-still templates from Imgflip's community
// library - verified to render correctly with caption_image.
const TAMIL_TEMPLATES = [
  { id: '62189651', name: 'Vadivelu Thinking', useCase: 'confused, cannot figure something out' },
  { id: '66187319', name: 'Vadivelu Binocular', useCase: 'still searching for something you cannot find' },
  { id: '363760658', name: 'All Knowing Vadivelu', useCase: 'a smug "told you so" moment' },
  { id: '127435037', name: 'Vadivelu you go man why me', useCase: 'an unfair situation, blaming bad luck' },
  { id: '127745157', name: 'vadivelu sentiment', useCase: 'a bittersweet, comforting moment' },
  { id: '101731240', name: 'Vadivelu Thank you', useCase: 'sarcastic or backhanded gratitude' },
];

// Real Brahmanandam (Telugu comedian) film-still templates from Imgflip's
// community library - verified to render correctly with caption_image.
const TELUGU_TEMPLATES = [
  { id: '526514050', name: 'Brahmanandam meme', useCase: 'an unfair situation, blaming bad luck' },
  { id: '165006854', name: 'brahmanandam bhajana paata', useCase: 'confused, cannot figure something out' },
  { id: '545632731', name: 'Brahmi king movie', useCase: 'an awkward or cringe-worthy situation' },
  { id: '334618178', name: 'Brahmi Adhurs', useCase: 'quiet irritation building up' },
  { id: '525789678', name: 'Son of satyamurthy bhramanandam meme', useCase: 'chaotic group drama or argument' },
];

// Language-specific template sets + caption instructions. Imgflip's caption
// renderer (Impact font) has no glyphs for Indic scripts - native script comes
// out as tofu boxes - so every local language is captioned in its Latin-letter
// colloquial form (e.g. Tanglish for Tamil), matching aiService.js's per-language
// humor style. Languages without a curated comedian template set yet fall back
// to the generic English templates rather than being mismatched into Tamil.
const LOCAL_MEME_STYLES = {
  tamil: {
    templates: TAMIL_TEMPLATES,
    languageInstruction: 'Write both captions in TANGLISH (Tamil colloquial speech spelled out in English/Latin letters, ' +
      "the way Tamil speakers actually text each other - NOT Tamil script, since the meme renderer can't " +
      'display Tamil Unicode glyphs). Keep the same casual, exaggerated Vadivelu-style comic tone.',
  },
  telugu: {
    templates: TELUGU_TEMPLATES,
    languageInstruction: 'Write both captions in TENGLISH (Telugu colloquial speech spelled out in English/Latin letters, ' +
      "the way Telugu speakers actually text each other - NOT Telugu script, since the meme renderer can't " +
      'display Telugu Unicode glyphs). Keep the same casual, exaggerated Brahmanandam-style comic tone.',
  },
};

// excludeTemplateIds: templates this user was recently shown (see
// routes/entries.js) - removed from the candidate list entirely rather than
// just asked to avoid, since Claude reliably defaults to "This Is Fine"
// regardless of the actual situation when given a free choice (verified:
// 6 completely different scenarios all picked it). An excluded template
// can't be picked if it was never offered.
async function generateMemeCaption(scenario, humorText, motherTongue, excludeTemplateIds = []) {
  const style = LOCAL_MEME_STYLES[motherTongue];
  const fullTemplateSet = style ? style.templates : ENGLISH_TEMPLATES;
  const languageInstruction = style ? style.languageInstruction : 'Write both captions in English.';

  const filtered = fullTemplateSet.filter((t) => !excludeTemplateIds.includes(t.id));
  // Never filter down to nothing - if every template was recently used
  // (small template sets), fall back to the full set rather than erroring.
  const templates = filtered.length ? filtered : fullTemplateSet;

  const system = `You are a meme caption writer for a mood-journaling app. Given a short everyday ` +
    `situation and a joke someone made about it, pick the single best-fitting meme template from this ` +
    `list and write short, punchy captions (max 8 words each) that turn the situation into that meme. ` +
    `${languageInstruction}\n` +
    templates.map((t) => `- "${t.name}" (id: ${t.id}) - best for ${t.useCase}`).join('\n') +
    `\nRespond ONLY with JSON: {"templateId": "one of the ids above", "text0": "...", "text1": "..."}`;

  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: `Situation: ${scenario}\nJoke about it: ${humorText}` }],
    maxTokens: 150,
    temperature: 0.7,
  });
  return parseJsonResponse(raw);
}

module.exports = { generateMemeCaption, ENGLISH_TEMPLATES, TAMIL_TEMPLATES, TELUGU_TEMPLATES };
