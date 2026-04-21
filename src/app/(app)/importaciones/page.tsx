'use client'
// src/app/(app)/importaciones/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Importacion, Proveedor, Producto } from '@/types'
import { PageHeader, Badge, Table, EmptyState, Spinner, MetricCard, Select, Input } from '@/components/ui'
import { formatPeso, formatFecha } from '@/lib/utils'

const supabase = createClient()

const estadoVariant: Record<string, any> = {
  pendiente: 'gray', en_transito: 'info', en_aduana: 'warning', demorada: 'danger', recibida: 'success',
}
const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_transito: 'En tránsito', en_aduana: 'En aduana', demorada: 'Demorada', recibida: 'Recibida',
}

export default function ImportacionesPage() {
  const [importaciones, setImportaciones] = useState<Importacion[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [view, setView] = useState<'list' | 'new' | 'ficha' | 'proveedores'>('list')
  const [selected, setSelected] = useState<Importacion | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    proveedor_id: '', tipo_carga: 'Marítima LCL', numero_tracking: '',
    despachante: '', fecha_orden: new Date().toISOString().split('T')[0],
    eta: '', costo_fob_usd: '', costo_flete_usd: '', costo_seguro_usd: '',
    gastos_locales_ars: '', notas: '',
  }
  const [form, setForm] = useState<any>(emptyForm)
  const [items, setItems] = useState([{ producto_id: '', cantidad: 1, precio_unit_usd: '' }])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [im, pr, pd] = await Promise.all([
      supabase.from('importaciones').select('*, proveedores(nombre, pais)').order('created_at', { ascending: false }),
      supabase.from('proveedores').select('*').eq('activo', true).order('nombre'),
      supabase.from('productos').select('id, nombre, codigo').eq('activo', true).order('nombre'),
    ])
setImportaciones((im.data ?? []) as any)
setProveedores((pr.data ?? []) as any)
setProductos((pd.data ?? []) as any)
    setLoading(false)
  }

  const filtradas = importaciones.filter(i => {
    const pv = i.proveedores as any
    const q = busqueda.toLowerCase()
    const mq = !q || (i.numero + (pv?.nombre ?? '')).toLowerCase().includes(q)
    const me = !filtroEst || i.estado === filtroEst
    return mq && me
  })

  async function guardarImportacion(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    const payload: any = {
      proveedor_id: form.proveedor_id,
      tipo_carga: form.tipo_carga || null,
      numero_tracking: form.numero_tracking || null,
      despachante: form.despachante || null,
      fecha_orden: form.fecha_orden,
      eta: form.eta || null,
      costo_fob_usd: Number(form.costo_fob_usd) || 0,
      costo_flete_usd: Number(form.costo_flete_usd) || 0,
      costo_seguro_usd: Number(form.costo_seguro_usd) || 0,
      gastos_locales_ars: Number(form.gastos_locales_ars) || 0,
      estado: 'pendiente',
      notas: form.notas || null,
    }
    const { data: imp, error } = await supabase
      .from('importaciones')
      .insert(payload)
      .select()
      .single()
    console.log('Importacion guardada:', imp, 'Error:', error)
    if (!error && imp) {
      const itemsData = items.filter(i => i.producto_id).map(i => ({
        importacion_id: imp.id,
        producto_id: i.producto_id,
        cantidad: Number(i.cantidad),
        precio_unit_usd: Number(i.precio_unit_usd) || 0,
      }))
      if (itemsData.length) await supabase.from('items_importacion').insert(itemsData)
    }
    setSaving(false)
    setForm(emptyForm)
    setItems([{ producto_id: '', cantidad: 1, precio_unit_usd: '' }])
    setView('list')
    fetchAll()
  }

  async function recibirImportacion(id: string) {
    if (!confirm('¿Confirmar recepción de esta importación? Se actualizará el stock de cada producto.')) return
    const { data: importacion } = await supabase.from('importaciones').select('*, items_importacion(*, productos(*))').eq('id', id).single()
    if (!importacion) return

    await supabase.from('importaciones').update({ estado: 'recibida', fecha_recepcion: new Date().toISOString().split('T')[0] }).eq('id', id)

    for (const item of (importacion.items_importacion ?? [])) {
      const prod = item.productos as any
      if (!prod) continue
      await supabase.from('movimientos_stock').insert({
        producto_id: item.producto_id,
        tipo: 'entrada',
        cantidad: item.cantidad,
        stock_resultante: prod.stock_actual + item.cantidad,
        motivo: `Importación ${importacion.numero}`,
        importacion_id: id,
      })
    }
    fetchAll()
    setView('list')
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('importaciones').update({ estado }).eq('id', id)
    fetchAll()
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, estado: estado as any } : null)
  }

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev: any) => ({ ...prev, [key]: e.target.value }))

  const activas = importaciones.filter(i => i.estado !== 'recibida').length
  const unidadesTransito = 0 // se calcularía con join a items
  const demoradas = importaciones.filter(i => i.estado === 'demorada').length

  // ---- LISTA ----
  if (view === 'list') return (
    <div>
      <PageHeader title="Importaciones">
        <button className="btn" onClick={() => setView('proveedores')}>Proveedores</button>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setItems([{ producto_id: '', cantidad: 1, precio_unit_usd: '' }]); setView('new') }}>+ Nueva orden</button>
      </PageHeader>
      <div className="p-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricCard label="Órdenes activas" value={activas} />
          <MetricCard label="En tránsito" value={importaciones.filter(i => i.estado === 'en_transito').length} deltaColor="text-blue-500" />
          <MetricCard label="Total órdenes" value={importaciones.length} />
          <MetricCard label="Demoradas" value={demoradas} deltaColor={demoradas > 0 ? 'text-red-500' : 'text-gray-400'} />
        </div>
        <div className="flex gap-3 mb-4">
          <input className="input flex-1" placeholder="Buscar por N° de orden o proveedor..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select className="input w-44" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(estadoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="card overflow-hidden">
          {loading ? <Spinner /> : filtradas.length === 0 ? <EmptyState message="No hay órdenes de importación" /> : (
            <Table headers={['N° Orden', 'Proveedor', 'Origen', 'Fecha orden', 'ETA', 'Estado', '']}>
              {filtradas.map(i => {
                const pv = i.proveedores as any
                return (
                  <tr key={i.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelected(i); setView('ficha') }}>
                    <td className="table-cell font-mono text-xs">{i.numero}</td>
                    <td className="table-cell font-medium">{pv?.nombre ?? '—'}</td>
                    <td className="table-cell text-gray-500">{pv?.pais ?? '—'}</td>
                    <td className="table-cell">{i.fecha_orden}</td>
                    <td className="table-cell">{i.fecha_recepcion ?? i.eta ?? '—'}</td>
                    <td className="table-cell"><Badge variant={estadoVariant[i.estado]}>{estadoLabel[i.estado]}</Badge></td>
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

  // ---- PROVEEDORES ----
  if (view === 'proveedores') return (
    <div>
      <PageHeader title="Proveedores">
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5">
        <div className="card overflow-hidden mb-5">
          <Table headers={['Proveedor', 'País', 'Contacto', 'Lead time', 'Moneda', 'Confiabilidad']}>
            {proveedores.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{p.nombre}</td>
                <td className="table-cell">{p.pais}</td>
                <td className="table-cell text-blue-600 text-xs">{p.contacto_email ?? '—'}</td>
                <td className="table-cell">{p.lead_time_dias ? `${p.lead_time_dias} días` : '—'}</td>
                <td className="table-cell">{p.moneda}</td>
                <td className="table-cell">
                  <Badge variant={p.confiabilidad === 'alta' ? 'success' : p.confiabilidad === 'media' ? 'warning' : 'danger'}>
                    {p.confiabilidad.charAt(0).toUpperCase() + p.confiabilidad.slice(1)}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <div className="card p-5">
          <p className="font-medium text-sm mb-4">Costos de importación — referencia (posición 8713)</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ['Arancel importación', '20%'], ['IVA importación', '21%'],
              ['IVA adicional', '10.5%'], ['Tasa estadística', '3%'],
              ['Ganancias anticipo', '6%'], ['Seguro de carga', '~1.5%'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">{l}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ---- NUEVA ORDEN ----
  if (view === 'new') return (
    <div>
      <PageHeader title="Nueva orden de importación">
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5">
        <form onSubmit={guardarImportacion} className="space-y-4">
          <div className="card p-5">
            <p className="section-title mt-0">Proveedor y origen</p>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Proveedor *" value={form.proveedor_id} onChange={f('proveedor_id')} required>
                <option value="">— Seleccionar —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.pais})</option>)}
              </Select>
              <Select label="Tipo de carga" value={form.tipo_carga} onChange={f('tipo_carga')}>
                <option>Marítima LCL</option><option>Marítima FCL</option>
                <option>Aérea</option><option>Terrestre</option>
              </Select>
              <Input label="N° Tracking / BL" value={form.numero_tracking} onChange={f('numero_tracking')} placeholder="MSKU1234567890" />
              <Input label="Despachante de aduana" value={form.despachante} onChange={f('despachante')} />
              <Input label="Fecha de orden" type="date" value={form.fecha_orden} onChange={f('fecha_orden')} required />
              <Input label="ETA estimada" type="date" value={form.eta} onChange={f('eta')} />
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title mt-0">Productos</p>
            {items.map((item, i) => (
              <div key={i} className="flex gap-3 mb-3 items-end">
                <div className="flex-1">
                  <Select label={i === 0 ? 'Producto' : undefined} value={item.producto_id} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, producto_id: e.target.value } : it))}>
                    <option value="">— Seleccionar —</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
                  </Select>
                </div>
                <div className="w-20">
                  <Input label={i === 0 ? 'Cant.' : undefined} type="number" min={1} value={item.cantidad} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, cantidad: Number(e.target.value) } : it))} />
                </div>
                <div className="w-32">
                  <Input label={i === 0 ? 'P. unit. USD' : undefined} type="number" value={item.precio_unit_usd} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, precio_unit_usd: e.target.value } : it))} />
                </div>
                {items.length > 1 && <button type="button" className="btn btn-sm mb-0.5 text-red-500" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={() => setItems(prev => [...prev, { producto_id: '', cantidad: 1, precio_unit_usd: '' }])}>+ Agregar producto</button>
          </div>

          <div className="card p-5">
            <p className="section-title mt-0">Costos</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="FOB (USD)" type="number" value={form.costo_fob_usd} onChange={f('costo_fob_usd')} />
              <Input label="Flete (USD)" type="number" value={form.costo_flete_usd} onChange={f('costo_flete_usd')} />
              <Input label="Seguro (USD)" type="number" value={form.costo_seguro_usd} onChange={f('costo_seguro_usd')} />
              <Input label="Gastos locales (ARS)" type="number" value={form.gastos_locales_ars} onChange={f('gastos_locales_ars')} />
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title mt-0">Notas</p>
            <textarea className="input min-h-[64px]" value={form.notas} onChange={f('notas')} placeholder="Instrucciones, condiciones de pago al proveedor..." />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear orden'}</button>
          </div>
        </form>
      </div>
    </div>
  )

  // ---- FICHA ----
  if (view === 'ficha' && selected) {
    const pv = selected.proveedores as any
    const cif = selected.costo_fob_usd + selected.costo_flete_usd + selected.costo_seguro_usd
    return (
      <div>
        <PageHeader title={selected.numero}>
          <button className="btn" onClick={() => setView('list')}>← Volver</button>
          {selected.estado !== 'recibida' && (
            <button className="btn btn-success" onClick={() => recibirImportacion(selected.id)}>
              ✓ Registrar recepción
            </button>
          )}
        </PageHeader>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">{pv?.nombre ?? '—'}</p>
                    <p className="text-xs text-gray-500">{pv?.pais ?? '—'} · {selected.tipo_carga}</p>
                  </div>
                  <Badge variant={estadoVariant[selected.estado]}>{estadoLabel[selected.estado]}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['N° Tracking', selected.numero_tracking ?? '—'],
                    ['Despachante', selected.despachante ?? '—'],
                    ['Fecha de orden', selected.fecha_orden],
                    ['ETA estimada', selected.eta ?? '—'],
                    ['Recepción real', selected.fecha_recepcion ?? 'Pendiente'],
                  ].map(([l, v]) => (
                    <div key={l as string}>
                      <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                      <p className={l === 'N° Tracking' ? 'font-mono text-xs' : ''}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-5">
                <p className="font-medium text-sm mb-3">Estructura de costos</p>
                <div className="space-y-2 text-sm">
                  {[
                    ['FOB', `USD ${selected.costo_fob_usd.toLocaleString()}`],
                    ['Flete', `USD ${selected.costo_flete_usd.toLocaleString()}`],
                    ['Seguro', `USD ${selected.costo_seguro_usd.toLocaleString()}`],
                    ['CIF total', `USD ${cif.toLocaleString()}`],
                    ['Gastos locales', formatPeso(selected.gastos_locales_ars)],
                  ].map(([l, v], idx) => (
                    <div key={l as string} className={`flex justify-between py-1.5 ${idx === 3 ? 'border-t border-b border-gray-100 font-medium' : 'border-b border-gray-50'}`}>
                      <span className={idx === 3 ? '' : 'text-gray-500'}>{l}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="card p-4">
    <p className="text-xs font-medium text-gray-700 mb-3">Actualizar estado</p>
    <div className="space-y-2">
      {Object.entries(estadoLabel).map(([k, v]) => (
        <button key={k} className={`btn w-full btn-sm ${selected.estado === k ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
          onClick={() => cambiarEstado(selected.id, k)}>
          {v}
        </button>
      ))}
    </div>
  </div>
  <button
    className="btn w-full btn-sm text-red-600 border-red-200 hover:bg-red-50"
    onClick={async () => {
      if (!confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return
      await supabase.from('items_importacion').delete().eq('importacion_id', selected.id)
      await supabase.from('importaciones').delete().eq('id', selected.id)
      setView('list')
      fetchAll()
    }}>
    Eliminar orden
  </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
