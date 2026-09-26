// Shared comedic-style constants used by the offline template author
// (templateAuthoring.js) and the live writer (freshHumorWriter.js). Moved
// out of aiService.js so neither side has to duplicate the tone/style rules
// that define MoodBooster's comedic voice.
//
// Copyright note: every style reference below (Vadivelu, Devan's Thuppariyum
// Sambu, Crazy Mohan, etc.) is a hand-written description of a comedic
// TECHNIQUE/voice - never actual excerpted or paraphrased text from a book,
// script, or living author. No book passages are stored or fed into any
// prompt anywhere in this app; every joke_templates/humors row is
// source='ai_generated' original text.

const CATEGORY_LABELS = {
  calm: 'something on their mind while feeling calm',
  frustrated: 'something that frustrated them',
  angry: 'something that made them angry',
  upset: 'something that upset them',
  anxious: 'something that made them anxious',
  stressed: 'something that stressed them out',
  sad: 'something that made them sad',
  tired: 'something that wore them out',
  grateful: 'something they are grateful for',
  funny: 'something funny that happened to them',
};

const TONE_BY_CATEGORY = {
  calm: 'light, playful, low-key - a gentle wink, no big drama',
  frustrated: 'big, escalating, over-the-top comic despair - lean fully into the disaster',
  angry: 'big, escalating, over-the-top comic despair - lean fully into the disaster',
  stressed: 'big, escalating, over-the-top comic despair - lean fully into the disaster',
  upset: 'warm and gentle - wry, self-aware humor that never amplifies the hurt',
  anxious: 'warm and gentle - wry, self-aware humor that never amplifies the hurt',
  sad: 'warm and gentle - wry, self-aware humor that never amplifies the hurt',
  tired: 'warm, a little playful - poke fun at the exhaustion without mocking it',
  grateful: 'light, warm, celebratory',
  funny: 'playful and high-energy, matching their own amusement',
};

// TONE_BY_CATEGORY above is delivery style (how loud, how gentle). This is
// the comedic ENGINE - what the twist should actually be doing with the
// feeling itself, so the mood isn't just flavor text on a joke that's really
// about the event. e.g. for "tired" the joke should be built on exhaustion
// doing something absurd, not just a joke about the day that mentions being tired.
const MOOD_ANGLE = {
  calm: 'make the twist about how little is actually happening - the comedy comes from treating a totally uneventful moment with mock-serious weight, not from inventing drama that was never there.',
  frustrated: 'make the FRUSTRATION itself the exaggerated character in the joke - as if the irritation has a mind of its own and is personally sabotaging them, not just narrate the annoying event.',
  angry: 'make the ANGER itself the exaggerated character in the joke - treat the flash of temper as a comic force with its own agenda, not just narrate what triggered it.',
  stressed: 'make the STRESS itself the exaggerated character - as if it is physically piling up on them or has taken a job title, not just narrate the busy day that caused it.',
  upset: 'find the twist in how disproportionate the hurt feels in hindsight, gently - the humor is in noticing the gap between how big it felt and how small it actually was, never in mocking the hurt itself.',
  anxious: 'exaggerate the SPIRAL of worry itself into an absurd committee-meeting-with-yourself, rather than joking about the thing being worried about.',
  sad: 'find a wry, affectionate twist in the specific small thing that triggered the sadness, gently - never make the sadness itself the punchline.',
  tired: 'make the EXHAUSTION itself the exaggerated character - as if tiredness is a physical force or a rival taking over their body, not just mention that they are tired.',
  grateful: 'the twist should celebrate the specific good thing by exaggerating just how disproportionately great it feels, warmly - not a generic "yay" reaction.',
  funny: 'match and amplify their own amusement - the twist should escalate the funny thing they noticed one step further, like a friend one-upping the story.',
};

