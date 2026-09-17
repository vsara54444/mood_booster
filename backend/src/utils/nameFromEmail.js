// Derives a display-name fallback from an email's local part, e.g.
// "priya.raman+test@gmail.com" -> "Priya Raman". Used when a user doesn't
// give a display name at signup, so the profile still shows something
// tied to how their account was created instead of staying blank.
function nameFromEmail(email) {
  const local = String(email || '').split('@')[0];
  return local
    .replace(/[._+]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

module.exports = { nameFromEmail };
