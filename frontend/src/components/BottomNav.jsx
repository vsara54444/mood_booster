import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/story', label: 'The Story So Far', short: 'Story', icon: StoryIcon },
  { to: '/boost', label: 'Boost', icon: BoostIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-lavender pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map(({ to, label, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `tab-icon-wrap py-2.5 ${isActive ? 'text-blue-dark' : 'text-inkSoft'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StoryIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M8 10h8M8 14h8M8 18h5" strokeLinecap="round" />
    </svg>
  );
}
function BoostIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <path d="M13 3 5 14h6l-1 7 9-12h-6l1-6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.8 4.2-5.6 7-5.6s5.8 1.8 7 5.6" strokeLinecap="round" />
    </svg>
  );
}
