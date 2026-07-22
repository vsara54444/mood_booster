import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import LoadingDots from '../components/LoadingDots.jsx';

const VOTES = [
  { type: 'funny', emoji: '😂', label: 'Funny' },
  { type: 'smile', emoji: '🙂', label: 'Made me smile' },
  { type: 'not_funny', emoji: '😐', label: 'Not funny' },
];

export default function Relatable() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [votedPostIds, setVotedPostIds] = useState(() => new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getFeed(accessToken);
        setPosts(data.posts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  async function handleVote(postId, voteType) {
    if (votedPostIds.has(postId)) return;
    setVotedPostIds((prev) => new Set(prev).add(postId));
    setPosts((prev) =>
      prev.map((p) => {
        if (p.PostId !== postId) return p;
        const col = voteType === 'funny' ? 'FunnyVotes' : voteType === 'smile' ? 'SmileVotes' : 'NotFunnyVotes';
        return { ...p, [col]: p[col] + 1 };
      })
    );
    try {
      await api.voteOnPost(accessToken, postId, voteType);
    } catch (err) {
      // vote already happened optimistically; non-fatal if server rejects a dupe
      console.warn(err.message);
    }
  }

  return (
    <div className="max-w-md mx-auto pb-28">
      <TopBar title="Relatable" subtitle="Today, you're not the only one" />

      <main className="px-5 pt-5 space-y-4">
        {loading ? (
          <LoadingDots label="Gathering today's relatable moments" />
        ) : error ? (
          <p className="text-sm text-coral-dark">{error}</p>
        ) : posts.length === 0 ? (
          <div className="journal-card text-center py-8">
            <p className="text-3xl mb-2">🦗</p>
            <p className="font-display font-semibold">Quiet in here so far</p>
            <p className="text-sm text-inkSoft mt-1">Share one of your reframes from Home to get things going.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.PostId} className="journal-card">
              <p className="text-sm text-ink mb-2">{post.AnonymizedText}</p>
              <p className="font-display font-semibold text-coral-dark mb-2">"{post.HumorText}"</p>
              <p className="text-xs text-inkSoft mb-3">{post.PerspectiveText}</p>

              <div className="flex gap-2">
                {VOTES.map((v) => {
                  const count =
                    v.type === 'funny' ? post.FunnyVotes : v.type === 'smile' ? post.SmileVotes : post.NotFunnyVotes;
                  return (
                    <button
                      key={v.type}
                      onClick={() => handleVote(post.PostId, v.type)}
                      disabled={votedPostIds.has(post.PostId)}
                      className="flex-1 flex flex-col items-center gap-0.5 rounded-2xl border border-lavender py-2 text-xs font-medium text-inkSoft disabled:opacity-60 active:scale-95 transition-transform"
                    >
                      <span className="text-base">{v.emoji}</span>
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
