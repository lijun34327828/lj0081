import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, Flame, Receipt, ClipboardList, Calculator } from 'lucide-react'

const navItems = [
  { to: '/', label: '仪表盘', icon: LayoutDashboard },
  { to: '/register', label: '坯体登记', icon: Package },
  { to: '/reservation', label: '窑位预约', icon: Flame },
  { to: '/settlement', label: '烧制结算', icon: Receipt },
  { to: '/management', label: '后台管理', icon: ClipboardList },
  { to: '/calculator', label: '费用估算', icon: Calculator },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gradient-to-b from-pottery-800 to-pottery-900 text-pottery-100 flex flex-col fixed h-full">
        <div className="px-6 py-6 border-b border-pottery-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-kiln-500 rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-white leading-tight">陶艺坯体</h1>
              <p className="text-pottery-300 text-xs">管理系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 border-l-4 ${
                  isActive
                    ? 'bg-pottery-700/50 text-white border-kiln-500'
                    : 'text-pottery-300 border-transparent hover:bg-pottery-700/30 hover:text-pottery-100'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-pottery-700">
          <p className="text-pottery-400 text-xs">© 2026 陶艺工作室</p>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  )
}