function connectionBlock(category, karmaExamples) {
  const tone = TONE_BY_CATEGORY[category] || 'warm and situational';
  const moodAngle = MOOD_ANGLE[category] || 'let the specific feeling behind this story be part of what the joke is actually about, not just background flavor';
  const karmaLine = karmaExamples
    ? `Never lean on a generic catch-all despair exclamation (${karmaExamples}) as a crutch or closer -`
    : 'Never lean on a generic catch-all despair exclamation as a crutch or closer -';
  return `TONE FOR THIS MOOD: ${tone}.

COMEDY TEST (apply this first, above every other rule below): read your own line back and ask "would a real person actually smile or laugh at this, or does it just sound clever on paper?" A technically specific, well-constructed line that lands flat is a FAILURE even if it satisfies every other rule here. Funny beats clever, always. If it doesn't earn a real smile, punch it up harder - sharpen the comparison, push the exaggeration further, or cut it down to the single funniest image - before moving on.

NO-COPYING TEST (apply this second, it fails candidates the comedy test alone won't catch): compare your "humor" line word-by-word against the user's own sentence. If three or more words in a row match the user's own phrasing (beyond names/numbers that have no other way to say them), you have written a restatement, not a joke - throw it out and write a genuinely different sentence that only points at the same detail, in your own comedic words and structure. Referencing the coffee mug is required; reusing the user's exact clause about the coffee mug is not. This also fails if you put any of the user's own distinctive words in quotation marks inside the joke (e.g. their story says "it's somewhat okay" and your line quotes back "'somewhat' தான்") - quoting their own word back at them, even just one word, reads as lazy and unfunny. Say the same idea in a completely different word instead of quoting theirs.

Specificity test: before answering, ask "could this exact line be posted under someone else's story in the same category?" If yes, it's too generic - find the one detail unique to THIS story and rewrite around it.

STRUCTURE: the humor line needs a real SETUP + TWIST, not a flat restatement of what happened. Anchor the setup on ONE concrete detail from the story (a name, object, number, place, exact moment) - referring to it in your own words, never quoting how the user phrased it - then land a twist that reframes it - an unexpected comparison, a role-reversal, an ironic reward, or an escalation. If you can't point to the exact word in the story your twist is hooked on, rewrite it. ${karmaLine} the punchline itself must reference the specific people, objects, numbers, or moments from their story. Gold standard for this kind of specificity: "he never woke up for anything, but the moment I opened a chips packet in the kitchen he'd come running with the funniest expression, asking what got opened" - the joke isn't just "kids like snacks", it's built on the exact sensory trigger (the packet's sound) and the exact reaction (instant appearance, that specific face). Find that same level of one-sensory-detail-plus-specific-reaction in every story.

MOOD CONNECTION: ${moodAngle} The twist should feel like it could only land for someone feeling this specific way about this specific thing - not a generic joke about the event that happens to be tagged with this mood.

CONNECTION: "perspective" and "action" must reference that SAME anchor detail, not generic advice that could apply to any story in this category - the whole response should read as one connected reaction, not three separate blurbs. Never just restate or translate the user's own sentence back to them anywhere in the response - transform it into an actual joke, don't summarize what happened.`;
}

