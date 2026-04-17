'use client'
// src/app/(app)/financiacion/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanFinanciacion, Cuota, Cliente, Venta } from '@/types'
import { PageHeader, Badge, Table, EmptyState, Spinner, MetricCard, Select, Input } from '@/components/ui'
import { formatPeso, formatFecha, calcularCuotaMensual } from '@/lib/utils'

const supabase = createClient()

const estadoVariant: Record<string, any> = { activo: 'info', mora: 'danger', cancelado: 'success' }
const estadoLabel: Record<string, string> = { activo: 'Activo', mora: 'En mora', cancelado: 'Cancelado' }
const cuotaVariant: Record<string, any> = { pagada: 'success', vencida: 'danger', pendiente: 'gray' }
const cuotaLabel: Record<string, string> = { pagada: 'Pagada', vencida: 'Vencida', pendiente: 'Pendiente' }

export default function FinanciacionPage() {
  const [planes, setPlanes] = useState<PlanFinanciacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [view, setView] = useState<'list' | 'new' | 'ficha' | 'sim'>('list')
  const [selected, setSelected] = useState<PlanFinanciacion | null>(null)
  const [saving, setSaving] = useState(false)

  // Formulario
  const [form, setForm] = useState({
    cliente_id: '', venta_id: '', monto_total: '', sena: '0',
    cantidad_cuotas: 12, interes_mensual: 0, dia_vencimiento: 15,
  })

  // Simulador
  const [sim, setSim] = useState({ monto: 420000, cuotas: 12, interes: 0, sena: 0 })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [pl, cl, vt] = await Promise.all([
      supabase.from('planes_financiacion').select('*, clientes(apellido, nombre), ventas(numero)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, apellido, nombre').eq('activo', true).order('apellido'),
      supabase.from('ventas').select('id, numero, total, cliente_id').eq('tipo', 'venta').order('fecha', { ascending: false }),
    ])
    setPlanes(pl.data ?? [])
    setClientes((cl.data ?? []) as any)
    setVentas((vt.data ?? []) as any)
    setLoading(false)
  }

  async function fetchCuotas(planId: string) {
    const { data } = await supabase.from('cuotas').select('*').eq('plan_id', planId).order('numero_cuota')
    setCuotas(data ?? [])
  }

  const planesFiltrados = planes.filter(p => {
    const cl = p.clientes as any
    const q = busqueda.toLowerCase()
    const mq = !q || ((cl?.apellido ?? '') + (cl?.nombre ?? '') + p.numero).toLowerCase().includes(q)
    const me = !filtroEst || p.estado === filtroEst
    return mq && me
  })

  const capitalPendiente = planes.filter(p => p.estado === 'activo').reduce((a, p) => {
    const cuotasPagadas = 0 // simplificado
    return a + p.monto_financiado - cuotasPagadas
  }, 0)
  const enMora = planes.filter(p => p.estado === 'mora').length

  async function guardarPlan(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const montoFinanciado = Number(form.monto_total) - Number(form.sena)
    const cuotaMensual = calcularCuotaMensual(montoFinanciado, Number(form.cantidad_cuotas), Number(form.interes_mensual))
    await supabase.from('planes_financiacion').insert({
      venta_id: form.venta_id || null,
      cliente_id: form.cliente_id,
      monto_total: Number(form.monto_total),
      sena: Number(form.sena),
      monto_financiado: montoFinanciado,
      cantidad_cuotas: Number(form.cantidad_cuotas),
      interes_mensual: Number(form.interes_mensual),
      cuota_mensual: Math.round(cuotaMensual),
      dia_vencimiento: Number(form.dia_vencimiento),
    })
    setSaving(false)
    setView('list')
    fetchAll()
  }

  async function marcarCuotaPagada(cuotaId: string) {
    await supabase.from('cuotas').update({ estado: 'pagada', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', cuotaId)
    if (selected) fetchCuotas(selected.id)
  }

  // Simulador
  const simFinanciado = sim.monto - sim.sena
  const simCuota = calcularCuotaMensual(simFinanciado, sim.cuotas, sim.interes)
  const simTotal = simCuota * sim.cuotas + sim.sena
  const simIntereses = simTotal - sim.monto

  // ---- LISTA ----
  if (view === 'list') return (
    <div>
      <PageHeader title="Financiación">
        <button className="btn" onClick={() => setView('sim')}>Simulador</button>
        <button className="btn btn-primary" onClick={() => setView('new')}>+ Nuevo plan</button>
      </PageHeader>
      <div className="p-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricCard label="Planes activos" value={planes.filter(p => p.estado === 'activo').length} />
          <MetricCard label="Capital pendiente" value={formatPeso(capitalPendiente)} />
          <MetricCard label="Total planes" value={planes.length} />
          <MetricCard label="En mora" value={enMora} deltaColor={enMora > 0 ? 'text-red-500' : 'text-gray-400'} />
        </div>
        <div className="flex gap-3 mb-4">
          <input className="input flex-1" placeholder="Buscar por cliente o N° de plan..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select className="input w-40" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(estadoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="card overflow-hidden">
          {loading ? <Spinner /> : planesFiltrados.length === 0 ? <EmptyState message="No hay planes de financiación" /> : (
            <Table headers={['Plan', 'Cliente', 'Total', 'Cuotas', 'Cuota mensual', 'Estado', '']}>
              {planesFiltrados.map(p => {
                const cl = p.clientes as any
                return (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelected(p); fetchCuotas(p.id); setView('ficha') }}>
                    <td className="table-cell font-mono text-xs">{p.numero}</td>
                    <td className="table-cell">{cl ? `${cl.apellido}, ${cl.nombre}` : '—'}</td>
                    <td className="table-cell font-medium">{formatPeso(p.monto_total)}</td>
                    <td className="table-cell text-gray-500">{p.cantidad_cuotas}c</td>
                    <td className="table-cell font-medium">{formatPeso(p.cuota_mensual)}</td>
                    <td className="table-cell"><Badge variant={estadoVariant[p.estado]}>{estadoLabel[p.estado]}</Badge></td>
                    <td className="table-cell"><button className="btn btn-sm">Ver</button></td>
                  </tr>
                )
              })}
            </Table>
          )}
        </div>
      </div>
    </div>
  )

  // ---- SIMULADOR ----
  if (view === 'sim') return (
    <div>
      <PageHeader title="Simulador de cuotas">
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-6 max-w-3xl">
          <div className="card p-5">
            <p className="section-title mt-0">Parámetros</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Monto total (ARS)" type="number" value={sim.monto} onChange={e => setSim(p => ({ ...p, monto: Number(e.target.value) }))} />
              <Select label="Cantidad de cuotas" value={sim.cuotas} onChange={e => setSim(p => ({ ...p, cuotas: Number(e.target.value) }))}>
                {[3, 6, 12, 18, 24].map(n => <option key={n} value={n}>{n} cuotas</option>)}
              </Select>
              <Input label="Interés mensual (%)" type="number" step={0.5} min={0} value={sim.interes} onChange={e => setSim(p => ({ ...p, interes: Number(e.target.value) }))} />
              <Input label="Seña / anticipo" type="number" min={0} value={sim.sena} onChange={e => setSim(p => ({ ...p, sena: Number(e.target.value) }))} />
            </div>
            <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Monto a financiar</span><span>{formatPeso(simFinanciado)}</span></div>
              <div className="flex justify-between text-blue-700 font-medium"><span>Cuota mensual</span><span>{formatPeso(Math.round(simCuota))}</span></div>
              <div className="flex justify-between text-gray-500"><span>Total intereses</span><span>{formatPeso(Math.round(simIntereses))}</span></div>
              <div className="flex justify-between font-medium pt-2 border-t border-gray-200"><span>Total a pagar</span><span>{formatPeso(Math.round(simTotal))}</span></div>
            </div>
            <button className="btn btn-primary w-full mt-4" onClick={() => {
              setForm(prev => ({ ...prev, monto_total: String(sim.monto), sena: String(sim.sena), cantidad_cuotas: sim.cuotas, interes_mensual: sim.interes }))
              setView('new')
            }}>Crear plan con estos datos →</button>
          </div>
          <div className="card p-5">
            <p className="section-title mt-0">Tabla de cuotas</p>
            <div className="overflow-y-auto max-h-80">
              {Array.from({ length: sim.cuotas }, (_, i) => {
                let saldo = simFinanciado
                let capitalPagado = 0
                for (let j = 0; j < i; j++) {
                  const int = saldo * sim.interes / 100
                  capitalPagado = simCuota - int
                  saldo = Math.max(0, saldo - capitalPagado)
                }
                const intMes = saldo * sim.interes / 100
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 text-sm">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 shrink-0">{i + 1}</div>
                    {sim.interes > 0 && <span className="text-xs text-gray-400 flex-1">Int: {formatPeso(Math.round(intMes))}</span>}
                    <span className="font-medium">{formatPeso(Math.round(simCuota))}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ---- NUEVO PLAN ----
  if (view === 'new') return (
    <div>
      <PageHeader title="Nuevo plan de financiación">
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5 max-w-2xl">
        <form onSubmit={guardarPlan} className="card p-5 space-y-4">
          <p className="section-title mt-0">Datos del plan</p>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Cliente *" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} required>
              <option value="">— Seleccionar —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.apellido}, {c.nombre}</option>)}
            </Select>
            <Select label="Venta asociada" value={form.venta_id} onChange={e => {
              const v = ventas.find(vt => vt.id === e.target.value)
              setForm(p => ({ ...p, venta_id: e.target.value, monto_total: v ? String(v.total) : p.monto_total }))
            }}>
              <option value="">— Ninguna —</option>
              {ventas.map(v => <option key={v.id} value={v.id}>{v.numero} — {formatPeso(v.total)}</option>)}
            </Select>
            <Input label="Monto total *" type="number" value={form.monto_total} onChange={e => setForm(p => ({ ...p, monto_total: e.target.value }))} required />
            <Input label="Seña / anticipo" type="number" value={form.sena} onChange={e => setForm(p => ({ ...p, sena: e.target.value }))} />
            <Select label="Cuotas" value={form.cantidad_cuotas} onChange={e => setForm(p => ({ ...p, cantidad_cuotas: Number(e.target.value) }))}>
              {[3, 6, 12, 18, 24].map(n => <option key={n} value={n}>{n} cuotas</option>)}
            </Select>
            <Input label="Interés mensual (%)" type="number" step={0.5} min={0} value={form.interes_mensual} onChange={e => setForm(p => ({ ...p, interes_mensual: Number(e.target.value) }))} />
            <Select label="Día de vencimiento" value={form.dia_vencimiento} onChange={e => setForm(p => ({ ...p, dia_vencimiento: Number(e.target.value) }))}>
              {[1, 5, 10, 15, 20, 25].map(d => <option key={d} value={d}>Día {d}</option>)}
            </Select>
          </div>
          {form.monto_total && (
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
              Cuota estimada: <strong>{formatPeso(Math.round(calcularCuotaMensual(Number(form.monto_total) - Number(form.sena), form.cantidad_cuotas, form.interes_mensual)))}</strong> / mes
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear plan'}</button>
          </div>
        </form>
      </div>
    </div>
  )

  // ---- FICHA ----
  if (view === 'ficha' && selected) {
    const cl = selected.clientes as any
    const pagadas = cuotas.filter(c => c.estado === 'pagada').length
    const pct = Math.round(pagadas / selected.cantidad_cuotas * 100)
    return (
      <div>
        <PageHeader title={selected.numero}>
          <button className="btn" onClick={() => setView('list')}>← Volver</button>
        </PageHeader>
        <div className="p-5">
          <div className="grid grid-cols-4 gap-3 mb-5">
            <MetricCard label="Total" value={formatPeso(selected.monto_total)} />
            <MetricCard label="Cuota mensual" value={formatPeso(selected.cuota_mensual)} />
            <MetricCard label="Cuotas pagadas" value={`${pagadas}/${selected.cantidad_cuotas}`} />
            <MetricCard label="Progreso" value={`${pct}%`} delta={`${selected.cantidad_cuotas - pagadas} cuotas restantes`} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 card overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-medium">{cl ? `${cl.apellido}, ${cl.nombre}` : '—'}</p>
                  <p className="text-xs text-gray-500">Vence día {selected.dia_vencimiento} de cada mes · {selected.interes_mensual > 0 ? `${selected.interes_mensual}% interés mensual` : 'Sin interés'}</p>
                </div>
                <Badge variant={estadoVariant[selected.estado]}>{estadoLabel[selected.estado]}</Badge>
              </div>
              <div className="p-4">
                <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {cuotas.map(c => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0
                        ${c.estado === 'pagada' ? 'bg-green-50 text-green-700' : c.estado === 'vencida' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.numero_cuota}
                      </div>
                      <div className="flex-1 text-sm">
                        <p>Cuota {c.numero_cuota}/{selected.cantidad_cuotas}</p>
                        <p className="text-xs text-gray-400">Vence: {formatFecha(c.fecha_vencimiento)}{c.fecha_pago ? ` · Pagada: ${formatFecha(c.fecha_pago)}` : ''}</p>
                      </div>
                      <span className="font-medium text-sm">{formatPeso(c.monto)}</span>
                      <Badge variant={cuotaVariant[c.estado]}>{cuotaLabel[c.estado]}</Badge>
                      {c.estado !== 'pagada' && (
                        <button className="btn btn-sm btn-success text-xs" onClick={() => marcarCuotaPagada(c.id)}>Cobrar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="card p-4 text-sm space-y-2">
                <p className="font-medium text-gray-800 mb-3">Resumen</p>
                <div className="flex justify-between text-gray-500"><span>Seña</span><span>{formatPeso(selected.sena)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Financiado</span><span>{formatPeso(selected.monto_financiado)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Interés</span><span>{selected.interes_mensual > 0 ? `${selected.interes_mensual}%/mes` : 'Sin interés'}</span></div>
                <div className="flex justify-between font-medium pt-2 border-t border-gray-100"><span>Total</span><span>{formatPeso(selected.monto_total)}</span></div>
              </div>
              <button className="btn w-full btn-sm" onClick={() => {}}>Enviar recordatorio WhatsApp</button>
              <button className="btn w-full btn-sm" onClick={() => {}}>Generar recibo</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
