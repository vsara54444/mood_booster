// Shared emoji-clue prompt for the "Guess the Song" game (Boost page), used
// by seedSongs.js, fixSongClues.js, and rebuildSongsVerified.js so all three
// stay in sync instead of drifting into slightly different clue styles.
//
// Earlier version only translated literal title words into emoji, one-to-one.
// That collapses for abstract/philosophical/Sanskrit-origin titles (e.g.
// "Vedham Anuvilum Oru Naadham" - "the Vedic sound within every atom") into
// generic filler like book+music-note+speaker+music-note, which could match
// almost any devotional song. This version explicitly asks for the kind of
// specific, context-aware clue Vijay TV's "Connexion" segment is known for:
// literal words first, then a closer symbol for abstract words instead of a
// generic one, then movie/scene context to sharpen anything still vague -
// with a self-check against producing an interchangeable mood board.
//
// A later pass (real example: "Aadi Velli" got 🕺🗓️⭐🌙 - dancer was right,
// but "Velli" was read as the abstract Venus/celestial sense and padded out
// to a 4-emoji minimum with a calendar + star + moon that don't connect to
// anything) showed a second failure mode: forcing a fixed emoji count leads
// to decorative padding once the real concepts run out, AND a title word
// with multiple meanings (Velli = silver / Friday / Venus) needs to resolve
// to whichever sense is most concretely drawable, not the most poetic one.
const { availableProviders } = require('./providers');

function buildCluePrompt(listText) {
  return `You know classic Tamil film music AND the films themselves well. For each song below, write an "emojiClue": a SHORT emoji sequence, in the style of Vijay TV's "Connexion" segment - clever, specific picture-clues that together point at ONE song, never a generic mood board.

Follow this priority order:
1. Translate literal key words/nouns from the song's TITLE into emoji wherever there's a clear visual match (e.g. a title meaning "will the flower-breeze return" -> flower + wind + a return/turn-back symbol).
2. If a title word has more than one possible meaning (e.g. Tamil "Velli" can mean silver, Friday, or the planet Venus), pick whichever meaning has the most CONCRETE, directly-drawable symbol (silver -> 🥈/🪙) over a more abstract or poetic one (Venus/celestial), unless the song is specifically about that other meaning.
3. For a title word too abstract to draw directly at all - a philosophical, devotional, or Sanskrit-origin concept like "Vedham" (sacred scripture), "Naadham" (cosmic/divine sound), "Anu" (atom/tiny particle), "Amudham" (nectar) - do NOT fall back to a generic filler (a plain book for anything spiritual, a plain speaker/music-note for anything about sound, a star/moon for anything celestial-adjacent). Instead pick the closest CONCRETE symbol: Vedham/scripture -> 🕉️ or 📜, Naadham/divine sound -> 🔔, an atom -> ⚛️, nectar -> 🍯.
4. Only if the title's own words leave genuine room, ONE extra emoji for the FILM's specific scene/theme (e.g. 💃/🩰 for a classical-dance drama) can sharpen the clue further.

LENGTH: use exactly as many emoji as there are real anchor concepts - most titles need 2-3, some need 4. Do NOT pad a clue with an extra decorative/mood emoji (✨😊💭🌙⭐ used as filler, etc.) just to hit a target count - a tight 2-emoji clue where every emoji connects is better than a 4-emoji one where the last two are guesswork. Every single emoji must be traceable to a specific word in the title or a specific, stated fact about the film - if you can't point to what it's for, cut it.

SPECIFICITY CHECK before finalizing each clue: could this exact emoji sequence just as easily belong to 5 other random songs in Tamil cinema? If yes, it's too generic - fix it before answering.

${listText}

Respond ONLY with a JSON array, same order, one per song: [{"index":0,"emojiClue":"🌸🌬️↩️"}]`;
}

// Tries each configured provider in turn (not hardcoded to Claude) so an
// offline scripts run still works on whichever provider actually has
// credit/quota right now - same pattern as slotExtraction.js.
async function writeCluesForBatch(rows) {
  const providers = availableProviders();
  if (!providers.length) {
    throw new Error('No AI providers configured (check API keys in backend/.env).');
  }
  const list = rows.map((r, i) => `${i}. "${r.song_name}" (${r.movie_name || 'unknown film'})`).join('\n');
  const system = buildCluePrompt(list);

  let lastErr;
  for (const provider of providers) {
    try {
      const raw = await provider.call({
        system,
        messages: [{ role: 'user', content: 'Write them now.' }],
        maxTokens: 150 * rows.length,
        temperature: 0.7,
      });
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      return JSON.parse(start !== -1 ? cleaned.slice(start, end + 1) : cleaned);
    } catch (err) {
      lastErr = err;
      console.error(`[songClueWriter] provider ${provider.key} failed:`, err.message);
    }
  }
  throw lastErr;
}

module.exports = { buildCluePrompt, writeCluesForBatch };
