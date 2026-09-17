/**
 * Strips ```json fences etc. and parses a JSON object from a model response.
 * Models occasionally prepend/append stray prose despite being told to
 * respond with JSON only, so fall back to extracting the outermost {...}
 * substring before giving up.
 */
function parseJsonResponse(raw) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw err;
  }
}

module.exports = { parseJsonResponse };
