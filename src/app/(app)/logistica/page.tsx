'use client'
// src/app/(app)/logistica/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Entrega, Cliente, Venta, Usuario } from '@/types'
import { PageHeader, Badge, Table, EmptyState, Spinner, MetricCard, Select, Input } from '@/components/ui'
import { formatFecha, PROVINCIAS, ESTADOS_ENTREGA_LABEL } from '@/lib/utils'

const supabase = createClient()

const estadoVariant: Record<string, any> = {
  pendiente: 'warning', asignado: 'info', en_camino: 'info',
  entregado: 'success', reprogramado: 'danger',
}

const COLS: Array<{ key: string; label: string }> = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'asignado', label: 'Asignado' },
  { key: 'en_camino', label: 'En camino' },
  { key: 'entregado', label: 'Entregado' },
]

export default function LogisticaPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ventasList, setVentasList] = useState<Venta[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [view, setView] = useState<'list' | 'new' | 'ficha'>('list')
  const [selected, setSelected] = useState<Entrega | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    venta_id: '', cliente_id: '', direccion: '', provincia: 'Buenos Aires',
    fecha_programada: '', turno: 'Mañana (8–13h)', responsable_id: '',
    vehiculo: '', requiere_armado: false, tipo_armado: '', accesorios: '', notas: '',
  }
  const [form, setForm] = useState<any>(emptyForm)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [e, c, v, u] = await Promise.all([
      supabase.from('entregas').select('*, clientes(apellido, nombre), ventas(numero)').order('fecha_programada'),
      supabase.from('clientes').select('id, apellido, nombre, domicilio, provincia').eq('activo', true).order('apellido'),
      supabase.from('ventas').select('id, numero, cliente_id').eq('tipo', 'venta').order('fecha', { ascending: false }),
      supabase.from('usuarios').select('id, nombre').eq('activo', true),
    ])
    setEntregas((e.data ?? []) as any)
