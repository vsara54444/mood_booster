import React from 'react';
import { NavLink } from 'react-router-dom';

// Each tab carries its own color, echoing its page: sky for Home, violet for
// the Story journal, fuchsia for Boost, emerald for Profile.
const TABS = [
  { to: '/', label: 'Home', icon: HomeIcon, on: 'text-sky-700', off: 'text-sky-500', pill: 'bg-sky-100' },
  { to: '/story', label: 'The Story So Far', short: 'Story', icon: StoryIcon, on: 'text-violet-700', off: 'text-violet-500', pill: 'bg-violet-100' },
  { to: '/boost', label: 'Boost', icon: BoostIcon, on: 'text-fuchsia-700', off: 'text-fuchsia-500', pill: 'bg-fuchsia-100' },
  { to: '/profile', label: 'Profile', icon: ProfileIcon, on: 'text-emerald-700', off: 'text-emerald-500', pill: 'bg-emerald-100' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-md bg-white/95 backdrop-blur border-t border-lavender pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map(({ to, label, short, icon: Icon, on, off, pill }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `tab-icon-wrap py-2 ${isActive ? `${on} font-bold` : `${off} font-semibold`}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`rounded-full px-4 py-1 transition-colors ${isActive ? pill : ''}`}>
                  <Icon active={isActive} />
                </span>
                <span className="leading-none">{short || label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.6 : 2.2}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StoryIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.6 : 2.2}>
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M8 10h8M8 14h8M8 18h5" strokeLinecap="round" />
    </svg>
  );
}
function BoostIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.6 : 2.2}>
      <path d="M13 3 5 14h6l-1 7 9-12h-6l1-6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.6 : 2.2}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.8 4.2-5.6 7-5.6s5.8 1.8 7 5.6" strokeLinecap="round" />
    </svg>
  );
}
