import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Leaf, Bell, BarChart3, CloudSun, LogOut, Radio, Settings } from 'lucide-react'
import clsx from 'clsx'
import { logout, getStoredUser } from '../../utils/api'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/monitor',   icon: Leaf,            label: 'Field Monitor' },
  { to: '/alerts',    icon: Bell,            label: 'Alerts'       },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics'    },
  { to: '/weather',   icon: CloudSun,        label: 'Weather'      },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const user         = getStoredUser()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col py-5 px-3"
      style={{ width: 64, background: 'var(--surf)', borderRight: '1px solid var(--bord)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center mb-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <Radio size={16} className="text-green-400" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = pathname === to
          return (
            <NavLink key={to} to={to} title={label}>
              <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center p-2.5 rounded-lg transition-all"
                style={{
                  background: active ? 'rgba(34,197,94,0.15)' : 'transparent',
                  border:     active ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                  color:      active ? '#4ade80' : 'var(--muted)',
                }}>
                <Icon size={18} />
              </motion.div>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-2 items-center mt-auto">
        {/* Live indicator */}
        <span className="relative flex h-2 w-2 mb-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>

        {/* Settings */}
        <NavLink to="/settings" title="Settings">
          <div className="p-2.5 rounded-lg hover:text-white transition-all" style={{ color: 'var(--muted)' }}>
            <Settings size={16} />
          </div>
        </NavLink>

        {/* Logout */}
        {user.token && (
          <button onClick={handleLogout} title="Logout"
            className="p-2.5 rounded-lg transition-all" style={{ color: 'var(--muted)' }}
            onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
            onMouseOut={e  => e.currentTarget.style.color = 'var(--muted)'}>
            <LogOut size={16} />
          </button>
        )}
      </div>
    </motion.aside>
  )
}