setClientes((c.data ?? []) as any)
setVentasList((v.data ?? []) as any)
setUsuarios((u.data ?? []) as any)
    setLoading(false)
  }

  const entregasFiltradas = entregas.filter(e => {
    const cl = e.clientes as any
    const q = busqueda.toLowerCase()
    const mq = !q || ((cl?.apellido ?? '') + (cl?.nombre ?? '') + e.numero + e.direccion).toLowerCase().includes(q)
    const me = !filtroEst || e.estado === filtroEst
    return mq && me
  })

  async function guardarEntrega(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    await supabase.from('entregas').insert({ ...form, estado: 'pendiente' })
    setSaving(false)
    setForm(emptyForm)
    setView('list')
    fetchAll()
  }

  async function cambiarEstado(id: string, estado: string) {
    const update: any = { estado }
    if (estado === 'entregado') update.fecha_entrega_real = new Date().toISOString()
    await supabase.from('entregas').update(update).eq('id', id)
    fetchAll()
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, estado: estado as any } : null)
  }

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev: any) => ({ ...prev, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const hoy = entregas.filter(e => e.fecha_programada === new Date().toISOString().split('T')[0]).length
  const enCamino = entregas.filter(e => e.estado === 'en_camino').length
  const entregadas = entregas.filter(e => e.estado === 'entregado').length
  const sinAsignar = entregas.filter(e => e.estado === 'pendiente' && !e.responsable_id).length

  // ---- LISTA ----
  if (view === 'list') return (
    <div>
      <PageHeader title="Logística">
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setView('new') }}>+ Nueva entrega</button>
      </PageHeader>
      <div className="p-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricCard label="Entregas hoy" value={hoy} />
          <MetricCard label="En camino ahora" value={enCamino} deltaColor={enCamino > 0 ? 'text-blue-500' : 'text-gray-400'} />
          <MetricCard label="Completadas" value={entregadas} deltaColor="text-green-500" />
          <MetricCard label="Sin asignar" value={sinAsignar} deltaColor={sinAsignar > 0 ? 'text-amber-500' : 'text-gray-400'} />
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {COLS.map(col => {
            const items = entregas.filter(e => e.estado === col.key)
            return (
              <div key={col.key} className="bg-gray-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {col.label} <span className="font-normal text-gray-400">({items.length})</span>
                </p>
                {items.map(e => {
                  const cl = e.clientes as any
                  const vt = e.ventas as any
                  return (
                    <div key={e.id} className="bg-white rounded-lg border border-gray-100 p-3 mb-2 cursor-pointer hover:border-blue-300 transition-colors"
                      onClick={() => { setSelected(e); setView('ficha') }}>
                      <p className="font-mono text-xs text-gray-400">{e.numero}</p>
                      <p className="font-medium text-sm mt-0.5">{cl ? `${cl.apellido}, ${cl.nombre}` : '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{vt?.numero ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-1">{e.fecha_programada} · {e.responsable_id ? '✓ asignado' : <span className="text-amber-500">sin asignar</span>}</p>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 mb-3">
          <input className="input flex-1" placeholder="Buscar por cliente, N° o dirección..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select className="input w-44" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_ENTREGA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="card overflow-hidden">
          {loading ? <Spinner /> : entregasFiltradas.length === 0 ? <EmptyState message="No hay entregas" /> : (
            <Table headers={['N°', 'Cliente', 'Dirección', 'Fecha', 'Responsable', 'Estado', '']}>
              {entregasFiltradas.map(e => {
                const cl = e.clientes as any
                const resp = usuarios.find(u => u.id === e.responsable_id)
                return (
                  <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelected(e); setView('ficha') }}>
                    <td className="table-cell font-mono text-xs">{e.numero}</td>
                    <td className="table-cell">{cl ? `${cl.apellido}, ${cl.nombre}` : '—'}</td>
                    <td className="table-cell text-gray-500 text-xs">{e.direccion}, {e.provincia}</td>
                    <td className="table-cell">{e.fecha_programada}</td>
                    <td className="table-cell" style={{ color: !e.responsable_id ? '#d97706' : undefined }}>
                      {resp?.nombre ?? 'Sin asignar'}
                    </td>
                    <td className="table-cell"><Badge variant={estadoVariant[e.estado]}>{ESTADOS_ENTREGA_LABEL[e.estado]}</Badge></td>
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

  // ---- NUEVA ENTREGA ----
  if (view === 'new') return (
    <div>
      <PageHeader title="Nueva entrega">
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5 max-w-2xl">
        <form onSubmit={guardarEntrega} className="space-y-4">
          <div className="card p-5">
            <p className="section-title mt-0">Datos de la entrega</p>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Venta asociada *" value={form.venta_id} onChange={e => {
                const v = ventasList.find(vt => vt.id === e.target.value)
                const cl = v ? clientes.find(c => c.id === v.cliente_id) : null
                setForm((p: any) => ({
                  ...p, venta_id: e.target.value,
                  cliente_id: cl?.id ?? p.cliente_id,
                  direccion: cl?.domicilio ?? p.direccion,
                  provincia: cl?.provincia ?? p.provincia,
                }))
              }} required>
                <option value="">— Seleccionar —</option>
                {ventasList.map(v => <option key={v.id} value={v.id}>{v.numero}</option>)}
              </Select>
              <Select label="Cliente *" value={form.cliente_id} onChange={f('cliente_id')} required>
                <option value="">— Seleccionar —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.apellido}, {c.nombre}</option>)}
              </Select>
              <div className="col-span-2">
                <Input label="Dirección de entrega *" value={form.direccion} onChange={f('direccion')} required />
              </div>
              <Select label="Provincia" value={form.provincia} onChange={f('provincia')}>
                {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
              </Select>
              <Input label="Fecha *" type="date" value={form.fecha_programada} onChange={f('fecha_programada')} required />
              <Select label="Turno" value={form.turno} onChange={f('turno')}>
                <option>Mañana (8–13h)</option>
                <option>Tarde (13–18h)</option>
                <option>Todo el día</option>
                <option>A confirmar</option>
              </Select>
              <Select label="Responsable" value={form.responsable_id} onChange={f('responsable_id')}>
                <option value="">— Sin asignar —</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </Select>
              <Input label="Vehículo" value={form.vehiculo} onChange={f('vehiculo')} placeholder="Furgón blanco (AAA 123)" />
            </div>
          </div>
          <div className="card p-5">
            <p className="section-title mt-0">Armado y preparación</p>
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="req_armado" checked={form.requiere_armado} onChange={f('requiere_armado')} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="req_armado" className="text-sm text-gray-700">Requiere armado en destino</label>
            </div>
            {form.requiere_armado && (
              <Select label="Tipo de armado" value={form.tipo_armado} onChange={f('tipo_armado')}>
                <option value="">Seleccionar</option>
                <option>Armado básico</option>
                <option>Armado completo con demostración</option>
              </Select>
            )}
            <div className="mt-3">
              <Input label="Accesorios a entregar" value={form.accesorios} onChange={f('accesorios')} placeholder="Cargador, manual, cesta..." />
            </div>
          </div>
          <div className="card p-5">
            <p className="section-title mt-0">Notas para el repartidor</p>
            <textarea className="input min-h-[72px]" value={form.notas} onChange={f('notas')} placeholder="Piso, timbre, referencia de acceso, necesidades del cliente..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Programar entrega'}</button>
          </div>
        </form>
      </div>
    </div>
  )

  // ---- FICHA ----
  if (view === 'ficha' && selected) {
    const cl = selected.clientes as any
    const vt = selected.ventas as any
    const resp = usuarios.find(u => u.id === selected.responsable_id)
    return (
      <div>
        <PageHeader title={selected.numero}>
          <button className="btn" onClick={() => setView('list')}>← Volver</button>
          {selected.estado !== 'entregado' && (
            <button className="btn btn-success" onClick={() => cambiarEstado(selected.id, 'entregado')}>
              ✓ Marcar como entregado
            </button>
          )}
        </PageHeader>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <p className="font-medium">{cl ? `${cl.apellido}, ${cl.nombre}` : '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{vt?.numero ?? '—'}</p>
                </div>
                <Badge variant={estadoVariant[selected.estado]}>{ESTADOS_ENTREGA_LABEL[selected.estado]}</Badge>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Dirección', `${selected.direccion}, ${selected.provincia}`],
                  ['Fecha programada', selected.fecha_programada],
                  ['Turno', selected.turno ?? '—'],
                  ['Responsable', resp?.nombre ?? 'Sin asignar'],
                  ['Vehículo', selected.vehiculo ?? '—'],
                  ['Requiere armado', selected.requiere_armado ? (selected.tipo_armado ?? 'Sí') : 'No'],
                  ['Accesorios', selected.accesorios ?? '—'],
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                    <p>{v}</p>
                  </div>
                ))}
                {selected.notas && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Notas</p>
                    <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{selected.notas}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="card p-4">
                <p className="text-xs font-medium text-gray-700 mb-3">Cambiar estado</p>
                <div className="space-y-2">
                  {(['pendiente', 'asignado', 'en_camino', 'entregado', 'reprogramado'] as const).map(est => (
                    <button key={est} className={`btn w-full btn-sm ${selected.estado === est ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
                      onClick={() => cambiarEstado(selected.id, est)}>
                      {ESTADOS_ENTREGA_LABEL[est]}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn w-full btn-sm">Imprimir remito</button>
              <button className="btn w-full btn-sm">Avisar al cliente (WhatsApp)</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
