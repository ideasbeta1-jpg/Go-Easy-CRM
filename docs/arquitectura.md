# 🏗️ Arquitectura y Estructura del Proyecto

> Actualizado `2026-06-17` · Next.js 16.2 (App Router) · React 19 · Tailwind CSS v4 · TypeScript.

Este documento detalla la estructura del repositorio de **Go Easy CRM**, las rutas de API, los módulos core, las server actions y las integraciones externas.

---

## 📦 Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| Framework | Next.js 16.2 (App Router) · React 19.2 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS v4 (tokens en `globals.css`, sin `tailwind.config`) |
| Base de datos / Auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Pagos | Stripe |
| WhatsApp | Meta WABA (oficial) + Evolution API (alternativo) |
| Email | Resend |
| VoIP | Zadarma (WebRTC + PBX) |
| Gráficas | Recharts |
| UI | lucide-react (iconos), sonner (toasts), Material Symbols |
| PWA | `@ducanh2912/next-pwa` (Workbox), `web-push` |
| Tracking | Meta CAPI + Google (`@next/third-parties`) |
| Audio | `@ffmpeg-installer/ffmpeg` (conversión a OGG/OPUS) |
| PDF | `jspdf` + `html2canvas` |

---

## 📂 Estructura del Repositorio

```
├── docs/                   # 📚 Esta documentación (+ schema.sql)
├── public/                 # Assets públicos, service worker, iconos PWA
├── n8n-workflows/          # Workflows n8n (bus de eventos secundario)
├── src/
│   ├── app/                # App Router (páginas, APIs, layouts)
│   │   ├── api/            # Route handlers (backend REST)
│   │   │   ├── audio/      # convert · send (conversión OGG y envío WA)
│   │   │   ├── cron/       # process-actions · daily-report
│   │   │   ├── export/     # messages (exportar chat)
│   │   │   ├── leads/      # POST formulario público
│   │   │   ├── media/      # send (multimedia WA)
│   │   │   ├── public-data/# datos públicos (catálogo, ubicaciones)
│   │   │   ├── push/       # subscribe (web push)
│   │   │   ├── webhooks/   # stripe · whatsapp
│   │   │   └── zadarma/    # webhook · calls · click-to-call · webrtc-key · test
│   │   ├── dashboard/      # CRM (ver modulos-dashboard.md)
│   │   │   ├── automations/  contactos/  tasks/  logs/
│   │   │   ├── leads/  chats/  catalog/  providers/  reports/
│   │   │   ├── messages/  profile/  settings/  components/
│   │   ├── cotizacion/ q/  # vistas públicas de cotización
│   │   ├── voucher/ v/     # vistas públicas de voucher (v = enlace corto)
│   │   ├── cotizar/        # formulario de cotización
│   │   ├── landing*/       # landing pages (PR, PR v2)
│   │   ├── login/ auth/    # autenticación
│   │   └── utils/actions/  # 🔑 Server Actions (mutaciones)
│   ├── components/         # Componentes globales (ZadarmaWidget)
│   ├── lib/                # zadarma.ts · leads/ (transitions, etc.)
│   └── utils/              # Motores y clientes
│       ├── automation-engine.ts     # Motor de automatizaciones por etapa
│       ├── automation-scheduler.ts  # Programa reglas → pending_actions/tasks
│       ├── assignment.ts            # Round Robin
│       ├── waba.ts / whatsapp.ts    # WhatsApp (oficial / Evolution)
│       ├── email.ts                 # Resend
│       ├── meta-capi.ts             # Conversions API
│       ├── n8n.ts                   # Bus de eventos secundario
│       ├── stripe.ts                # Cliente Stripe
│       ├── push-notifications.ts    # Web Push (VAPID)
│       ├── system-log.ts            # logSystemEvent()
│       └── supabase/                # client · server · admin · middleware
├── vercel.json             # Vercel Cron
└── package.json
```

---

## 🌐 Rutas de API (Endpoints)