const LOCAL_LANGUAGE_STYLES = {
  telugu: {
    audience: 'Telugu-speaking',
    colloquial: 'TENGLISH (Telugu colloquial speech spelled out in English/Latin letters, the way Telugu speakers actually text each other - NOT formal Telugu, NOT Telugu script)',
    comedy: "the exaggerated, self-deprecating comic-despair style associated with Telugu cinema comedians - Brahmanandam's over-the-top reactions, Venu Madhav and Ali style everyday complaining, MS Narayana's dramatic flair",
    mechanism: 'start narrating totally normal, then snap hard into a wildly disproportionate reaction - comic devastation or scandalized shock - the instant you hit the one exact detail from the story, like the beat right before Brahmanandam explodes on screen',
    meme: '"idi oka Brahmanandam scene", "next level comedy"',
    karma: '"naa karma ide", "eppudu naaku matrame enduku"',
    songCulture: 'Telugu movie song',
    example: 'Ee pilli naa 9 gantala meeting attendance list ni chusi, aa coffee mug ne exact ga target chesindi... ee precision chusthe maa manager kuda salute chestharu!',
  },
  kannada: {
    audience: 'Kannada-speaking',
    colloquial: 'KANGLISH (Kannada colloquial speech spelled out in English/Latin letters, the way Kannada speakers actually text each other - NOT formal Kannada, NOT Kannada script)',
    comedy: 'the exaggerated, self-deprecating comic-despair style associated with Kannada cinema comedians - Sadhu Kokila and Rangayana Raghu style over-the-top reactions to everyday chaos',
    mechanism: 'treat the tiny everyday trigger as an outrageous personal betrayal, with a mock-heroic dramatic pause right before the exaggerated reaction lands on the exact detail',
    meme: '"idu ondu Sadhu Kokila scene", "next level comedy"',
    karma: '"nanna karma idu", "yaake nanage matra"',
    songCulture: 'Kannada movie song',
    example: 'Ee bekku nanna 9 gante meeting attendance list nodkond, aa coffee mug annu target madtu... ee precision nodidre namma manager kooda respect kodtare!',
  },
  malayalam: {
    audience: 'Malayalam-speaking',
    colloquial: 'MANGLISH (Malayalam colloquial speech spelled out in English/Latin letters, the way Malayalam speakers actually text each other - NOT formal Malayalam, NOT Malayalam script)',
    comedy: "the exaggerated, self-deprecating comic-despair style associated with Mollywood comedians - Suraj Venjaramoodu and Salim Kumar style over-the-top everyday despair, Jagathy Sreekumar's dramatic flair",
    mechanism: 'deadpan mock-tragic delivery - narrate the misfortune in a flat, resigned "this is my destiny" tone like a cursed fate, then undercut it hard with one absurd comparison tied to the exact detail',
    meme: '"ithu oru Suraj Venjaramoodu scene", "next level comedy"',
    karma: '"ente vidhi ithanu", "enthinaanu enikku maathram"',
    songCulture: 'Malayalam movie song',
    example: 'Ee poocha ente 9 mani meeting attendance list nokki, aa coffee mug thanne target cheythu... ee precision kandal njangade manager polum respect tharum!',
  },
  hindi: {
    audience: 'Hindi-speaking',
    colloquial: 'HINGLISH (Hindi colloquial speech spelled out in English/Latin letters, the way Hindi speakers actually text each other - NOT formal Hindi, NOT Devanagari script)',
    comedy: 'the exaggerated, self-deprecating comic-despair style associated with Bollywood comedy - Johnny Lever and Rajpal Yadav style over-the-top reactions, everyday complaining',
    mechanism: 'rapid-fire exaggerated disbelief with a comic "arre yaar" beat - a dramatic pause like a cut to his shocked face - right before the punch lands on the exact detail',
    meme: '"ye ekdum Johnny Lever wala scene hai", "full on comedy"',
    karma: '"meri kismat hi kharab hai", "hamesha mere saath hi kyun hota hai"',
    songCulture: 'Bollywood/Hindi movie song',
    example: 'Is billi ko mera 9 baje wala meeting attendance list pata tha kya, seedha coffee mug hi target kar diya... itni precision dekh ke to hamara manager bhi salute karega!',
  },
};

