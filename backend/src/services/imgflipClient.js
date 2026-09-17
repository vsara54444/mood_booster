/**
 * Minimal Imgflip API client - overlays text onto a real, recognizable meme
 * template instead of generating freeform art. Free tier, docs: https://imgflip.com/api
 * Auth is a plain Imgflip account username/password (not a rotatable token).
 */

const CAPTION_URL = 'https://api.imgflip.com/caption_image';

async function captionMeme({ templateId, text0, text1 }) {
  if (!process.env.IMGFLIP_USERNAME || !process.env.IMGFLIP_PASSWORD) {
    throw new Error('IMGFLIP_USERNAME/IMGFLIP_PASSWORD is not set. Add them to backend/.env');
  }

  const body = new URLSearchParams({
    template_id: templateId,
    username: process.env.IMGFLIP_USERNAME,
    password: process.env.IMGFLIP_PASSWORD,
    text0: text0 || '',
    text1: text1 || '',
  });

  const response = await fetch(CAPTION_URL, { method: 'POST', body });
  const data = await response.json();
  if (!data.success) {
    throw new Error(`Imgflip API error: ${data.error_message || 'unknown error'}`);
  }
  return data.data.url;
}

module.exports = { captionMeme };
