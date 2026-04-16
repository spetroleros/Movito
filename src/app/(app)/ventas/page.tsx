'use client'
// src/app/(app)/ventas/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Venta, Cliente, Producto } from '@/types'
import { PageHeader, Badge, Table, EmptyState, Spinner, MetricCard, Select, Input } from '@/components/ui'
import { formatPeso, formatFecha, ESTADOS_VENTA_LABEL } from '@/lib/utils'

const supabase = createClient()

const estadoVariant: Record<string, any> = {
  cobrado: 'success', financiado: 'info', pendiente: 'warning',
  presupuesto: 'gray', cancelado: 'danger',
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [view, setView] = useState<'list' | 'new' | 'ficha'>('list')
  const [selected, setSelected] = useState<Venta | null>(null)
  const [saving, setSaving] = useState(false)
  const [tipoNueva, setTipoNueva] = useState<'venta' | 'presupuesto'>('venta')

  // Formulario nueva venta
  const [clienteId, setClienteId] = useState('')
  const [formaPago, setFormaPago] = useState('contado')
  const [items, setItems] = useState([{ producto_id: '', cantidad: 1 }])
  const [notas, setNotas] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [v, c, p] = await Promise.all([
      supabase.from('ventas').select('*, clientes(apellido, nombre)').order('fecha', { ascending: false }),
      supabase.from('clientes').select('*').eq('activo', true).order('apellido'),
      supabase.from('productos').select('*').eq('activo', true).order('nombre'),
    ])
    setVentas(v.data ?? [])
    setClientes(c.data ?? [])
    setProductos(p.data ?? [])
    setLoading(false)
  }

  const ventasFiltradas = ventas.filter(v => {
    const cl = v.clientes as any
    const q = busqueda.toLowerCase()
    const mq = !q || ((cl?.apellido ?? '') + (cl?.nombre ?? '') + v.numero).toLowerCase().includes(q)
    const me = !filtroEst || v.estado === filtroEst
    return mq && me
  })

  function clienteSeleccionado(): Cliente | undefined {
    return clientes.find(c => c.id === clienteId)
  }

  function calcularTotales() {
    let subtotal = 0
    for (const item of items) {
      const prod = productos.find(p => p.id === item.producto_id)
      if (prod) subtotal += prod.precio_venta * item.cantidad
    }
    const cl = clienteSeleccionado()
    const pct = cl?.tiene_cud ? cl.descuento_cud : 0
    const descuento = Math.round(subtotal * pct / 100)
    return { subtotal, descuento, total: subtotal - descuento, pct }
  }

  async function guardarVenta(e: React.FormEvent, tipo: 'venta' | 'presupuesto') {
    e.preventDefault()
    if (!clienteId) return
    setSaving(true)
    const cl = clienteSeleccionado()
    const { subtotal, descuento, total, pct } = calcularTotales()

    const { data: venta, error } = await supabase.from('ventas').insert({
      tipo,
      cliente_id: clienteId,
      descuento_cud_aplicado: (cl?.tiene_cud && pct > 0) ?? false,
      porcentaje_descuento: pct,
      subtotal, monto_descuento: descuento, total,
      forma_pago: formaPago,
      estado: tipo === 'presupuesto' ? 'presupuesto' : 'pendiente',
      notas,
    }).select().single()

    if (!error && venta) {
      const itemsData = items
        .filter(i => i.producto_id)
        .map(i => {
          const prod = productos.find(p => p.id === i.producto_id)!
          return {
            venta_id: venta.id,
            producto_id: i.producto_id,
            cantidad: i.cantidad,
            precio_unitario: prod.precio_venta,
            subtotal: prod.precio_venta * i.cantidad,
          }
        })
      await supabase.from('items_venta').insert(itemsData)

      // Descontar stock si es venta confirmada
      if (tipo === 'venta') {
        for (const item of itemsData) {
          const prod = productos.find(p => p.id === item.producto_id)!
          await supabase.from('movimientos_stock').insert({
            producto_id: item.producto_id,
            tipo: 'salida',
            cantidad: -item.cantidad,
            stock_resultante: prod.stock_actual - item.cantidad,
            motivo: `Venta ${venta.numero}`,
            venta_id: venta.id,
          })
        }
      }
    }

    setSaving(false)
    setItems([{ producto_id: '', cantidad: 1 }])
    setClienteId('')
    setNotas('')
    setView('list')
    fetchAll()
  }

  function agregarItem() {
    setItems(prev => [...prev, { producto_id: '', cantidad: 1 }])
  }
  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateItem(i: number, key: string, val: any) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  }

  const { subtotal, descuento, total, pct } = calcularTotales()

  const facturado = ventas.filter(v => v.tipo === 'venta').reduce((a, v) => a + v.total, 0)
  const presupuestos = ventas.filter(v => v.estado === 'presupuesto').length
  const pendientes = ventas.filter(v => v.estado === 'pendiente').length

  // ---- LISTA ----
  if (view === 'list') return (
    <div>
      <PageHeader title="Ventas">
        <button className="btn" onClick={() => { setTipoNueva('presupuesto'); setView('new') }}>+ Presupuesto</button>
        <button className="btn btn-primary" onClick={() => { setTipoNueva('venta'); setView('new') }}>+ Nueva venta</button>
      </PageHeader>
      <div className="p-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricCard label="Facturado total" value={formatPeso(facturado)} />
          <MetricCard label="Ventas registradas" value={ventas.filter(v => v.tipo === 'venta').length} />
          <MetricCard label="Presupuestos activos" value={presupuestos} />
          <MetricCard label="Pendientes de cobro" value={pendientes} deltaColor="text-amber-500" />
        </div>
        <div className="flex gap-3 mb-4">
          <input className="input flex-1" placeholder="Buscar por cliente o N° de venta..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select className="input w-44" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_VENTA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="card overflow-hidden">
          {loading ? <Spinner /> : ventasFiltradas.length === 0 ? <EmptyState message="No hay ventas registradas" /> : (
            <Table headers={['N°', 'Fecha', 'Cliente', 'Total', 'Pago', 'Estado', '']}>
              {ventasFiltradas.map(v => {
                const cl = v.clientes as any
                return (
                  <tr key={v.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelected(v); setView('ficha') }}>
                    <td className="table-cell font-mono text-xs">{v.numero}</td>
                    <td className="table-cell text-gray-500">{formatFecha(v.fecha)}</td>
                    <td className="table-cell">
                      {cl ? `${cl.apellido}, ${cl.nombre}` : '—'}
                    </td>
                    <td className="table-cell font-medium">
                      {formatPeso(v.total)}
                      {v.descuento_cud_aplicado && <span className="ml-1 text-xs text-green-600">-{v.porcentaje_descuento}% CUD</span>}
                    </td>
                    <td className="table-cell text-gray-500 capitalize">{v.forma_pago}</td>
                    <td className="table-cell"><Badge variant={estadoVariant[v.estado]}>{ESTADOS_VENTA_LABEL[v.estado]}</Badge></td>
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

  // ---- NUEVA VENTA / PRESUPUESTO ----
  if (view === 'new') return (
    <div>
      <PageHeader title={tipoNueva === 'venta' ? 'Nueva venta' : 'Nuevo presupuesto'}>
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5">
        <form onSubmit={e => guardarVenta(e, tipoNueva)}>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <div className="card p-5">
                <p className="section-title mt-0">Cliente</p>
                <Select label="Seleccionar cliente *" value={clienteId} onChange={e => setClienteId(e.target.value)} required>
                  <option value="">— Seleccionar —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.apellido}, {c.nombre} — DNI {c.dni}</option>
                  ))}
                </Select>
                {clienteSeleccionado()?.tiene_cud && (
                  <div className="mt-3 p-2.5 bg-green-50 rounded-lg text-sm text-green-700 flex items-center justify-between">
                    <span>Descuento CUD habilitado</span>
                    <span className="font-medium">{clienteSeleccionado()?.descuento_cud}% OFF</span>
                  </div>
                )}
              </div>

              <div className="card p-5">
                <p className="section-title mt-0">Productos</p>
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3 mb-3 items-end">
                    <div className="flex-1">
                      <Select label={i === 0 ? 'Producto' : undefined} value={item.producto_id} onChange={e => updateItem(i, 'producto_id', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {productos.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} — {formatPeso(p.precio_venta)} (stock: {p.stock_actual})</option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-20">
                      <Input label={i === 0 ? 'Cant.' : undefined} type="number" min={1} value={item.cantidad} onChange={e => updateItem(i, 'cantidad', Number(e.target.value))} />
                    </div>
                    {items.length > 1 && (
                      <button type="button" className="btn btn-sm mb-0.5 text-red-500" onClick={() => removeItem(i)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-sm mt-1" onClick={agregarItem}>+ Agregar producto</button>
              </div>

              <div className="card p-5">
                <p className="section-title mt-0">Forma de pago</p>
                <Select value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                  <option value="contado">Contado</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="financiado">Financiado</option>
                  <option value="señado">Señado</option>
                </Select>
                <div className="mt-4">
                  <label className="label">Notas internas</label>
                  <textarea className="input min-h-[64px]" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
                </div>
              </div>
            </div>

            <div>
              <div className="card p-5 sticky top-4">
                <p className="font-medium text-sm text-gray-800 mb-4">
                  {tipoNueva === 'venta' ? 'Resumen de venta' : 'Resumen de presupuesto'}
                </p>
                {pct > 0 && (
                  <div className="mb-3 p-2.5 bg-green-50 rounded-lg flex items-center justify-between text-sm">
                    <span className="text-green-700">Descuento CUD {pct}%</span>
                    <span className="font-medium text-green-700">-{formatPeso(descuento)}</span>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatPeso(subtotal)}</span></div>
                  {descuento > 0 && <div className="flex justify-between text-sm text-green-600"><span>Descuento CUD</span><span>-{formatPeso(descuento)}</span></div>}
                  <div className="flex justify-between font-medium text-blue-700 pt-2 border-t border-gray-200"><span>Total</span><span>{formatPeso(total)}</span></div>
                </div>
                <div className="mt-4 space-y-2">
                  <button type="submit" className="btn btn-primary w-full" disabled={saving || !clienteId}>
                    {saving ? 'Guardando...' : tipoNueva === 'venta' ? 'Confirmar venta' : 'Guardar presupuesto'}
                  </button>
                  {tipoNueva === 'venta' && (
                    <button type="button" className="btn w-full" onClick={e => guardarVenta(e as any, 'presupuesto')} disabled={saving}>
                      Guardar como presupuesto
                    </button>
                  )}
                </div>
                {tipoNueva === 'presupuesto' && (
                  <p className="text-xs text-gray-400 mt-2 text-center">Válido por 7 días</p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  // ---- FICHA ----
  if (view === 'ficha' && selected) {
    const cl = selected.clientes as any
    return (
      <div>
        <PageHeader title={selected.numero}>
          <button className="btn" onClick={() => setView('list')}>← Volver</button>
        </PageHeader>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <p className="font-medium">{cl ? `${cl.apellido}, ${cl.nombre}` : '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatFecha(selected.fecha)} — {selected.tipo === 'venta' ? 'Venta' : 'Presupuesto'}</p>
                </div>
                <Badge variant={estadoVariant[selected.estado]}>{ESTADOS_VENTA_LABEL[selected.estado]}</Badge>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="text-gray-400">Forma de pago</span><p className="mt-0.5 capitalize">{selected.forma_pago}</p></div>
                  <div><span className="text-gray-400">Subtotal</span><p className="mt-0.5">{formatPeso(selected.subtotal)}</p></div>
                  {selected.descuento_cud_aplicado && (
                    <div><span className="text-gray-400">Descuento CUD</span><p className="mt-0.5 text-green-600">-{formatPeso(selected.monto_descuento)} ({selected.porcentaje_descuento}%)</p></div>
                  )}
                  <div><span className="text-gray-400">Total</span><p className="mt-0.5 font-medium text-blue-700 text-base">{formatPeso(selected.total)}</p></div>
                </div>
                {selected.notas && <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{selected.notas}</p>}
              </div>
            </div>
            <div className="space-y-3">
              <div className="card p-4">
                <p className="text-xs font-medium text-gray-700 mb-3">Acciones</p>
                <div className="space-y-2">
                  {selected.estado === 'pendiente' && (
                    <button className="btn btn-success w-full btn-sm" onClick={async () => {
                      await supabase.from('ventas').update({ estado: 'cobrado' }).eq('id', selected.id)
                      fetchAll(); setView('list')
                    }}>Marcar como cobrado</button>
                  )}
                  {selected.estado === 'presupuesto' && (
                    <button className="btn btn-primary w-full btn-sm" onClick={async () => {
                      await supabase.from('ventas').update({ tipo: 'venta', estado: 'pendiente' }).eq('id', selected.id)
                      fetchAll(); setView('list')
                    }}>Convertir a venta</button>
                  )}
                  <button className="btn w-full btn-sm">Imprimir / PDF</button>
                  <button className="btn w-full btn-sm">Programar entrega</button>
                  {selected.forma_pago === 'financiado' && (
                    <button className="btn w-full btn-sm">Crear plan de financiación</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