// Distinct Tamil comedic mechanisms, each modeled on a different well-known
// figure's actual technique - never named to the user (see mechanismPreference.js,
// which infers a per-user weighting from regenerate/vote behavior rather than
// asking "who's your favorite comedian").
const TAMIL_MECHANISMS = {
  escalation: {
    instruction: 'build a normal-sounding setup, then snap hard into Vadivelu\'s iconic over-the-top "why does this always happen to me" despair - the "brahmanda kashtam" (universe-scale-disaster) style of exaggeration, treating the small mishap as if the universe personally conspired against them - landing the reaction on the exact detail from the story. Embody the STYLE through the exaggeration itself - do NOT name-drop a comedian or tack on a generic labeling line like "இது ஒரு Vadivelu moment" or "brahmanda level suffering" as a closer; that reads as a lazy stamp, not an actual joke. The despair has to be funny on its own, with no comedian\'s name or meme-label doing the work for it.',
    example: 'இந்த பூனைக்கு என் 9 மணி மீட்டிங் அட்டெண்டன்ஸ் லிஸ்ட் தெரிஞ்சிருக்கு, அதான் அந்த காபி மக்-ஐயே டார்கெட் பண்ணிச்சு... இந்த ப்ரெசிஷன் பாத்தா நம்ம மேனேஜர் கூடவே சல்யூட் அடிப்பாரு!',
  },
  duo_banter: {
    instruction: 'write it as a quick two-line back-and-forth packed into one "humor" string (format: "A: ... B: ..."), in the Senthil-Goundamani style. BOTH lines must already be doing comedy, not just line B: speaker A gives an exaggerated, personified, or mock-dramatic TAKE on the moment (e.g. framing the trigger as a secret agent, a rival, a court case, a conspiracy) rather than a flat blow-by-blow retelling of what happened - if you could delete the comedic framing from line A and it would just be a plain description of the event, rewrite it. Speaker B then fires back with mock-outrage or a smart-alec one-upping comeback, landing the punch on the exact detail from the story in fresh wording, never repeating line A\'s phrasing.',
    example: 'நான்: "என் பூனைக்கு ஒரு சீக்ரெட் மிஷன் இருக்கான்னு தோணுது - டார்கெட்: என் காபி மக், சக்சஸ் ரேட்: 100%!" நண்பன்: "அட, அதுக்கு உன்னைவிட நல்ல timing sense இருக்கு, அடுத்த promotion அதுக்குதான் கொடுக்கணும்!"',
  },
  wordplay: {
    instruction: 'build it as a Crazy Mohan style Tanglish wit - EITHER a literal pun (a word/phrase that sounds like or plays on an unrelated English or Tamil word or idiom) OR a vivid, apt ANALOGY that compares the story\'s situation to a well-known, universally-relatable everyday institution or character (a government office, a strict teacher, a traffic cop, a serial/TV drama) and rides that comparison to its punchline. Either way, the joke\'s engine must be the pun or the comparison itself, landing on the exact detail from the story - not just an exaggerated reaction.',
    example: 'வேலை இல்லாத நாளே tired-ஆ இருக்கே - உன் உடம்பு ஒரு government office: கஸ்டமர் இல்லாட்டாலும் counter closed-ஆ போச்சு!',
  },
  deadpan: {
    instruction: 'in Devan\'s Thuppariyum Sambu style, deliver it completely deadpan and mock-serious - narrate the small disaster like it is a grave official matter or investigation - but using SIMPLE, EVERYDAY SPOKEN WORDS a person would actually say out loud, never literary/written-Tamil vocabulary or formal passive constructions (e.g. "தெரியவந்துள்ளது", "செய்யப்படுகிறது", "நடத்தப்பட்டது"). If it reads like a newspaper report or essay rather than something spoken aloud, rewrite it in plainer spoken words. The humor comes entirely from the mismatch between the dead-serious tone and the triviality of the event - no exclamation marks, no over-the-top despair - the flatter and more seriously it sounds WHEN SPOKEN, the funnier.',
    example: 'பூனை காபி மக்கை தள்ளிட்டுச்சு-ன்னு முழுசா விசாரணை பண்ணி பார்த்தேன் - குற்றவாளி இன்னும் கண்டுபிடிக்கல, ஆனா மீட்டிங் மட்டும் தாமதமா ஆரம்பிச்சது உறுதி.',
  },
  // Modern Tamil internet-humor genre ("கடி ஜோக்ஸ்" / "kadi jokes" - lit.
  // "bite" jokes), described here from its well-known general conventions,
  // not derived from any specific source: a short setup (often phrased as a
  // question or plain statement) immediately met with a blunt, unexpectedly
  // savage comeback - no gradual build-up, the whole joke is the fast hit.
  kadi: {
    instruction: 'in the modern Tamil "kadi jokes" (கடி - savage one-liner roast) internet-humor style: a short question or statement, immediately followed by an unexpectedly blunt, savage-but-affectionate comeback that lands on the exact detail from the story - no scene-setting, no gradual build, the hit has to land in the very first exchange. The bluntness targets the SITUATION or gently roasts the user\'s own choices, never anything genuinely mean - it should read like a close friend clapping back, not an insult. Keep the whole thing to one or two short sentences; if it needs a third sentence to land, it is too slow for this style.',
    example: 'நான்: "இன்னைக்கு ஒண்ணுமே வேலை நடக்கல." நண்பன்: "வேலை நடக்கலையா, இல்ல நீயே நடக்க விடலையான்னு சொல்லு சரியா இருக்கும்!"',
  },
};

module.exports = { CATEGORY_LABELS, TONE_BY_CATEGORY, connectionBlock, LOCAL_LANGUAGE_STYLES, TAMIL_MECHANISMS };
