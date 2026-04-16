// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatPeso(value: number): string {
  return '$' + Math.round(value).toLocaleString('es-AR')
}

export function formatFecha(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function initiales(apellido: string, nombre: string): string {
  return ((apellido[0] ?? '') + (nombre[0] ?? '')).toUpperCase()
}

export function calcularCuotaMensual(
  montoFinanciado: number,
  cuotas: number,
  interesMensual: number
): number {
  if (interesMensual === 0) return montoFinanciado / cuotas
  const r = interesMensual / 100
  return (montoFinanciado * r * Math.pow(1 + r, cuotas)) / (Math.pow(1 + r, cuotas) - 1)
}

export const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut',
  'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy',
  'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén',
  'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz',
  'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]

export const ESTADOS_VENTA_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  cobrado: 'Cobrado',
  financiado: 'Financiado',
  presupuesto: 'Presupuesto',
  cancelado: 'Cancelado',
}

export const ESTADOS_ENTREGA_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  asignado: 'Asignado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  reprogramado: 'Reprogramado',
}
