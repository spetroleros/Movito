'use client'
// src/components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const Logo = () => (
  <svg viewBox="0 0 300 80" className="h-8 w-auto">
    <circle cx="20" cy="55" r="8" fill="#2563EB"/>
    <circle cx="60" cy="55" r="8" fill="#2563EB"/>
    <path d="M20 55 Q35 30 55 30 Q75 55" stroke="#2563EB" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M35 30 L32 18 L44 18 L41 30" fill="#2563EB"/>
    <text x="90" y="52" fontFamily="system-ui" fontSize="36" fontWeight="700" fill="#1F2937">movito</text>
  </svg>
)

const navItems = [
  { label: 'Dashboard', href: '/dashboard', section: 'Principal' },
  { label: 'Importaciones', href: '/importaciones', section: 'Operaciones' },
  { label: 'Inventario', href: '/inventario', section: 'Operaciones' },
  { label: 'Ventas', href: '/ventas', section: 'Operaciones' },
  { label: 'Logística', href: '/logistica', section: 'Operaciones' },
  { label: 'Caja', href: '/caja', section: 'Clientes' },{ label: 'Clientes', href: '/clientes', section: 'Clientes' },
  { label: 'Financiación', href: '/financiacion', section: 'Clientes' },
  { label: 'Reportes', href: '/reportes', section: 'Análisis' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const sections = navItems.map(i => i.section).filter((s, i, arr) => arr.indexOf(s) === i)

  return (
    <aside className="w-52 min-h-screen bg-white border-r border-gray-100 flex flex-col py-3.5 shrink-0">
      <div className="px-3.5 pb-4 border-b border-gray-100 mb-2">
        <Logo />
      </div>
      {sections.map(section => (
        <div key={section}>
          <p className="px-3.5 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {section}
          </p>
          {navItems.filter(i => i.section === section).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-sm transition-colors border-l-2',
                pathname.startsWith(item.href)
                  ? 'bg-blue-50 text-blue-700 border-blue-600 font-medium'
                  : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  )
}
