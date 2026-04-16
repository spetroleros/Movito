'use client'
// src/app/(app)/clientes/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cliente } from '@/types'
import { PageHeader, Badge, Table, EmptyState, Spinner, Input, Select } from '@/components/ui'
import { formatFecha, initiales, PROVINCIAS } from '@/lib/utils'

const supabase = createClient()

function cudBadge(c: Cliente) {
  if (!c.tiene_cud) return <Badge variant="gray">Sin CUD</Badge>
  return <Badge variant="success">CUD — {c.descuento_cud}% desc.</Badge>
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCud, setFiltroCud] = useState('')
  const [view, setView] = useState<'list' | 'new' | 'ficha'>('list')
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [saving, setSaving] = useState(false)

  // Formulario
  const emptyForm = {
    apellido: '', nombre: '', dni: '', cuil: '', telefono: '', whatsapp: '',
    email: '', domicilio: '', provincia: '', localidad: '', tiene_cud: false,
    numero_cud: '', descuento_cud: 15, responsable_nombre: '',
    responsable_vinculo: '', responsable_telefono: '', notas: '',
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('activo', true)
      .order('apellido')
    setClientes(data ?? [])
    setLoading(false)
  }

  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    const matchQ = !q || (c.apellido + c.nombre + c.dni).toLowerCase().includes(q)
    const matchCud = !filtroCud ||
      (filtroCud === 'con' && c.tiene_cud) ||
      (filtroCud === 'sin' && !c.tiene_cud)
    return matchQ && matchCud
  })

  async function guardarCliente(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, activo: true }
    if (selected) {
      await supabase.from('clientes').update(payload).eq('id', selected.id)
    } else {
      await supabase.from('clientes').insert(payload)
    }
    setSaving(false)
    setForm(emptyForm)
    setSelected(null)
    setView('list')
    fetchClientes()
  }

  function abrirFicha(c: Cliente) {
    setSelected(c)
    setView('ficha')
  }

  function abrirEditar(c: Cliente) {
    setForm({
      apellido: c.apellido, nombre: c.nombre, dni: c.dni, cuil: c.cuil ?? '',
      telefono: c.telefono ?? '', whatsapp: c.whatsapp ?? '', email: c.email ?? '',
      domicilio: c.domicilio ?? '', provincia: c.provincia ?? '', localidad: c.localidad ?? '',
      tiene_cud: c.tiene_cud, numero_cud: c.numero_cud ?? '', descuento_cud: c.descuento_cud,
      responsable_nombre: c.responsable_nombre ?? '',
      responsable_vinculo: c.responsable_vinculo ?? '',
      responsable_telefono: c.responsable_telefono ?? '', notas: c.notas ?? '',
    })
    setSelected(c)
    setView('new')
  }

  async function eliminarCliente(id: string) {
    if (!confirm('¿Dar de baja este cliente?')) return
    await supabase.from('clientes').update({ activo: false }).eq('id', id)
    setView('list')
    fetchClientes()
  }

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  // ---- VISTA LISTA ----
  if (view === 'list') return (
    <div>
      <PageHeader title="Clientes">
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setSelected(null); setView('new') }}>
          + Nuevo cliente
        </button>
      </PageHeader>
      <div className="p-5">
        <div className="flex gap-3 mb-4">
          <input className="input flex-1" placeholder="Buscar por nombre o DNI..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select className="input w-40" value={filtroCud} onChange={e => setFiltroCud(e.target.value)}>
            <option value="">Todos</option>
            <option value="con">Con CUD</option>
            <option value="sin">Sin CUD</option>
          </select>
        </div>
        <div className="card overflow-hidden">
          {loading ? <Spinner /> : clientesFiltrados.length === 0 ? (
            <EmptyState message="No hay clientes cargados" />
          ) : (
            <Table headers={['Cliente', 'DNI', 'Teléfono', 'CUD', 'Descuento', 'Compras', '']}>
              {clientesFiltrados.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => abrirFicha(c)}>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-700">
                        {initiales(c.apellido, c.nombre)}
                      </div>
                      {c.apellido}, {c.nombre}
                    </div>
                  </td>
                  <td className="table-cell font-mono text-xs">{c.dni}</td>
                  <td className="table-cell">{c.telefono ?? '—'}</td>
                  <td className="table-cell">{cudBadge(c)}</td>
                  <td className="table-cell font-medium">{c.tiene_cud ? `${c.descuento_cud}%` : '—'}</td>
                  <td className="table-cell text-center text-gray-400">—</td>
                  <td className="table-cell">
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); abrirFicha(c) }}>Ver</button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  )

  // ---- VISTA FORMULARIO ----
  if (view === 'new') return (
    <div>
      <PageHeader title={selected ? 'Editar cliente' : 'Nuevo cliente'}>
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
      </PageHeader>
      <div className="p-5">
        <form onSubmit={guardarCliente}>
          <div className="card p-5 mb-4">
            <p className="section-title">Datos personales</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Apellido *" value={form.apellido} onChange={f('apellido')} required />
              <Input label="Nombre *" value={form.nombre} onChange={f('nombre')} required />
              <Input label="DNI *" value={form.dni} onChange={f('dni')} required />
              <Input label="CUIL" value={form.cuil} onChange={f('cuil')} />
              <Input label="Teléfono" value={form.telefono} onChange={f('telefono')} />
              <Input label="WhatsApp" value={form.whatsapp} onChange={f('whatsapp')} />
              <Input label="Email" type="email" value={form.email} onChange={f('email')} />
            </div>
            <div className="mt-3">
              <Input label="Domicilio" value={form.domicilio} onChange={f('domicilio')} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Select label="Provincia" value={form.provincia} onChange={f('provincia')}>
                <option value="">Seleccionar</option>
                {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
              </Select>
              <Input label="Localidad" value={form.localidad} onChange={f('localidad')} />
            </div>
          </div>

          <div className="card p-5 mb-4">
            <p className="section-title">Certificado único de discapacidad (CUD)</p>
            <div className="flex items-center gap-3 mb-4">
              <input type="checkbox" id="tiene_cud" checked={form.tiene_cud} onChange={f('tiene_cud')} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="tiene_cud" className="text-sm font-medium text-gray-700">El cliente posee CUD</label>
            </div>
            {form.tiene_cud && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="N° CUD (opcional)" value={form.numero_cud} onChange={f('numero_cud')} placeholder="AR-01-2021-00012345" />
                <Select label="Descuento a aplicar" value={form.descuento_cud} onChange={f('descuento_cud')}>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                </Select>
              </div>
            )}
          </div>

          <div className="card p-5 mb-4">
            <p className="section-title">Responsable (opcional)</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nombre completo" value={form.responsable_nombre} onChange={f('responsable_nombre')} />
              <Select label="Vínculo" value={form.responsable_vinculo} onChange={f('responsable_vinculo')}>
                <option value="">—</option>
                <option>Padre/Madre</option><option>Cónyuge</option>
                <option>Hijo/a</option><option>Tutor legal</option><option>Otro</option>
              </Select>
              <Input label="Teléfono" value={form.responsable_telefono} onChange={f('responsable_telefono')} />
            </div>
          </div>

          <div className="card p-5 mb-4">
            <p className="section-title">Notas internas</p>
            <textarea className="input min-h-[80px]" value={form.notas} onChange={f('notas')} placeholder="Observaciones, preferencias de contacto..." />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  // ---- VISTA FICHA ----
  if (view === 'ficha' && selected) return (
    <div>
      <PageHeader title={`${selected.apellido}, ${selected.nombre}`}>
        <button className="btn" onClick={() => setView('list')}>← Volver</button>
        <button className="btn" onClick={() => abrirEditar(selected)}>Editar</button>
        <button className="btn btn-danger text-red-600" onClick={() => eliminarCliente(selected.id)}>Dar de baja</button>
      </PageHeader>
      <div className="p-5">
        <div className="card overflow-hidden mb-4">
          <div className="flex items-center gap-4 p-5 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-lg font-medium text-blue-700">
              {initiales(selected.apellido, selected.nombre)}
            </div>
            <div>
              <p className="font-medium text-gray-900">{selected.apellido}, {selected.nombre}</p>
              <p className="text-xs text-gray-500">DNI {selected.dni}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {cudBadge(selected)}
            </div>
          </div>
          <div className="p-5">
            {selected.tiene_cud && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center justify-between">
                <span className="text-sm text-green-700 font-medium">Descuento CUD habilitado</span>
                <span className="text-xl font-medium text-green-700">{selected.descuento_cud}% OFF</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Teléfono</p>
                <p>{selected.telefono ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">WhatsApp</p>
                <p>{selected.whatsapp ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Email</p>
                <p>{selected.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Domicilio</p>
                <p>{selected.domicilio ?? '—'}, {selected.provincia ?? ''}</p>
              </div>
              {selected.tiene_cud && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">N° CUD</p>
                  <p className="font-mono text-xs">{selected.numero_cud ?? 'No cargado'}</p>
                </div>
              )}
              {selected.responsable_nombre && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Responsable</p>
                  <p>{selected.responsable_nombre} ({selected.responsable_vinculo})</p>
                </div>
              )}
            </div>
            {selected.notas && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <p className="text-sm text-gray-700">{selected.notas}</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400">Alta: {formatFecha(selected.created_at)}</p>
      </div>
    </div>
  )

  return null
}
