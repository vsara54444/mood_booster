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

function connectionBlock(category, karmaExamples) {
  const tone = TONE_BY_CATEGORY[category] || 'warm and situational';
  const karmaLine = karmaExamples
    ? `Never lean on a generic catch-all despair exclamation (${karmaExamples}) as a crutch or closer -`
    : 'Never lean on a generic catch-all despair exclamation as a crutch or closer -';
  return `TONE FOR THIS MOOD: ${tone}.

COMEDY TEST (apply this first, above every other rule below): read your own line back and ask "would a real person actually smile or laugh at this, or does it just sound clever on paper?" A technically specific, well-constructed line that lands flat is a FAILURE even if it satisfies every other rule here. Funny beats clever, always. If it doesn't earn a real smile, punch it up harder - sharpen the comparison, push the exaggeration further, or cut it down to the single funniest image - before moving on.

Specificity test: before answering, ask "could this exact line be posted under someone else's story in the same category?" If yes, it's too generic - find the one detail unique to THIS story and rewrite around it.

STRUCTURE: the humor line needs a real SETUP + TWIST, not a flat restatement of what happened. Anchor the setup on ONE concrete detail from the story (a name, object, number, place, exact moment), then land a twist that reframes it - an unexpected comparison, a role-reversal, an ironic reward, or an escalation. If you can't point to the exact word in the story your twist is hooked on, rewrite it. ${karmaLine} the punchline itself must reference the specific people, objects, numbers, or moments from their story. Gold standard for this kind of specificity: "he never woke up for anything, but the moment I opened a chips packet in the kitchen he'd come running with the funniest expression, asking what got opened" - the joke isn't just "kids like snacks", it's built on the exact sensory trigger (the packet's sound) and the exact reaction (instant appearance, that specific face). Find that same level of one-sensory-detail-plus-specific-reaction in every story.

CONNECTION: "perspective" and "action" must reference that SAME anchor detail, not generic advice that could apply to any story in this category - the whole response should read as one connected reaction, not three separate blurbs. Also never just restate or translate the user's own sentence back to them - transform it into an actual joke, don't summarize what happened.`;
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
    instruction: 'build a normal-sounding setup, then snap hard into Vadivelu\'s iconic over-the-top "why does this always happen to me" despair - the "brahmanda kashtam" (universe-scale-disaster) style of exaggeration, treating the small mishap as if the universe personally conspired against them - landing the reaction on the exact detail from the story. Naming a comedian or meme phrase directly in the line (e.g. "இது ஒரு Vadivelu moment", "brahmanda level suffering") is encouraged whenever it sharpens the punch - treat it as a real tool to reach for, not rare decoration.',
    example: 'இந்த பூனைக்கு என் 9 மணி மீட்டிங் அட்டெண்டன்ஸ் லிஸ்ட் தெரிஞ்சிருக்கு, அதான் அந்த காபி மக்-ஐயே டார்கெட் பண்ணிச்சு... இந்த ப்ரெசிஷன் பாத்தா நம்ம மேனேஜர் கூடவே சல்யூட் அடிப்பாரு!',
  },
  duo_banter: {
    instruction: 'write it as a quick two-line back-and-forth packed into one "humor" string (format: "A: ... B: ..."), in the Senthil-Goundamani style of one voice deadpan-narrating the disaster and the other firing back with mock-outrage or a smart-alec one-upping comeback - landing the punch on the exact detail from the story.',
    example: 'நான்: "பூனை காபியை தள்ளிருச்சு, மீட்டிங் நடுவுல mute பண்ணி clean பண்ணேன்." நண்பன்: "அட, உன் பூனைக்கு உன்னைவிட நல்ல timing sense இருக்கு, அது வேற லெவல் manager ஆயிடும்!"',
  },
  wordplay: {
    instruction: 'build it as a Crazy Mohan style Tanglish wit - EITHER a literal pun (a word/phrase that sounds like or plays on an unrelated English or Tamil word or idiom) OR a vivid, apt ANALOGY that compares the story\'s situation to a well-known, universally-relatable everyday institution or character (a government office, a strict teacher, a traffic cop, a serial/TV drama) and rides that comparison to its punchline. Either way, the joke\'s engine must be the pun or the comparison itself, landing on the exact detail from the story - not just an exaggerated reaction.',
    example: 'வேலை இல்லாத நாளே tired-ஆ இருக்கே - உன் உடம்பு ஒரு government office: கஸ்டமர் இல்லாட்டாலும் counter closed-ஆ போச்சு!',
  },
  deadpan: {
    instruction: 'in Devan\'s Thuppariyum Sambu style, deliver it completely deadpan and mock-serious - narrate the small disaster like it is a grave official matter or investigation - but using SIMPLE, EVERYDAY SPOKEN WORDS a person would actually say out loud, never literary/written-Tamil vocabulary or formal passive constructions (e.g. "தெரியவந்துள்ளது", "செய்யப்படுகிறது", "நடத்தப்பட்டது"). If it reads like a newspaper report or essay rather than something spoken aloud, rewrite it in plainer spoken words. The humor comes entirely from the mismatch between the dead-serious tone and the triviality of the event - no exclamation marks, no over-the-top despair - the flatter and more seriously it sounds WHEN SPOKEN, the funnier.',
    example: 'பூனை காபி மக்கை தள்ளிட்டுச்சு-ன்னு முழுசா விசாரணை பண்ணி பார்த்தேன் - குற்றவாளி இன்னும் கண்டுபிடிக்கல, ஆனா மீட்டிங் மட்டும் தாமதமா ஆரம்பிச்சது உறுதி.',
  },
};

module.exports = { CATEGORY_LABELS, TONE_BY_CATEGORY, connectionBlock, LOCAL_LANGUAGE_STYLES, TAMIL_MECHANISMS };
