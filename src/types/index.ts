// src/types/index.ts
// Tipos que reflejan exactamente el schema de Supabase

export type Rol = 'admin' | 'vendedor' | 'logistica'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: string
  apellido: string
  nombre: string
  dni: string
  cuil?: string
  telefono?: string
  whatsapp?: string
  email?: string
  domicilio?: string
  provincia?: string
  localidad?: string
  tiene_cud: boolean
  numero_cud?: string
  descuento_cud: number
  responsable_nombre?: string
  responsable_vinculo?: string
  responsable_telefono?: string
  notas?: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Producto {
  id: string
  codigo: string
  nombre: string
  categoria?: string
  marca?: string
  origen?: string
  posicion_arancelaria?: string
  carga_max_kg?: number
  autonomia_km?: number
  velocidad_max_kmh?: number
  bateria?: string
  colores?: string
  stock_actual: number
  stock_minimo: number
  precio_costo: number
  precio_venta: number
  notas?: string
  activo: boolean
  created_at: string
  updated_at: string
}

export type FormaPago = 'contado' | 'transferencia' | 'financiado' | 'señado'
export type EstadoVenta = 'pendiente' | 'cobrado' | 'financiado' | 'presupuesto' | 'cancelado'
export type TipoVenta = 'venta' | 'presupuesto'

export interface Venta {
  id: string
  numero: string
  tipo: TipoVenta
  cliente_id: string
  usuario_id?: string
  descuento_cud_aplicado: boolean
  porcentaje_descuento: number
  subtotal: number
  monto_descuento: number
  total: number
  forma_pago: FormaPago
  estado: EstadoVenta
  notas?: string
  fecha: string
  created_at: string
  // relaciones
  clientes?: Cliente
  items_venta?: ItemVenta[]
}

export interface ItemVenta {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  // relaciones
  productos?: Producto
}

export type EstadoPlan = 'activo' | 'mora' | 'cancelado'

export interface PlanFinanciacion {
  id: string
  numero: string
  venta_id: string
  cliente_id: string
  monto_total: number
  sena: number
  monto_financiado: number
  cantidad_cuotas: number
  interes_mensual: number
  cuota_mensual: number
  dia_vencimiento: number
  estado: EstadoPlan
  fecha_inicio: string
  created_at: string
  // relaciones
  clientes?: Cliente
  ventas?: Venta
  cuotas?: Cuota[]
}

export type EstadoCuota = 'pendiente' | 'pagada' | 'vencida'

export interface Cuota {
  id: string
  plan_id: string
  numero_cuota: number
  monto: number
  fecha_vencimiento: string
  fecha_pago?: string
  estado: EstadoCuota
  notas?: string
}

export type EstadoEntrega = 'pendiente' | 'asignado' | 'en_camino' | 'entregado' | 'reprogramado'

export interface Entrega {
  id: string
  numero: string
  venta_id: string
  cliente_id: string
  direccion: string
  provincia?: string
  fecha_programada: string
  turno?: string
  responsable_id?: string
  vehiculo?: string
  requiere_armado: boolean
  tipo_armado?: string
  accesorios?: string
  notas?: string
  estado: EstadoEntrega
  fecha_entrega_real?: string
  created_at: string
  // relaciones
  clientes?: Cliente
  ventas?: Venta
}

export interface Proveedor {
  id: string
  nombre: string
  pais: string
  contacto_email?: string
  contacto_telefono?: string
  lead_time_dias?: number
  moneda: string
  confiabilidad: 'alta' | 'media' | 'baja'
  notas?: string
  activo: boolean
  created_at: string
}

export type EstadoImportacion = 'pendiente' | 'en_transito' | 'en_aduana' | 'demorada' | 'recibida'

export interface Importacion {
  id: string
  numero: string
  proveedor_id: string
  tipo_carga?: string
  numero_tracking?: string
  despachante?: string
  fecha_orden: string
  eta?: string
  fecha_recepcion?: string
  costo_fob_usd: number
  costo_flete_usd: number
  costo_seguro_usd: number
  gastos_locales_ars: number
  estado: EstadoImportacion
  notas?: string
  created_at: string
  // relaciones
  proveedores?: Proveedor
  items_importacion?: ItemImportacion[]
}

export interface ItemImportacion {
  id: string
  importacion_id: string
  producto_id: string
  cantidad: number
  precio_unit_usd: number
  productos?: Producto
}

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export interface MovimientoStock {
  id: string
  producto_id: string
  tipo: TipoMovimiento
  cantidad: number
  stock_resultante: number
  motivo?: string
  venta_id?: string
  importacion_id?: string
  usuario_id?: string
  created_at: string
  productos?: Producto
}
