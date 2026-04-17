'use client'
// src/app/(app)/caja/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Badge, Table, EmptyState, Spinner, MetricCard, Select, Input } from '@/components/ui'
import { formatPeso, formatFecha } from '@/lib/utils'

const supabase = createClient()

const CATEGORIAS_INGRESO = [
  'Venta contado', 'Cobro cuota', 'Seña', 'Transferencia recibida', 'Otro ingreso',
]
const CATEGORIAS_EGRESO = [
  'Flete / logística', 'Despachante de aduana', 'Pago a proveedor', 'Retiro personal',
  'Gastos bancarios', 'Impuestos', 'Servicios', 'Otros gastos',
]

const TIPO_ICON: Record<string, string> = {
  efectivo: '💵', banco: '🏦', mercado_pago: '💳', cheques: '📄', otra: '💰',
}

const TIPO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', banco: 'Banco', mercado_pago: 'Mercado Pago',
  cheques: 'Cheques', otra: 'Otra',
}

export default function CajaPage() {
  const [cuentas, setCuentas] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'nuevo_mov' | 'nueva_cuenta' | 'transferencia'>('list')
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroCuenta, setFiltroCuenta] = useState('')

  const emptyMov = {
    cuenta_id: '', tipo: 'ingreso', categoria: '', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0],
  }
  const [movForm, setMovForm] = useState<any>(emptyMov)

  const emptyTransf = {
    cuenta_origen_id: '', cuenta_destino_id: '', monto: '', descripcion: '', fecha: new Date().toISOString().split('T')[0],
  }
  const [transfForm, setTransfForm] = useState<any>(emptyTransf)

  const emptyCuenta = { nombre: '', tipo: 'efectivo', saldo_inicial: '', color: '#2563EB' }
  const [cuentaForm, setCuentaForm] = useState<any>(emptyCuenta)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [c, m] = await Promise.all([
      supabase.from('cuentas').select('*').eq('activo', true).order('nombre'),
      supabase.from('movimientos_caja').select('*, cuentas(nombre, tipo, color)').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(100),
    ])
    setCuentas(c.data ?? [])
    setMovimientos(m.data ?? [])
    setLoading(false)
  }

  const totalActivos = cuentas.reduce((a, c) => a + c.saldo_actual, 0)
  const totalEfectivo = cuentas.filter(c => c.tipo === 'efectivo').reduce((a, c) => a + c.saldo_actual, 0)
  const totalBanco = cuentas.filter(c => c.tipo === 'banco').reduce((a, c) => a + c.saldo_actual, 0)

  const movFiltrados = movimientos.filter(m => {
    const mt = !filtroTipo || m.tipo === filtroTipo
    const mc = !filtroCuenta || m.cuenta_id === filtroCuenta
    return mt && mc
  })

  const ingresosMes = movimientos.filter(m => {
    const d = new Date(m.fecha)
    const hoy = new Date()
    return m.tipo === 'ingreso' && d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
  }).reduce((a, m) => a + m.monto, 0)

  const egresosMes = movimientos.filter(m => {
    const d = new Date(m.fecha)
    const hoy = new Date()
    return m.tipo === 'egreso' && d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
  }).reduce((a, m) => a + m.monto, 0)

  async function guardarMovimiento(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('movimientos_caja').insert({
      ...movForm,
      monto: Number(movForm.monto),
    })
    setSaving(false)
    setMovForm(emptyMov)
    setView('list')
    fetchAll()
  }

  async function guardarTransferencia(e: React.FormEvent) {
    e.preventDefault()
    if (transfForm.cuenta_origen_id === transfForm.cuenta_destino_id) return
    setSaving(true)
    await supabase.from('movimientos_caja').insert({
      cuenta_id: transfForm.cuenta_origen_id,
      cuenta_destino_id: transfForm.cuenta_destino_id,
      tipo: 'transferencia',
      categoria: 'Transferencia entre cuentas',
      descripcion: transfForm.descripcion,
      monto: Number(transfForm.monto),
      fecha: transfForm.fecha,
    })
    setSaving(false)
    setTransfForm(emptyTransf)
    setView('list')
    fetchAll()
  }

  async function guardarCuenta(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const saldo = Number(cuentaForm.saldo_inicial) || 0
    await supabase.from('cuentas').insert({
      ...cuentaForm,
      saldo_inicial: saldo,
      saldo_actual: saldo,
    })
    setSaving(false)
    setCuentaForm(emptyCuenta)
    setView('list')
    fetchAll()
  }

  const fm = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setMovForm((p: any) => ({ ...p, [key]: e.target.value }))
  const ft = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setTransfForm((p: any) => ({ ...p, [key]: e.target.value }))
  const fc = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCuentaForm((p: any) => ({ ...p, [key]: e.target.value }))

  // ---- LISTA ----
  if (view === 'list') return (
    <div>
      <PageHeader title="Caja">
        <button className="btn" onClick={() => setView('transferencia')}>↔ Transferir</button>
        <button className="btn" onClick={() => setView('nueva_cuenta')}>+ Cuenta</button>
        <button className="btn btn-primary" onClick={() => setView('nuevo_mov')}>+ Movimiento</button>
      </PageHeader>
      <div className="p-5">

        {/* Métricas */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricCard label="Total disponible" value={formatPeso(totalActivos)} deltaColor="text-blue-600" />
          <MetricCard label="Efectivo" value={formatPeso(totalEfectivo)} deltaColor="text-green-600" />
          <MetricCard label="Banco" value={formatPeso(totalBanco)} />
          <MetricCard label="Ingresos este mes" value={formatPeso(ingresosMes)} delta={`Egresos: ${formatPeso(egresosMes)}`} deltaColor="text-gray-400" />
        </div>

        {/* Tarjetas de cuentas */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {cuentas.map(c => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: c.color + '20' }}>
                  <span style={{ fontSize: 16 }}>{TIPO_ICON[c.tipo] ?? '💰'}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">{c.nombre}</p>
                  <p className="text-xs text-gray-400">{TIPO_LABEL[c.tipo]}</p>
                </div>
              </div>
              <p className="text-xl font-medium" style={{ color: c.saldo_actual >= 0 ? '#1a1a18' : '#dc2626' }}>
                {formatPeso(c.saldo_actual)}
              </p>
              {c.moneda !== 'ARS' && <p className="text-xs text-gray-400">{c.moneda}</p>}
            </div>
          ))}
        </div>

        {/* Movimientos */}
        <div className="flex gap-3 mb-3">
          <select className="input w-44" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los movimientos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
            <option value="transferencia">Transferencias</option>
          </select>
          <select className="input w-48" value={filtroCuenta} onChange={e => setFiltroCuenta(e.target.value)}>
            <option value="">Todas las cuentas</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="card overflow-hidden">
          {loading ? <Spinner /> : movFiltrados.length === 0 ? <EmptyState message="Sin movimientos registrados" /> : (
            <Table headers={['Fecha', 'Cuenta', 'Categoría', 'Descripción', 'Monto', '']}>
              {movFiltrados.map(m => {
                const ct = m.cuentas as any
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="table-cell text-gray-500">{m.fecha}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 14 }}>{TIPO_ICON[ct?.tipo] ?? '💰'}</span>
                        <span className="text-sm">{ct?.nombre ?? '—'}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{m.categoria}</td>
                    <td className="table-cell text-gray-400 text-xs">{m.descripcion ?? '—'}</td>
                    <td className="table-cell font-medium" style={{
                      color: m.tipo === 'ingreso' ? '#16a34a' : m.tipo === 'egreso' ? '#dc2626' : '#2563EB'
                    }}>
                      {m.tipo === 'ingreso' ? '+' : m.tipo === 'egreso' ? '-' : '↔'}{formatPeso(m.monto)}
                    </td>
                    <td className="table-cell">
                      <Badge variant={m.tipo === 'ingreso' ? 'success' : m.tipo === 'egreso' ? 'danger' : 'info'}>
                        {m.tipo === 'ingreso' ? 'Ingreso' : m.tipo === 'egreso' ? 'Egreso' : 'Transferencia'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
        </div>
      </div>
    </div>
  )

  // ---- NUEVO MOVIMIENTO ----
  if (view === 'nuevo_mov') return (
    <div>
      <PageHeader title="Nuevo movimiento">
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5 max-w-lg">
        <form onSubmit={guardarMovimiento} className="card p-5 space-y-4">
          <div className="flex gap-3">
            <button type="button" className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${movForm.tipo === 'ingreso' ? 'bg-green-50 text-green-700 border-green-300' : 'border-gray-200 text-gray-500'}`}
              onClick={() => setMovForm((p: any) => ({ ...p, tipo: 'ingreso', categoria: '' }))}>
              + Ingreso
            </button>
            <button type="button" className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${movForm.tipo === 'egreso' ? 'bg-red-50 text-red-700 border-red-300' : 'border-gray-200 text-gray-500'}`}
              onClick={() => setMovForm((p: any) => ({ ...p, tipo: 'egreso', categoria: '' }))}>
              - Egreso
            </button>
          </div>

          <Select label="Cuenta *" value={movForm.cuenta_id} onChange={fm('cuenta_id')} required>
            <option value="">— Seleccionar —</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{TIPO_ICON[c.tipo]} {c.nombre} — {formatPeso(c.saldo_actual)}</option>)}
          </Select>

          <Select label="Categoría *" value={movForm.categoria} onChange={fm('categoria')} required>
            <option value="">— Seleccionar —</option>
            {(movForm.tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO).map(cat => (
              <option key={cat}>{cat}</option>
            ))}
          </Select>

          <Input label="Monto (ARS) *" type="number" min={0} step={0.01} value={movForm.monto} onChange={fm('monto')} required placeholder="0" />
          <Input label="Fecha" type="date" value={movForm.fecha} onChange={fm('fecha')} required />

          <div>
            <label className="label">Descripción</label>
            <textarea className="input min-h-[64px]" value={movForm.descripcion} onChange={fm('descripcion')} placeholder="Detalle del movimiento..." />
          </div>

          {movForm.cuenta_id && movForm.monto && (
            <div className={`p-3 rounded-lg text-sm ${movForm.tipo === 'ingreso' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              Saldo resultante: {formatPeso(
                (cuentas.find(c => c.id === movForm.cuenta_id)?.saldo_actual ?? 0) +
                (movForm.tipo === 'ingreso' ? Number(movForm.monto) : -Number(movForm.monto))
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar movimiento'}</button>
          </div>
        </form>
      </div>
    </div>
  )

  // ---- TRANSFERENCIA ----
  if (view === 'transferencia') return (
    <div>
      <PageHeader title="Transferencia entre cuentas">
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5 max-w-lg">
        <form onSubmit={guardarTransferencia} className="card p-5 space-y-4">
          <Select label="Cuenta origen *" value={transfForm.cuenta_origen_id} onChange={ft('cuenta_origen_id')} required>
            <option value="">— Seleccionar —</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{TIPO_ICON[c.tipo]} {c.nombre} — {formatPeso(c.saldo_actual)}</option>)}
          </Select>
          <Select label="Cuenta destino *" value={transfForm.cuenta_destino_id} onChange={ft('cuenta_destino_id')} required>
            <option value="">— Seleccionar —</option>
            {cuentas.filter(c => c.id !== transfForm.cuenta_origen_id).map(c => (
              <option key={c.id} value={c.id}>{TIPO_ICON[c.tipo]} {c.nombre} — {formatPeso(c.saldo_actual)}</option>
            ))}
          </Select>
          <Input label="Monto (ARS) *" type="number" min={0} step={0.01} value={transfForm.monto} onChange={ft('monto')} required placeholder="0" />
          <Input label="Fecha" type="date" value={transfForm.fecha} onChange={ft('fecha')} required />
          <div>
            <label className="label">Descripción</label>
            <input className="input" value={transfForm.descripcion} onChange={ft('descripcion')} placeholder="Motivo de la transferencia..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Transfiriendo...' : 'Confirmar transferencia'}</button>
          </div>
        </form>
      </div>
    </div>
  )

  // ---- NUEVA CUENTA ----
  if (view === 'nueva_cuenta') return (
    <div>
      <PageHeader title="Nueva cuenta">
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5 max-w-lg">
        <form onSubmit={guardarCuenta} className="card p-5 space-y-4">
          <Input label="Nombre de la cuenta *" value={cuentaForm.nombre} onChange={fc('nombre')} required placeholder="Ej: Santander, Caja chica..." />
          <Select label="Tipo *" value={cuentaForm.tipo} onChange={fc('tipo')}>
            <option value="efectivo">💵 Efectivo</option>
            <option value="banco">🏦 Cuenta bancaria</option>
            <option value="mercado_pago">💳 Mercado Pago</option>
            <option value="cheques">📄 Cheques</option>
            <option value="otra">💰 Otra</option>
          </Select>
          <Input label="Saldo inicial (ARS)" type="number" min={0} step={0.01} value={cuentaForm.saldo_inicial} onChange={fc('saldo_inicial')} placeholder="0" />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear cuenta'}</button>
          </div>
        </form>
      </div>
    </div>
  )

  return null
}
