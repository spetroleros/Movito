'use client'
// src/components/ui/index.tsx
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

// ---- Badge ----
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray'
const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger:  'bg-red-50 text-red-700',
  info:    'bg-blue-50 text-blue-700',
  gray:    'bg-gray-100 text-gray-600',
}
export function Badge({ variant = 'gray', children, className }: {
  variant?: BadgeVariant; children: ReactNode; className?: string
}) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', badgeStyles[variant], className)}>
      {children}
    </span>
  )
}

// ---- MetricCard ----
export function MetricCard({ label, value, delta, deltaColor }: {
  label: string; value: string | number; delta?: string; deltaColor?: string
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3.5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-medium text-gray-900">{value}</p>
      {delta && <p className={cn('text-xs mt-1', deltaColor ?? 'text-gray-400')}>{delta}</p>}
    </div>
  )
}

// ---- PageHeader ----
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
      <h1 className="text-base font-medium text-gray-900">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

// ---- Empty state ----
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ---- Loading spinner ----
export function Spinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ---- Tabla base ----
export function Table({ headers, children, className }: {
  headers: string[]; children: ReactNode; className?: string
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// ---- Input controlado ----
export function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <input
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        {...props}
      />
    </div>
  )
}

// ---- Select controlado ----
export function Select({ label, children, ...props }: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <select
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