| Endpoint | Método | Auth | Descripción |
| :--- | :--- | :--- | :--- |
| `/api/leads` | POST | Pública | Crear lead desde formulario → dispara `lead_nuevo` |
| `/api/public-data` | GET | Pública | Catálogo y ubicaciones para formularios |
| `/api/webhooks/stripe` | POST | Firma Stripe | `checkout.session.completed` → confirma reserva / auto-voucher |
| `/api/webhooks/whatsapp` | GET/POST | Verify token / firma | Mensajes y estados de WABA + Evolution |
| `/api/zadarma/webhook` | GET/POST | Firma Zadarma | Eventos de llamadas (`NOTIFY_*`) y grabaciones |
| `/api/zadarma/calls` | GET | Sesión | Listar llamadas |
| `/api/zadarma/click-to-call` | POST | Sesión | Iniciar llamada al cliente |
| `/api/zadarma/webrtc-key` | POST | Sesión | Credenciales WebRTC del widget |
| `/api/zadarma/test` | GET | Sesión | Test de conexión |
| `/api/audio/convert` | POST | Sesión | Convertir audio (ffmpeg) |
| `/api/audio/send` | POST | Sesión | Enviar audio OGG por WhatsApp |
| `/api/media/send` | POST | Sesión | Enviar imagen/documento por WhatsApp |
| `/api/export/messages` | GET | Sesión | Exportar historial de mensajes |
| `/api/push/subscribe` | POST | Sesión | Registrar suscripción web push |
| `/api/cron/process-actions` | GET | `CRON_SECRET` | Ejecuta `pending_actions` + reglas de inactividad |
| `/api/cron/daily-report` | GET | `CRON_SECRET` | Reporte diario de ventas por WhatsApp |

---

## 🔑 Server Actions (`src/app/utils/actions/`)

Toda mutación de datos pasa por server actions. Archivos principales:

| Archivo | Funciones clave |
| :--- | :--- |
| `leads.ts` | `updateLead`, `updateLeadStatus`, `deleteLead` (con auditoría en `lead_events`) |
| `tasks.ts` | `getMyTasks`, `getTasksForLead`, `createTask`, `completeTask`, `updateTask`, `cancelTask`, `createTaskAdmin` |
| `automation.ts` | `getAutomationConfig`, `saveAutomationConfig`, `getFailedAutomationLogs`, `retryAutomation` |
| `automation-rules.ts` | `getAutomationRules`, `createAutomationRule`, `toggleAutomationRule`, `deleteAutomationRule`, `getPendingActions`, `cancelPendingAction` |
| `whatsapp.ts` | `sendManualWhatsApp`, `sendManualWhatsAppMedia`, `getLeadMessages`, `sendTemplateFromChat` |
| `notifications.ts` | `broadcastNotification`, `createNotification`, `markNotificationRead` |
| `quotes.ts` | `generateQuoteForLead` |
| `vouchers.ts` | `generateVoucherForLead`, `saveVoucherDraft`, `updateProviderConfirmation` |
| `waba.ts` | `getWABATemplatesAction`, `createWABATemplateAction`, `saveTemplateMappingAction` |
| `providers.ts` | `createProvider`, `updateProvider`, `getProviderOffices` |
| `public.ts` | `submitPublicLead` |
| `simulate-payment.ts` | `simulatePayment` (testing) |

---

## 🧮 Lógica de Asignación Round Robin

Implementada en `src/utils/assignment.ts`. Resumen:

1. **Filtro:** agentes con `role = 'agente'` y `disabled = false`.
2. **Orden:** `last_assigned_at ASC` (NULLS FIRST) — el que lleva más tiempo sin recibir lead.
3. **Persistencia:** al asignar, `profiles.last_assigned_at = now()`.
4. **Herencia:** clientes recurrentes (con `contact_id`) heredan su agente sin pasar por la cola.

Detalle completo y `assignLeadWithContact` en [`automatizaciones.md`](automatizaciones.md#asignación-round-robin).

---

## 🔐 Autenticación y Clientes Supabase

| Cliente | Archivo | Uso | RLS |
| :--- | :--- | :--- | :--- |
| Browser | `utils/supabase/client.ts` | Componentes cliente | Respeta RLS |
| Server | `utils/supabase/server.ts` | Server components / actions / route handlers | Respeta RLS |
| Admin | `utils/supabase/admin.ts` | Webhooks y cron | **Bypass RLS** (service key) |

El middleware (`utils/supabase/middleware.ts`) protege `/dashboard`; sin sesión redirige a `/login`. El layout del dashboard hace una verificación adicional en servidor.

---

## 🔗 Integraciones Externas

Ver detalle de cada cliente, funciones y variables en [`integraciones.md`](integraciones.md) y [`automatizaciones.md`](automatizaciones.md#integraciones-de-canal-utils).

* **Supabase** — base de datos, auth y realtime (notificaciones, chats).
* **Meta WABA / Evolution API** — envío y recepción de WhatsApp.
* **Resend** — emails transaccionales por etapa.
* **Stripe** — enlaces de pago y confirmación de reservas.
* **Zadarma** — telefonía VoIP (click-to-call, grabaciones, WebRTC).
* **Meta CAPI** — eventos de conversión server-side.
* **n8n** — bus de eventos secundario.
* **Web Push (VAPID)** — notificaciones del navegador.
