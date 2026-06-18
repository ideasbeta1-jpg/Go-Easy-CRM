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

> Nombres exactos verificados contra el código (`process.env.*`). No inventar variantes.

```bash
# ─── SUPABASE ─────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Admin key — solo backend

# ─── STRIPE ───────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...           # sk_test_... para desarrollo
STRIPE_WEBHOOK_SECRET=whsec_...        # Secret del webhook de Stripe

# ─── WHATSAPP BUSINESS API (Meta WABA) ────────────────────────────────
WABA_ID=...                            # WhatsApp Business Account ID
WABA_PHONE_NUMBER_ID=123456789012345   # ID del número en Meta Business
WABA_ACCESS_TOKEN=EAAG...              # Token permanente de Meta
WABA_VERSION=v21.0                     # Versión del Graph API
WABA_APP_SECRET=...                    # Para validar firma del webhook (x-hub-signature-256)
WABA_VERIFY_TOKEN=...                  # Token de verificación del webhook (GET)

# ─── EVOLUTION API (WhatsApp alternativo) ─────────────────────────────
WHATSAPP_EVOLUTION_URL=https://evolution.tudominio.com
WHATSAPP_EVOLUTION_KEY=tu-api-key-evolution
WHATSAPP_EVOLUTION_INSTANCE=goeasy     # Nombre de la instancia

# ─── ZADARMA VoIP ─────────────────────────────────────────────────────
ZADARMA_USER_KEY=tu-user-key
ZADARMA_SECRET_KEY=tu-secret-key
ZADARMA_PBX_NUMBER=...                 # Número PBX para el widget WebRTC

# ─── EMAIL (Resend) ───────────────────────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM=Goeasy Florida <reservas@tudominio.com>

# ─── NOTIFICACIONES PUSH (Web Push) ───────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@goeasy.com

# ─── META CONVERSIONS API (CAPI) ──────────────────────────────────────
NEXT_PUBLIC_FB_PIXEL_ID=123456789     # Pixel ID (también usado por el cliente)
FB_ACCESS_TOKEN=...                    # Token de la Conversions API
FB_TEST_EVENT_CODE=...                 # Opcional — test events

# ─── GOOGLE ───────────────────────────────────────────────────────────
NEXT_PUBLIC_GA_ID=G-...                # Opcional — Google Analytics

# ─── CRON ─────────────────────────────────────────────────────────────
CRON_SECRET=...                        # Bearer token para /api/cron/*

# ─── APP URL ──────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000   # En producción: https://tudominio.com
```

> **n8n:** la URL del bus de eventos secundario está fijada en `src/utils/n8n.ts` (`https://n8nib.ideasbeta.com/webhook`); no se configura por variable de entorno.

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
| Desarrollo | `npm run dev` | Servidor con hot-reload |
| Build | `npm run build` | Compilación de producción |
| Producción | `npm run start` | Inicia el servidor compilado |
| Linting | `npm run lint` | ESLint con config Next.js |

---

## 4. Base de Datos

El esquema completo y ejecutable está en **[`docs/schema.sql`](schema.sql)**: extensiones, enums, funciones, las 24 tablas, índices, triggers, políticas RLS y datos semilla. Permite recrear la base desde cero. La versión explicada en español está en [`esquema-datos.md`](esquema-datos.md).

### Recrear el esquema en un proyecto nuevo

```bash
# Opción A: psql contra la conexión directa de Postgres del proyecto
psql "$SUPABASE_DB_URL" -f docs/schema.sql

# Opción B: SQL Editor de Supabase → pegar el contenido de docs/schema.sql
```

### Cambios de esquema con Supabase CLI (recomendado)

```bash
supabase login
supabase link --project-ref oupphpttipkedntaxizk
supabase migration new nombre_de_la_migracion   # crea supabase/migrations/<ts>_<nombre>.sql
supabase db push                                 # aplica migraciones pendientes
```

> Tras cualquier cambio de esquema, regenerar [`schema.sql`](schema.sql) y actualizar [`esquema-datos.md`](esquema-datos.md) para mantener la documentación sincronizada.

> ⚠️ **Seguridad:** la tabla `automation_logs` tiene RLS deshabilitado en producción. El SQL de remediación está al final de [`schema.sql`](schema.sql).

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
| Base de datos | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| WhatsApp WABA | `WABA_ID`, `WABA_PHONE_NUMBER_ID`, `WABA_ACCESS_TOKEN`, `WABA_VERSION`, `WABA_APP_SECRET`, `WABA_VERIFY_TOKEN` |
| WhatsApp Evolution | `WHATSAPP_EVOLUTION_URL`, `WHATSAPP_EVOLUTION_KEY`, `WHATSAPP_EVOLUTION_INSTANCE` |
| Pagos Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| VoIP Zadarma | `ZADARMA_USER_KEY`, `ZADARMA_SECRET_KEY`, `ZADARMA_PBX_NUMBER` |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` |
| Meta CAPI | `NEXT_PUBLIC_FB_PIXEL_ID`, `FB_ACCESS_TOKEN`, `FB_TEST_EVENT_CODE` |
| Push Notifications | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| Cron | `CRON_SECRET` |
| App URL | `NEXT_PUBLIC_APP_URL` |

---

## 9. Despliegue en Producción (Vercel)

El proyecto está configurado para despliegue en Vercel (`vercel.json` en la raíz):

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Configurar todas las variables de entorno en el panel de Vercel
3. El build command es: `npm run build`
4. El output directory es: `.next`

### Webhooks en Producción

Registrar las siguientes URLs en cada servicio externo:

| Servicio | URL del Webhook |
| :--- | :--- |
| Stripe | `https://tudominio.com/api/webhooks/stripe` |
| Meta WABA | `https://tudominio.com/api/webhooks/whatsapp` |
| Evolution API | `https://tudominio.com/api/webhooks/whatsapp` |
| Zadarma PBX | `https://tudominio.com/api/zadarma/webhook` |

### Cron Jobs

`vercel.json` ya programa el procesador de acciones:

```json
{ "crons": [ { "path": "/api/cron/process-actions", "schedule": "0 9 * * *" } ] }
```

* **`/api/cron/process-actions`** — ejecuta `pending_actions` vencidas + reglas de inactividad. Para mayor granularidad (p. ej. cada 15 min) ajustar el `schedule` o usar un scheduler externo.
* **`/api/cron/daily-report`** — reporte diario de ventas; **no** está en `vercel.json`. Programarlo aparte (Vercel Cron o cron-job.org).

Ambos requieren el header `Authorization: Bearer ${CRON_SECRET}`.

---

## 10. Resolución de Problemas Comunes

| Síntoma | Causa probable | Solución |
| :--- | :--- | :--- |
| Audio no se convierte/envía | `@ffmpeg-installer/ffmpeg` no resolvió el binario | Verificar instalación de dependencias nativas; revisar logs de `/api/audio/convert` |
| WhatsApp no envía | Token de WABA vencido | Renovar `WABA_ACCESS_TOKEN` en Meta Business |
| Webhook de Stripe rechazado | Secret incorrecto | Verificar `STRIPE_WEBHOOK_SECRET` coincide con el de Stripe Dashboard |
| RLS bloquea operación de backend | Usando cliente sin permisos admin | Usar `createAdminClient()` en el webhook/cron |
| Push notification no llega | VAPID keys mal configuradas | Regenerar con `web-push generate-vapid-keys` |
