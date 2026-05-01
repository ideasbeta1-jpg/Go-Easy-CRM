# Guía del Desarrollador — Go Easy CRM

Esta guía cubre el setup local, variables de entorno, comandos esenciales, estructura de migraciones y patrones de código más usados en el proyecto.

---

## 1. Requisitos Previos

| Herramienta | Versión mínima | Notas |
| :--- | :--- | :--- |
| Node.js | 20.x LTS | Requerido para Next.js 16 |
| npm | 10.x | Viene incluido con Node 20 |
| Supabase CLI | última | `npm i -g supabase` para migraciones |
| Git | 2.x | Control de versiones |

---

## 2. Setup Local Paso a Paso

### 2.1 Clonar e Instalar

```bash
git clone <repo-url>
cd "Go Easy CRM"
npm install
```

### 2.2 Configurar Variables de Entorno

Crea el archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# ─── SUPABASE ─────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Admin key — solo backend

# ─── STRIPE ───────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...           # sk_test_... para desarrollo
STRIPE_WEBHOOK_SECRET=whsec_...        # Secret del webhook de Stripe

# ─── WHATSAPP BUSINESS API (Meta WABA) ────────────────────────────────
WABA_ACCESS_TOKEN=EAAG...              # Token permanente de Meta
WABA_PHONE_NUMBER_ID=123456789012345  # ID del número en Meta Business
WABA_BUSINESS_ACCOUNT_ID=...
WABA_API_VERSION=v21.0                 # Versión del Graph API

# ─── EVOLUTION API (WhatsApp alternativo) ─────────────────────────────
EVOLUTION_API_URL=https://evolution.tudominio.com
EVOLUTION_API_KEY=tu-api-key-evolution
EVOLUTION_INSTANCE_NAME=goeasy         # Nombre de la instancia

# ─── ZADARMA VoIP ─────────────────────────────────────────────────────
ZADARMA_USER_ID=tu-user-id
ZADARMA_API_KEY=tu-api-key
ZADARMA_API_SECRET=tu-api-secret
ZADARMA_WEBHOOK_SECRET=secreto-hmac   # Para verificar webhooks entrantes

# ─── EMAIL (Resend) ───────────────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@goeasy.com

# ─── NOTIFICACIONES PUSH (Web Push) ───────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@goeasy.com

# ─── META CONVERSIONS API (Pixel) ─────────────────────────────────────
NEXT_PUBLIC_FB_PIXEL_ID=123456789     # Opcional
META_CAPI_ACCESS_TOKEN=...            # Opcional

# ─── APP URL ──────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000   # En producción: https://tudominio.com

# ─── N8N (Fallback pasivo — opcional) ─────────────────────────────────
N8N_WEBHOOK_URL=https://n8n.tudominio.com/webhook/...   # Dejar vacío para desactivar
```

> **Importante:** El archivo `.env.local` nunca debe comitearse al repositorio. Está excluido en `.gitignore`.

### 2.3 Ejecutar en Desarrollo

```bash
npm run dev
```

Accede a [http://localhost:3000](http://localhost:3000). La ruta raíz redirige automáticamente a `/dashboard` si hay sesión activa, o a `/landing` si no la hay.

---

## 3. Scripts Disponibles

| Script | Comando | Descripción |
| :--- | :--- | :--- |
| Desarrollo | `npm run dev` | Servidor con Turbopack y hot-reload |
| Build | `npm run build -- --webpack` | Compilación de producción con webpack |
| Producción | `npm run start` | Inicia el servidor compilado |
| Linting | `npm run lint` | ESLint con config Next.js |

> El flag `--webpack` en build es necesario por compatibilidad con `@ffmpeg-installer/ffmpeg` (procesamiento de audio).

---

## 4. Estructura de Migraciones de Base de Datos

Las migraciones viven en `supabase/migrations/` con el formato `YYYYMMDD_nombre.sql`:

```
supabase/migrations/
├── 20260425_add_lead_source_utm.sql      # Columnas UTM tracking en leads
├── 20260425_add_push_subscriptions.sql   # Tabla push_subscriptions para Web Push
├── 20260426_add_notifications.sql        # Tabla notifications con RLS
└── 20260501_soft_delete_leads.sql        # Columna deleted_at en leads
```

### Aplicar Migraciones

```bash
# Login con Supabase CLI
supabase login

# Vincular al proyecto remoto
supabase link --project-ref oupphpttipkedntaxizk

