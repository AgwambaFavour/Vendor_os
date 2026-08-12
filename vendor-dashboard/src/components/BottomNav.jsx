import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/orders', label: 'Orders' },
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/groups', label: 'Groups' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-10">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `px-4 py-1.5 text-sm font-medium rounded-full ${
              isActive ? 'bg-wa-bubble text-wa-dark' : 'text-wa-muted'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}