import { BookMarked, LayoutDashboard, LogOut, Stethoscope } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { User } from '../../types'

interface Props {
  user: User
  onLogout: () => void
}

export function Navbar({ user, onLogout }: Props) {
  return (
    <>
      {/* Top bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Stethoscope className="text-blue-600" size={20} />
          <span className="font-bold text-blue-700 text-base">Rheum Board Prep</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:block">@{user.username}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            title="Sign out"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </nav>

      {/* Bottom tab bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex sm:hidden z-40 pb-safe">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`
          }
        >
          <LayoutDashboard size={22} />
          Dashboard
        </NavLink>
        <NavLink
          to="/bookmarks"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`
          }
        >
          <BookMarked size={22} />
          Bookmarks
        </NavLink>
      </div>

      {/* Desktop side nav links in top bar — hidden on mobile */}
      <div className="hidden sm:flex bg-white border-b border-gray-100 px-4 gap-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`
          }
        >
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink
          to="/bookmarks"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`
          }
        >
          <BookMarked size={16} /> Bookmarks
        </NavLink>
      </div>
    </>
  )
}