# Aplicar migraciones pendientes
supabase db push
```

### Crear Nueva Migración

```bash
# Crear archivo de migración con timestamp automático
supabase migration new nombre_de_la_migracion
# Crea: supabase/migrations/YYYYMMDDHHMMSS_nombre_de_la_migracion.sql
```

---

## 5. Clientes de Supabase — Cuándo Usar Cada Uno

El proyecto tiene tres clientes Supabase con distintos permisos:

| Archivo | Uso | Permisos |
| :--- | :--- | :--- |
| `src/utils/supabase/client.ts` | Componentes React del cliente | Respeta RLS (usuario actual) |
| `src/utils/supabase/server.ts` | Server Components, Server Actions, Route Handlers | Respeta RLS (usuario de sesión) |
| `src/utils/supabase/admin.ts` | Backend con permisos elevados (webhooks, cron) | Bypassea RLS — ⚠️ solo en servidor |

```typescript
// ✅ En Server Actions / Route Handlers normales
import { createClient } from '@/utils/supabase/server'
const supabase = await createClient()

// ✅ En Componentes del cliente (browser)
import { createClient } from '@/utils/supabase/client'
const supabase = createClient()

// ✅ En webhooks o cron (necesitan acceso completo sin RLS)
import { createAdminClient } from '@/utils/supabase/admin'
const supabase = createAdminClient()
```

---

## 6. Patrones de Código Frecuentes

### Server Actions

Todas las mutaciones de datos pasan por Server Actions en `src/app/utils/actions/`:

```typescript
// src/app/utils/actions/leads.ts
'use server'

import { createClient } from '@/utils/supabase/server'

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)
  
  if (error) throw error
}
```

### Disparar Automatización Después de un Cambio de Estado

```typescript
import { triggerAutomation } from '@/utils/automation-engine'

// Después de cambiar el status del lead
await triggerAutomation(leadId, newStatus)
```

### Crear Notificación In-App

```typescript
import { createNotification } from '@/app/utils/actions/notifications'

await createNotification({
  user_id: agentId,
  type: 'lead_assigned',
  title: '¡Nuevo lead asignado!',
  body: `${firstName} ${lastName} está esperando respuesta.`,
  link: `/dashboard/leads/${leadId}`,
  lead_id: leadId,
})
```

---

## 7. Autenticación y Middleware

El middleware en `src/utils/supabase/middleware.ts` protege todas las rutas bajo `/dashboard`. Si el usuario no tiene sesión activa, lo redirige a `/login`.

```typescript
// next.config.ts — rutas que requieren autenticación
// El middleware valida el token JWT de Supabase en cada request
```

El layout del dashboard (`src/app/dashboard/layout.tsx`) hace una verificación adicional en el servidor y redirige si `user` es null.

---

## 8. Variables de Entorno por Módulo

| Módulo | Variables Requeridas |
| :--- | :--- |
| Base de datos | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` |
| WhatsApp WABA | `WABA_ACCESS_TOKEN`, `WABA_PHONE_NUMBER_ID`, `WABA_BUSINESS_ACCOUNT_ID`, `WABA_API_VERSION` |
| WhatsApp Evolution | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` |
| Pagos Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| VoIP Zadarma | `ZADARMA_USER_ID`, `ZADARMA_API_KEY`, `ZADARMA_API_SECRET`, `ZADARMA_WEBHOOK_SECRET` |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Push Notifications | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| App URL | `NEXT_PUBLIC_APP_URL` |

---

## 9. Despliegue en Producción (Vercel)

El proyecto está configurado para despliegue en Vercel (`vercel.json` en la raíz):

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Configurar todas las variables de entorno en el panel de Vercel
3. El build command es: `npm run build -- --webpack`
4. El output directory es: `.next`

### Webhooks en Producción

Registrar las siguientes URLs en cada servicio externo:

| Servicio | URL del Webhook |
| :--- | :--- |
| Stripe | `https://tudominio.com/api/webhooks/stripe` |
| Meta WABA | `https://tudominio.com/api/webhooks/whatsapp` |
| Evolution API | `https://tudominio.com/api/webhooks/whatsapp` |
| Zadarma PBX | `https://tudominio.com/api/zadarma/webhook` |

### Cron Job

El endpoint `/api/cron/process-actions` debe ejecutarse diariamente. Configurarlo en Vercel Cron Jobs o un servicio externo como cron-job.org apuntando a:

```
GET https://tudominio.com/api/cron/process-actions
```

---

## 10. Resolución de Problemas Comunes

| Síntoma | Causa probable | Solución |
| :--- | :--- | :--- |
| Build falla con error de ffmpeg | Dependencia nativa no compatible | Usar `npm run build -- --webpack` (no turbopack) |
| WhatsApp no envía | Token de WABA vencido | Renovar `WABA_ACCESS_TOKEN` en Meta Business |
| Webhook de Stripe rechazado | Secret incorrecto | Verificar `STRIPE_WEBHOOK_SECRET` coincide con el de Stripe Dashboard |
| RLS bloquea operación de backend | Usando cliente sin permisos admin | Usar `createAdminClient()` en el webhook/cron |
| Push notification no llega | VAPID keys mal configuradas | Regenerar con `web-push generate-vapid-keys` |
