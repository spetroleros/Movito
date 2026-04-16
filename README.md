# Movito — Sistema de gestión integral

Sistema web para importación, venta y gestión de scooters para personas con discapacidad.

## Stack tecnológico

- **Frontend**: Next.js 14 + React + TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Gráficos**: Recharts
- **Hosting**: Vercel (gratuito)

---

## Instalación y deploy — paso a paso

### Paso 1: Crear cuenta en GitHub
1. Ir a [github.com](https://github.com) y crear una cuenta gratuita
2. Crear un repositorio nuevo llamado `movito`
3. Subir todos estos archivos al repositorio

### Paso 2: Crear la base de datos en Supabase
1. Ir a [supabase.com](https://supabase.com) y crear una cuenta gratuita
2. Crear un nuevo proyecto (elegir región: South America)
3. Ir a **SQL Editor** → **New query**
4. Pegar el contenido de `movito_schema.sql` y hacer clic en **Run**
5. Verificar que se crearon las 12 tablas en **Table Editor**

### Paso 3: Crear el primer usuario
1. En Supabase, ir a **Authentication** → **Users**
2. Hacer clic en **Add user** → **Create new user**
3. Ingresar email y contraseña (este será el acceso al sistema)
4. Copiar el ID del usuario creado
5. Ir a **SQL Editor** y ejecutar:
   ```sql
   UPDATE usuarios SET id = 'ID-COPIADO-AQUI' WHERE email = 'tu@email.com';
   ```

### Paso 4: Obtener las claves de Supabase
1. En Supabase, ir a **Settings** → **API**
2. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### Paso 5: Deploy en Vercel
1. Ir a [vercel.com](https://vercel.com) y crear una cuenta gratuita (con GitHub)
2. Hacer clic en **Add New Project**
3. Importar el repositorio `movito` desde GitHub
4. En **Environment Variables**, agregar las 3 variables del paso 4
5. Hacer clic en **Deploy**
6. En 2 minutos la app estará disponible en `movito.vercel.app`

### Paso 6 (opcional): Dominio propio
1. En Vercel → tu proyecto → **Settings** → **Domains**
2. Agregar `movito.com.ar` o el dominio que tengas
3. Configurar los DNS según las instrucciones de Vercel

---

## Variables de entorno requeridas

Crear un archivo `.env.local` (para desarrollo local):

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Abrir en el navegador
http://localhost:3000
```

---

## Módulos del sistema

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | Métricas, alertas y accesos rápidos |
| Clientes | `/clientes` | Alta, edición y ficha de clientes con CUD |
| Inventario | `/inventario` | Stock, movimientos y fichas de producto |
| Ventas | `/ventas` | Ventas, presupuestos y descuento CUD automático |
| Financiación | `/financiacion` | Planes de cuotas, simulador y cobros |
| Logística | `/logistica` | Kanban de entregas y seguimiento |
| Importaciones | `/importaciones` | Órdenes, proveedores y recepción de mercadería |

---

## Agregar usuarios adicionales

Para dar acceso a un empleado:
1. En Supabase → **Authentication** → **Users** → **Add user**
2. Ingresar email y contraseña del empleado
3. En **SQL Editor**:
   ```sql
   UPDATE usuarios 
   SET id = 'ID-DEL-NUEVO-USUARIO', rol = 'vendedor'
   WHERE email = 'empleado@movito.com.ar';
   ```
   O insertar nuevo registro si no existe:
   ```sql
   INSERT INTO usuarios (id, nombre, email, rol)
   VALUES ('ID-DEL-NUEVO-USUARIO', 'Nombre Empleado', 'empleado@movito.com.ar', 'vendedor');
   ```

Roles disponibles: `admin`, `vendedor`, `logistica`

---

## Costos estimados

| Plan | Costo | Límites |
|------|-------|---------|
| Vercel Free | $0/mes | Proyectos ilimitados, 100GB bandwidth |
| Supabase Free | $0/mes | 500MB DB, 50MB storage, 2GB bandwidth |
| Supabase Pro | $25/mes | 8GB DB, 100GB storage |

El plan gratuito es suficiente para empezar. Cuando el negocio crezca y superes los 500MB de datos (miles de registros), podés pasar al plan Pro de Supabase por $25/mes.

---

## Estructura del proyecto

```
movito/
├── src/
│   ├── app/
│   │   ├── (app)/              # Rutas protegidas (requieren login)
│   │   │   ├── dashboard/
│   │   │   ├── clientes/
│   │   │   ├── inventario/
│   │   │   ├── ventas/
│   │   │   ├── financiacion/
│   │   │   ├── logistica/
│   │   │   └── importaciones/
│   │   ├── login/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx
│   │   └── ui/
│   │       └── index.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   └── utils.ts
│   ├── middleware.ts
│   └── types/
│       └── index.ts
├── movito_schema.sql           # Schema completo de la base de datos
├── .env.local                  # Variables de entorno (no subir a Git)
├── package.json
└── README.md
```
