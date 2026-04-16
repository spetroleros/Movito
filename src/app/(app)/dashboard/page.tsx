'use client'
// src/app/(app)/dashboard/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Badge, MetricCard } from '@/components/ui'
import { formatPeso, formatFecha, ESTADOS_VENTA_LABEL, ESTADOS_ENTREGA_LABEL } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const supabase = createClient()

export default function DashboardPage() {
  const [stats, setStats] = useState({
    facturado: 0, ventas: 0, stock: 0, bajoMinimo: 0, capitalPendiente: 0,
    entregasHoy: 0, ordenesActivas: 0, enMora: 0,
  })
  const [ultimasVentas, setUltimasVentas] = useState<any[]>([])
  const [entregasHoy, setEntregasHoy] = useState<any[]>([])
  const [alertas, setAlertas] = useState<string[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    setLoading(true)
    const hoy = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [ventas, productos, cuotas, entregas, importaciones] = await Promise.all([
      supabase.from('ventas').select('*, clientes(apellido, nombre)').eq('tipo', 'venta').order('fecha', { ascending: false }),
      supabase.from('productos').select('*').eq('activo', true),
      supabase.from('planes_financiacion').select('estado, monto_financiado'),
      supabase.from('entregas').select('*, clientes(apellido, nombre), ventas(numero)').order('fecha_programada'),
      supabase.from('importaciones').select('estado, numero').neq('estado', 'recibida'),
    ])

    const v = ventas.data ?? []
    const p = productos.data ?? []
    const c = cuotas.data ?? []
    const e = entregas.data ?? []
    const imp = importaciones.data ?? []

    const ventasMes = v.filter(vt => vt.fecha >= inicioMes)
    const facturado = ventasMes.reduce((a, vt) => a + vt.total, 0)
    const stock = p.reduce((a, pd) => a + pd.stock_actual, 0)
    const bajoMinimo = p.filter(pd => pd.stock_actual < pd.stock_minimo).length
    const capitalPendiente = c.filter(ct => ct.estado === 'activo').reduce((a, ct) => a + ct.monto_financiado, 0)
    const enMora = c.filter(ct => ct.estado === 'mora').length
    const entHoy = e.filter(et => et.fecha_programada === hoy)
    const ordActivas = imp.length

    setStats({
      facturado, ventas: ventasMes.length, stock, bajoMinimo,
      capitalPendiente, entregasHoy: entHoy.length, ordenesActivas: ordActivas, enMora,
    })
    setUltimasVentas(v.slice(0, 5))
    setEntregasHoy(entHoy)

    // Alertas
    const al: string[] = []
    p.filter(pd => pd.stock_actual < pd.stock_minimo).forEach(pd => al.push(`Stock bajo: ${pd.nombre} (${pd.stock_actual} uds., mínimo ${pd.stock_minimo})`))
    imp.filter(i => i.estado === 'demorada').forEach(i => al.push(`Importación ${i.numero} demorada — revisar en aduana`))
    c.filter(ct => ct.estado === 'mora').forEach(() => al.push('Plan de financiación en mora — revisar cuotas vencidas'))
    setAlertas([...new Set(al)].slice(0, 6))

    // Gráfico — últimos 6 meses
    const meses: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleDateString('es-AR', { month: 'short' })
      const ini = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
      const total = v.filter(vt => vt.fecha >= ini && vt.fecha <= fin).reduce((a, vt) => a + vt.total, 0)
      meses.push({ mes: label, ventas: Math.round(total / 1000) })
    }
    setChartData(meses)
    setLoading(false)
  }

  const estadoVariant: Record<string, any> = {
    cobrado: 'success', financiado: 'info', pendiente: 'warning', presupuesto: 'gray', cancelado: 'danger',
    entregado: 'success', en_camino: 'info', asignado: 'info', reprogramado: 'danger',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <PageHeader title="Dashboard">
        <span className="text-xs text-gray-400">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </PageHeader>
      <div className="p-5 space-y-5">

        {/* Métricas principales */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard label="Facturado este mes" value={formatPeso(stats.facturado)} delta={`${stats.ventas} ventas`} deltaColor="text-green-500" />
          <MetricCard label="Stock disponible" value={stats.stock} delta={stats.bajoMinimo > 0 ? `${stats.bajoMinimo} bajo mínimo` : 'Todo OK'} deltaColor={stats.bajoMinimo > 0 ? 'text-red-500' : 'text-green-500'} />
          <MetricCard label="Capital financiado" value={formatPeso(stats.capitalPendiente)} delta={stats.enMora > 0 ? `${stats.enMora} en mora` : 'Sin mora'} deltaColor={stats.enMora > 0 ? 'text-red-500' : 'text-green-500'} />
          <MetricCard label="Entregas hoy" value={stats.entregasHoy} delta={`${stats.ordenesActivas} importaciones activas`} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Gráfico */}
          <div className="card p-5">
            <p className="text-sm font-medium text-gray-800 mb-4">Ventas — últimos 6 meses (miles ARS)</p>
            <div className="flex gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />Ventas
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}K`} />
                <Tooltip formatter={(v: any) => [`$${v}K`, 'Ventas']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e7eb' }} />
                <Bar dataKey="ventas" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alertas */}
          <div className="card p-5">
            <p className="text-sm font-medium text-gray-800 mb-3">Alertas del día</p>
            {alertas.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                Todo en orden — sin alertas
              </div>
            ) : (
              <div className="space-y-2">
                {alertas.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg text-xs text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-0.5" />
                    {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Últimas ventas */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-800">Últimas ventas</p>
            </div>
            {ultimasVentas.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Sin ventas registradas</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {ultimasVentas.map(v => {
                    const cl = v.clientes as any
                    return (
                      <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{v.numero}</td>
                        <td className="px-4 py-3">{cl ? `${cl.apellido}, ${cl.nombre}` : '—'}</td>
                        <td className="px-4 py-3 font-medium">{formatPeso(v.total)}</td>
                        <td className="px-4 py-3"><Badge variant={estadoVariant[v.estado]}>{ESTADOS_VENTA_LABEL[v.estado]}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Entregas de hoy */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-800">Entregas de hoy</p>
            </div>
            {entregasHoy.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Sin entregas programadas para hoy</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {entregasHoy.map(e => {
                    const cl = e.clientes as any
                    const vt = e.ventas as any
                    return (
                      <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3">{cl ? `${cl.apellido}, ${cl.nombre}` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{vt?.numero ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{e.turno}</td>
                        <td className="px-4 py-3"><Badge variant={estadoVariant[e.estado]}>{ESTADOS_ENTREGA_LABEL[e.estado]}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-800 mb-3">Accesos rápidos</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Nueva venta', href: '/ventas' },
              { label: 'Nuevo cliente', href: '/clientes' },
              { label: 'Registrar cobro', href: '/financiacion' },
              { label: 'Nueva importación', href: '/importaciones' },
              { label: 'Nueva entrega', href: '/logistica' },
              { label: 'Ajuste de stock', href: '/inventario' },
            ].map(item => (
              <a key={item.href} href={item.href}
                className="px-4 py-2 text-sm bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-gray-100 transition-colors">
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
