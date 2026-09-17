import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto pb-16">
      <TopBar title="Privacy Policy" subtitle="Last updated June 2026" right={<BackBtn onClick={() => navigate(-1)} />} />
      <main className="px-5 pt-6 space-y-6 text-sm leading-relaxed text-ink">
        <Section title="Private by default">
          Every entry you write is private and visible only to you, unless you actively choose to
          share it. Sharing is always opt-in, per entry - there is no setting that shares your
          content without your action at that moment.
        </Section>

        <Section title="What we collect">
          Your account email, your daily entries (raw text, cleaned text, mood, category), and
          basic usage data (streaks, check-in dates) needed to run the app. We do not collect
          location, contacts, or device identifiers beyond what's needed for login sessions.
        </Section>

        <Section title="Anonymous sharing">
          If you choose to share an entry to the Relatable feed, we remove names, company names,
          and other identifying details before it's stored as a community post. Shared posts are
          never linked back to your account in any user-facing screen.
        </Section>

        <Section title="AI processing">
          Your entry text is sent to our AI provider to clean up grammar and generate the humor,
          perspective, and action suggestions. This processing is used only to generate your
          response and to avoid repeating recent jokes - it is not used to build advertising
          profiles.
        </Section>

        <Section title="Data retention">
          We keep your entries for as long as your account is active so your streaks and reports
          stay accurate. You can delete your account at any time from Profile, which permanently
          removes your entries, streak, and login credentials from our systems.
        </Section>

        <Section title="Account and data deletion">
          Go to Profile → Delete account to permanently remove your personal data. This action
          cannot be undone. Content you previously shared anonymously remains in the community
          feed, since it never contained information that could identify you.
        </Section>

        <Section title="No ads, no data sale">
          We do not sell your personal data, and we do not show third-party ads inside the app.
        </Section>

        <Section title="Contact">
          Questions about this policy can be sent to privacy@moodbooster.app.
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="section-label mb-1">{title}</h2>
      <p className="text-inkSoft">{children}</p>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="text-sm font-semibold text-slate-dark">
      Back
    </button>
  );
}
