'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const Logo = () => (
  <svg viewBox="0 0 300 80" className="h-8 w-auto">
    <circle cx="20" cy="55" r="8" fill="white"/>
    <circle cx="60" cy="55" r="8" fill="white"/>
    <path d="M20 55 Q35 30 55 30 Q75 55" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M35 30 L32 18 L44 18 L41 30" fill="white"/>
    <text x="90" y="52" fontFamily="system-ui" fontSize="36" fontWeight="700" fill="white">movito</text>
  </svg>
)

const navItems = [
  { label: 'Dashboard', href: '/dashboard', section: 'Principal' },
  { label: 'Importaciones', href: '/importaciones', section: 'Operaciones' },
  { label: 'Inventario', href: '/inventario', section: 'Operaciones' },
  { label: 'Ventas', href: '/ventas', section: 'Operaciones' },
  { label: 'Logística', href: '/logistica', section: 'Operaciones' },
  { label: 'Caja', href: '/caja', section: 'Clientes' },
  { label: 'Clientes', href: '/clientes', section: 'Clientes' },
  { label: 'Financiación', href: '/financiacion', section: 'Clientes' },
  { label: 'Reportes', href: '/reportes', section: 'Análisis' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const sections = navItems.map(i => i.section).filter((s, i, arr) => arr.indexOf(s) === i)

  return (
    <aside className="w-56 min-h-screen flex flex-col shrink-0" style={{ background: 'linear-gradient(180deg, #1565C0 0%, #0D47A1 60%, #1B5E20 100%)' }}>
      <div className="px-5 py-5 mb-2">
        <Logo />
        <p className="text-blue-200 text-xs mt-1">Gestión integral</p>
      </div>
      {sections.map(section => (
        <div key={section}>
          <p className="px-5 pt-4 pb-1 text-[10px] font-semibold text-blue-300 uppercase tracking-widest">
            {section}
          </p>
          {navItems.filter(i => i.section === section).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-5 py-2.5 text-sm transition-all',
                pathname.startsWith(item.href)
                  ? 'bg-white/20 text-white font-semibold border-r-4 border-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
      <div className="mt-auto px-5 py-4">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-blue-200 font-medium">Movito v1.0</p>
          <p className="text-xs text-blue-300 mt-0.5">Sistema de gestión</p>
        </div>
      </div>
    </aside>
  )
}
