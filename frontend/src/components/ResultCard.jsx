import React from 'react';

export default function ResultCard({
  result,
  stickerImage,
  stickerLoading,
  onGenerateSticker,
  onRegenerateSticker,
  humorLoading,
  onRegenerateHumor,
}) {
  return (
    <div className="journal-card animate-popIn space-y-4">
      <div>
        <span className="section-label">
          Humor reframe
        </span>
        <p className="font-display text-xl font-semibold text-ink mt-1 leading-snug">
          {result.humor}
        </p>
        {onRegenerateHumor && (
          <button
            type="button"
            onClick={onRegenerateHumor}
            disabled={humorLoading}
            className="mt-2 text-xs font-semibold text-blue-dark disabled:opacity-60"
          >
            {humorLoading ? 'Cooking up a new one…' : 'Not feeling it? Try a different joke'}
          </button>
        )}

        <div className="mt-3">
          {stickerImage ? (
            <div className="space-y-2">
              <img
                src={stickerImage}
                alt="Mood meme"
                className="w-full max-w-[240px] h-auto rounded-2xl border border-lavender"
              />
              <button
                type="button"
                onClick={onRegenerateSticker}
                disabled={stickerLoading}
                className="block text-xs font-semibold text-slate-dark disabled:opacity-60"
              >
                {stickerLoading ? 'Cooking up a sticker…' : 'Try another'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGenerateSticker}
              disabled={stickerLoading}
              className="text-xs font-semibold text-blue-dark disabled:opacity-60"
            >
              {stickerLoading ? 'Cooking up a sticker…' : 'Generate a sticker'}
            </button>
          )}
        </div>
      </div>

      <div className="h-px bg-lavender-light" />

      <div>
        <span className="section-label">
          Perspective
        </span>
        <p className="text-sm text-ink mt-1 leading-relaxed">{result.perspective}</p>
      </div>

      <div>
        <span className="section-label">
          Try this
        </span>
        <p className="text-sm text-ink mt-1 leading-relaxed">{result.action}</p>
      </div>
    </div>
  );
}
