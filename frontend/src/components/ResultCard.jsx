import React, { useState } from 'react';

export default function ResultCard({ result, onShare, sharing, shared }) {
  const [shareOptIn, setShareOptIn] = useState(false);

  return (
    <div className="journal-card animate-popIn space-y-4">
      <div>
        <span className="font-mono text-[11px] uppercase tracking-wide text-coral-dark font-bold">
          Humor reframe
        </span>
        <p className="font-display text-xl font-semibold text-ink mt-1 leading-snug">
          {result.humor}
        </p>
      </div>

      <div className="h-px bg-lavender-light" />

      <div>
        <span className="font-mono text-[11px] uppercase tracking-wide text-teal-dark font-bold">
          Perspective
        </span>
        <p className="text-sm text-ink mt-1 leading-relaxed">{result.perspective}</p>
      </div>

      <div>
        <span className="font-mono text-[11px] uppercase tracking-wide text-inkSoft font-bold">
          Try this
        </span>
        <p className="text-sm text-ink mt-1 leading-relaxed">{result.action}</p>
      </div>

      <div className="pt-2 border-t border-lavender-light">
        {shared ? (
          <p className="text-xs text-teal-dark font-medium flex items-center gap-1.5">
            <span>✓</span> Shared anonymously to Relatable - thank you!
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-inkSoft">
              <input
                type="checkbox"
                checked={shareOptIn}
                onChange={(e) => setShareOptIn(e.target.checked)}
                className="w-4 h-4 accent-teal"
              />
              Share anonymously to Relatable
            </label>
            <button
              type="button"
              disabled={!shareOptIn || sharing}
              onClick={onShare}
              className="text-xs font-semibold text-white bg-teal disabled:bg-lavender disabled:text-inkSoft rounded-full px-3 py-1.5 transition-colors"
            >
              {sharing ? 'Sharing…' : 'Share'}
            </button>
          </div>
        )}
        <p className="text-[11px] text-inkSoft mt-2">
          Names and companies are stripped automatically before anything is shared. Private by default.
        </p>
      </div>
    </div>
  );
}
