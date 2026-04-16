'use client'
// src/app/(app)/inventario/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Producto, MovimientoStock } from '@/types'
import { PageHeader, Badge, Table, EmptyState, Spinner, Input, Select, MetricCard } from '@/components/ui'
import { formatPeso } from '@/lib/utils'

const supabase = createClient()

function stockBadge(p: Producto) {
  if (p.stock_actual === 0) return <Badge variant="danger">Sin stock</Badge>
  if (p.stock_actual < p.stock_minimo) return <Badge variant="warning">Bajo mínimo</Badge>
  return <Badge variant="success">Stock OK</Badge>
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [view, setView] = useState<'list' | 'new' | 'ficha' | 'movimiento'>('list')
  const [selected, setSelected] = useState<Producto | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    codigo: '', nombre: '', categoria: '', marca: '', origen: '',
    posicion_arancelaria: '8713.10.00', carga_max_kg: '', autonomia_km: '',
    velocidad_max_kmh: '', bateria: '', colores: '',
    stock_actual: 0, stock_minimo: 3, precio_costo: '', precio_venta: '', notas: '',
  }
  const [form, setForm] = useState<any>(emptyForm)

  const emptyMov = { tipo: 'entrada', cantidad: 1, motivo: '' }
  const [movForm, setMovForm] = useState(emptyMov)

  useEffect(() => { fetchProductos() }, [])

  async function fetchProductos() {
    setLoading(true)
    const { data } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    setProductos(data ?? [])
    setLoading(false)
  }

  async function fetchMovimientos(productoId: string) {
    const { data } = await supabase
      .from('movimientos_stock')
      .select('*')
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false })
      .limit(20)
    setMovimientos(data ?? [])
  }

  const productosFiltrados = productos.filter(p => {
    const q = busqueda.toLowerCase()
    const mq = !q || (p.nombre + p.codigo).toLowerCase().includes(q)
    const me = !filtroEst ||
      (filtroEst === 'ok' && p.stock_actual >= p.stock_minimo && p.stock_actual > 0) ||
      (filtroEst === 'bajo' && p.stock_actual > 0 && p.stock_actual < p.stock_minimo) ||
      (filtroEst === 'sin' && p.stock_actual === 0)
    return mq && me
  })

  const totalUnidades = productos.reduce((a, p) => a + p.stock_actual, 0)
  const valorStock = productos.reduce((a, p) => a + p.stock_actual * p.precio_costo, 0)
  const bajoMinimo = productos.filter(p => p.stock_actual < p.stock_minimo).length

  async function guardarProducto(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      carga_max_kg: form.carga_max_kg ? Number(form.carga_max_kg) : null,
      autonomia_km: form.autonomia_km ? Number(form.autonomia_km) : null,
      velocidad_max_kmh: form.velocidad_max_kmh ? Number(form.velocidad_max_kmh) : null,
      precio_costo: Number(form.precio_costo),
      precio_venta: Number(form.precio_venta),
      stock_actual: Number(form.stock_actual),
      stock_minimo: Number(form.stock_minimo),
      activo: true,
    }
    if (selected) {
      await supabase.from('productos').update(payload).eq('id', selected.id)
    } else {
      await supabase.from('productos').insert(payload)
    }
    setSaving(false)
    setForm(emptyForm)
    setSelected(null)
    setView('list')
    fetchProductos()
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    const cantidad = movForm.tipo === 'salida' ? -Math.abs(Number(movForm.cantidad)) : Math.abs(Number(movForm.cantidad))
    const nuevoStock = selected.stock_actual + cantidad
    await supabase.from('movimientos_stock').insert({
      producto_id: selected.id,
      tipo: movForm.tipo,
      cantidad,
      stock_resultante: nuevoStock,
      motivo: movForm.motivo,
    })
    setSaving(false)
    setMovForm(emptyMov)
    await fetchProductos()
    setView('ficha')
    const updated = await supabase.from('productos').select('*').eq('id', selected.id).single()
    if (updated.data) setSelected(updated.data)
    fetchMovimientos(selected.id)
  }

  function abrirFicha(p: Producto) {
    setSelected(p)
    fetchMovimientos(p.id)
    setView('ficha')
  }

  function abrirEditar(p: Producto) {
    setForm({ ...p, precio_costo: p.precio_costo, precio_venta: p.precio_venta })
    setSelected(p)
    setView('new')
  }

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev: any) => ({ ...prev, [key]: e.target.value }))

  // ---- LISTA ----
  if (view === 'list') return (
    <div>
      <PageHeader title="Inventario">
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setSelected(null); setView('new') }}>+ Nuevo producto</button>
      </PageHeader>
      <div className="p-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricCard label="Total unidades" value={totalUnidades} />
          <MetricCard label="Modelos activos" value={productos.filter(p => p.stock_actual > 0).length} />
          <MetricCard label="Valor del stock" value={formatPeso(valorStock)} />
          <MetricCard label="Bajo mínimo" value={bajoMinimo} deltaColor={bajoMinimo > 0 ? 'text-red-500' : 'text-gray-400'} />
        </div>
        <div className="flex gap-3 mb-4">
          <input className="input flex-1" placeholder="Buscar por nombre o código..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select className="input w-44" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="ok">Stock OK</option>
            <option value="bajo">Bajo mínimo</option>
            <option value="sin">Sin stock</option>
          </select>
        </div>
        <div className="card overflow-hidden">
          {loading ? <Spinner /> : productosFiltrados.length === 0 ? <EmptyState message="No hay productos" /> : (
            <Table headers={['Código', 'Producto', 'Categoría', 'Stock', 'Mín.', 'P. Costo', 'P. Venta', 'Estado', '']}>
              {productosFiltrados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => abrirFicha(p)}>
                  <td className="table-cell font-mono text-xs">{p.codigo}</td>
                  <td className="table-cell font-medium">{p.nombre}</td>
                  <td className="table-cell text-gray-500">{p.categoria ?? '—'}</td>
                  <td className="table-cell font-medium" style={{ color: p.stock_actual < p.stock_minimo ? '#dc2626' : undefined }}>{p.stock_actual}</td>
                  <td className="table-cell text-gray-400">{p.stock_minimo}</td>
                  <td className="table-cell">{formatPeso(p.precio_costo)}</td>
                  <td className="table-cell font-medium">{formatPeso(p.precio_venta)}</td>
                  <td className="table-cell">{stockBadge(p)}</td>
                  <td className="table-cell"><button className="btn btn-sm" onClick={e => { e.stopPropagation(); abrirFicha(p) }}>Ver</button></td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  )

  // ---- FORMULARIO ----
  if (view === 'new') return (
    <div>
      <PageHeader title={selected ? 'Editar producto' : 'Nuevo producto'}>
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5">
        <form onSubmit={guardarProducto}>
          <div className="card p-5 mb-4">
            <p className="section-title">Identificación</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Código *" value={form.codigo} onChange={f('codigo')} required placeholder="TS-120" />
              <Input label="Nombre *" value={form.nombre} onChange={f('nombre')} required />
              <Select label="Categoría" value={form.categoria} onChange={f('categoria')}>
                <option value="">Seleccionar</option>
                <option>4 ruedas</option><option>3 ruedas</option><option>Indoor</option><option>Otra</option>
              </Select>
              <Input label="Marca" value={form.marca} onChange={f('marca')} />
              <Input label="País de origen" value={form.origen} onChange={f('origen')} />
              <Input label="Posición arancelaria" value={form.posicion_arancelaria} onChange={f('posicion_arancelaria')} />
            </div>
          </div>
          <div className="card p-5 mb-4">
            <p className="section-title">Especificaciones técnicas</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Peso máx. usuario (kg)" type="number" value={form.carga_max_kg} onChange={f('carga_max_kg')} />
              <Input label="Autonomía (km)" type="number" value={form.autonomia_km} onChange={f('autonomia_km')} />
              <Input label="Velocidad máx. (km/h)" type="number" value={form.velocidad_max_kmh} onChange={f('velocidad_max_kmh')} />
              <Input label="Tipo de batería" value={form.bateria} onChange={f('bateria')} placeholder="Litio 60Ah" />
              <Input label="Colores disponibles" value={form.colores} onChange={f('colores')} placeholder="Gris, Azul" />
            </div>
          </div>
          <div className="card p-5 mb-4">
            <p className="section-title">Precios y stock</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Precio de costo (ARS) *" type="number" value={form.precio_costo} onChange={f('precio_costo')} required />
              <Input label="Precio de venta (ARS) *" type="number" value={form.precio_venta} onChange={f('precio_venta')} required />
              <Input label="Stock actual" type="number" value={form.stock_actual} onChange={f('stock_actual')} />
              <Input label="Stock mínimo" type="number" value={form.stock_minimo} onChange={f('stock_minimo')} />
            </div>
          </div>
          <div className="card p-5 mb-4">
            <p className="section-title">Notas</p>
            <textarea className="input min-h-[72px]" value={form.notas} onChange={f('notas')} placeholder="Accesorios incluidos, garantía, notas de importación..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar producto'}</button>
          </div>
        </form>
      </div>
    </div>
  )

  // ---- FICHA ----
  if (view === 'ficha' && selected) return (
    <div>
      <PageHeader title={selected.nombre}>
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
        <button className="btn" onClick={() => abrirEditar(selected)}>Editar</button>
        <button className="btn btn-primary" onClick={() => { setMovForm(emptyMov); setView('movimiento') }}>+ Movimiento de stock</button>
      </PageHeader>
      <div className="p-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricCard label="Stock actual" value={selected.stock_actual} deltaColor={selected.stock_actual < selected.stock_minimo ? 'text-red-500' : 'text-gray-400'} delta={selected.stock_actual < selected.stock_minimo ? 'Bajo mínimo' : undefined} />
          <MetricCard label="Stock mínimo" value={selected.stock_minimo} />
          <MetricCard label="Precio costo" value={formatPeso(selected.precio_costo)} />
          <MetricCard label="Precio venta" value={formatPeso(selected.precio_venta)} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="card p-5">
            <p className="section-title mt-0">Datos técnicos</p>
            {[
              ['Código', selected.codigo],
              ['Categoría', selected.categoria],
              ['Marca', selected.marca],
              ['Origen', selected.origen],
              ['Pos. arancelaria', selected.posicion_arancelaria],
              ['Peso máx. usuario', selected.carga_max_kg ? `${selected.carga_max_kg} kg` : null],
              ['Autonomía', selected.autonomia_km ? `${selected.autonomia_km} km` : null],
              ['Velocidad máx.', selected.velocidad_max_kmh ? `${selected.velocidad_max_kmh} km/h` : null],
              ['Batería', selected.bateria],
            ].map(([label, val]) => val ? (
              <div key={label as string} className="flex gap-2 mb-2 text-sm">
                <span className="text-gray-400 w-40 shrink-0">{label}</span>
                <span className="font-mono text-xs">{val}</span>
              </div>
            ) : null)}
          </div>
          <div className="card p-5">
            <p className="section-title mt-0">Últimos movimientos</p>
            {movimientos.length === 0 ? <p className="text-xs text-gray-400">Sin movimientos registrados</p> : (
              <div>
                {movimientos.slice(0, 10).map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 text-sm">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${m.cantidad > 0 ? 'bg-blue-500' : 'bg-red-400'}`} />
                    <div className="flex-1">
                      <p>{m.motivo ?? (m.cantidad > 0 ? 'Entrada' : 'Salida')}</p>
                      <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className={`font-medium ${m.cantidad > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ---- MOVIMIENTO ----
  if (view === 'movimiento' && selected) return (
    <div>
      <PageHeader title={`Movimiento de stock — ${selected.nombre}`}>
        <button className="btn" onClick={() => setView('ficha')}>← Volver</button>
      </PageHeader>
      <div className="p-5 max-w-lg">
        <div className="card p-5">
          <form onSubmit={registrarMovimiento}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Select label="Tipo de movimiento" value={movForm.tipo} onChange={e => setMovForm(p => ({ ...p, tipo: e.target.value }))}>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste de inventario</option>
              </Select>
              <Input label="Cantidad" type="number" min={1} value={movForm.cantidad} onChange={e => setMovForm(p => ({ ...p, cantidad: Number(e.target.value) }))} required />
            </div>
            <div className="mb-4">
              <label className="label">Motivo</label>
              <input className="input" value={movForm.motivo} onChange={e => setMovForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Ej: Venta V-0312 / Importación IMP-041 / Ajuste de conteo" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p className="text-gray-500">Stock actual: <span className="font-medium text-gray-800">{selected.stock_actual}</span></p>
              <p className="text-gray-500 mt-1">Stock resultante: <span className="font-medium text-gray-800">
                {movForm.tipo === 'salida'
                  ? selected.stock_actual - Math.abs(Number(movForm.cantidad))
                  : selected.stock_actual + Math.abs(Number(movForm.cantidad))}
              </span></p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn" onClick={() => setView('ficha')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar movimiento'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return null
}
