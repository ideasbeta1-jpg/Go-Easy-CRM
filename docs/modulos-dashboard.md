# Módulos del Dashboard

Este documento describe cada sección del dashboard del CRM: su propósito, rutas, componentes principales, acceso por rol y funcionalidades disponibles.

---

## 1. Layout General del Dashboard

**Ruta:** `/dashboard` (todas las subrutas la heredan)
**Archivo:** `src/app/dashboard/layout.tsx`

### Estructura visual

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (desktop, 288px)  │  HEADER                │
│  ─────────────────────────  │  ─────────────────────  │
│  Logo / CRM Name           │  Búsqueda · Bell · Avatar│
│  ─────────────────────────  │                        │
│  Navegación principal      │  CONTENIDO DINÁMICO    │
│  ─────────────────────────  │  ({children})          │
│  Sales Tips card            │                        │
│  ─────────────────────────  │                        │
│  Configuración              │                        │
│  Cerrar Sesión              │                        │
└─────────────────────────────────────────────────────┘
```

En **móvil**, la sidebar se oculta y aparece una navegación inferior (`MobileAppNavigation`).

### Componentes del layout

| Componente | Archivo | Descripción |
| :--- | :--- | :--- |
| `SidebarNav` | `components/SidebarNav` | Menú de navegación con estados activos |
| `DashboardHeader` | `components/DashboardHeader` | Barra superior con perfil y notificaciones |
| `MobileAppNavigation` | `components/MobileAppNavigation` | Barra de navegación inferior móvil |
| `NotificationProvider` | `components/NotificationProvider` | Contexto global de notificaciones en tiempo real |
| `ActiveStatusTracker` | `components/ActiveStatusTracker` | Actualiza `last_active_at` del agente periódicamente |
| `PWAHead` | `components/PWAHead` | Meta tags para PWA (manifest, theme-color) |
| `Toaster` | Sonner | Notificaciones toast en esquina superior derecha |

### Menú de navegación

| Ítem | Ruta | Acceso |
| :--- | :--- | :--- |
| Inicio | `/dashboard` | Todos |
| Leads (Kanban) | `/dashboard/leads` | Todos |
| Contactos | `/dashboard/contactos` | Admin todos · Agente asignados |
| Tareas | `/dashboard/tasks` | Todos (propias) |
| Chats WhatsApp | `/dashboard/chats` | Todos |
| Catálogo Flota | `/dashboard/catalog` | Todos |
| Proveedores | `/dashboard/providers` | Todos |
| Reportes | `/dashboard/reports` | Todos |
| Mensajes | `/dashboard/messages` | Todos |
| Automatizaciones | `/dashboard/automations` | Admin |
| Logs del Sistema | `/dashboard/logs` | Admin |
| Configuración | `/dashboard/settings` | Admin |

---

## 2. Inicio — Dashboard Principal

**Ruta:** `/dashboard`

Vista de resumen con métricas clave del CRM:
- Leads activos por etapa
- Leads asignados al agente actual
- Actividad reciente
- Acceso rápido a las secciones principales

---

## 3. Leads — Kanban Board

**Ruta:** `/dashboard/leads`
**Componente principal:** `KanbanBoard.tsx`

### Descripción

Vista estilo Kanban con una columna por cada estado del pipeline. Permite:
- Ver todos los leads activos ordenados por `created_at DESC`
- Arrastrar y soltar tarjetas entre columnas para cambiar el status
- Filtrar por agente asignado, categoría de vehículo, rango de fechas
- Crear nuevos leads con el botón "+" en la columna `lead_nuevo`

### Tarjeta de lead (KanbanCard)

Cada tarjeta muestra:
- Nombre y apellido del cliente
- Número de teléfono
- Categoría de vehículo
- Fechas de pickup y return
- Avatar del agente asignado
- Indicador de mensajes no leídos (badge rojo)

### Filtros disponibles

| Filtro | Descripción |
| :--- | :--- |
| Agente | Muestra solo leads asignados a un agente específico |
| Categoría | Filtra por tipo de vehículo |
| Fecha | Leads con pickup en un rango de fechas |
| Búsqueda | Por nombre, teléfono o email del cliente |

### Detalle del lead

**Ruta:** `/dashboard/leads/[id]`
**Componente principal:** `LeadDetailClient.tsx` · secciones en `components/sections/`

Layout de dos columnas (izquierda: tabs; derecha: chat WhatsApp + últimas notas). Encabezado con ID corto `GE-{últimos 4}`, badge de estado, badge "Urgente" (si >48h en lead nuevo/cotización) y acciones: Click-to-Call, Email, retroceder/avanzar etapa, archivar (soft delete).

**Barra de pipeline (`PipelineStatusBar`):** 6 etapas clickeables con etapa actual destacada, pasadas con check y futuras en gris.

**Tabs:**

| Tab | Contenido |
| :--- | :--- |
| **Información** | Datos del cliente, fecha de recogida, categoría, agente, notas internas, toggle "Depósito Recibido", resumen de cobro |
| **Cotización** | Selector de vehículo, días/$día/total, rate plan base↔premium, logística pickup/return, negociación triple control, generar/regenerar cotización |
| **Voucher** | Datos del conductor, nº de confirmación del proveedor, generar/guardar borrador de voucher |
| **Historial** | Línea de tiempo (`ActivityTimeline`): cotizaciones, vouchers, cambios de etapa, pagos, notas y eventos de `lead_events` |
| **Tareas** | `TasksPanel`: tareas del lead, crear, completar con resultado, cancelar |
| **Chat** | Historial WhatsApp con scroll infinito, audio grabado, optimistic updates |

**Banner de cliente recurrente (`ContactReservationsBanner`):** si el lead pertenece a un contacto con otras reservas, muestra un resumen y enlace a su ficha.

**Panel de llamadas (`CallLogPanel`):** llamadas Zadarma asociadas al lead.

**Sistema de precios — triple control:** ver [`esquema-datos.md`](esquema-datos.md#13-lógica-de-cálculo-y-negociación-sistema-de-triple-control).

---

## 4. Chats WhatsApp

**Ruta:** `/dashboard/chats`
**Componente principal:** `ChatInboxClient.tsx`

### Descripción

Bandeja de entrada de todos los mensajes de WhatsApp (inbound y outbound). Equivalente a una vista de CRM sobre WhatsApp Business.

### Funcionalidades

- Lista de conversaciones ordenadas por último mensaje
- Indicador de mensajes no leídos por conversación
- Búsqueda por nombre o número
- Vista de mensajes dentro de cada conversación
- Envío de mensajes de texto libre (vía Evolution API)
- Envío de imágenes, documentos y audio
- Grabación de audio directamente desde la UI (convierte a formato compatible con WhatsApp)
- Vinculación de un número de teléfono a un lead existente

### Manejo de multimedia

El endpoint `POST /api/audio` procesa grabaciones de audio y las convierte al formato OGG/OPUS compatible con WhatsApp. El endpoint `POST /api/media` maneja la subida de imágenes y documentos a Supabase Storage antes de enviarlos.

---

## 5. Catálogo de Flota

**Ruta:** `/dashboard/catalog`

### Descripción

Gestión del catálogo de vehículos disponibles para renta. Mapea directamente la tabla `categories`.

### Funcionalidades

- Listar categorías con imagen, nombre, descripción y precios
- Crear nueva categoría (nombre, imagen, precio público, costo base)
- Editar categoría existente
- Eliminar categoría (verificar que no tenga leads activos antes)
- Subir imagen de la categoría a Supabase Storage (`vehicles` bucket)

### Campos por categoría

| Campo | Descripción |
| :--- | :--- |
| Nombre | Ej: Económico, SUV, Minivan, Convertible |
| Descripción | Características del vehículo |
| Precio público (`daily_price`) | Tarifa de referencia para el cliente |
| Costo base (`base_daily_cost`) | Costo real del proveedor — solo visible para el equipo |
| Imagen | URL en bucket `vehicles` |

---

## 6. Proveedores

**Ruta:** `/dashboard/providers`

### Descripción

Directorio de rentadoras aliadas (Hertz, Budget, Enterprise, etc.). Mapea las tablas `providers` y `provider_offices`.

### Funcionalidades

- Listar proveedores con logo, nombre y contacto
- Crear/editar proveedor con datos de contacto
- Gestionar oficinas por ubicación (`provider_offices`)
- Asignar un grupo de WhatsApp para notificaciones al proveedor (`whatsapp_group_id`)
- Subir logo a Supabase Storage (`provider-logos` bucket)

---

## 7. Reportes

**Ruta:** `/dashboard/reports`

### Descripción

Panel de analítica con gráficas interactivas (Recharts) sobre el rendimiento del equipo y del pipeline.

### Métricas disponibles

- Leads por etapa (gráfica de barras)
- Leads por agente (gráfica de torta)
- Tasa de conversión por etapa
- Ingresos generados por período
- Fuente de leads (web, whatsapp, manual)
- Leads con UTM tracking (por campaña, medio, fuente)
- Leads creados por semana/mes

---

## 8. Mensajes

**Ruta:** `/dashboard/messages`

### Descripción

Historial completo de todos los mensajes del CRM. Diferente a `/chats` (que agrupa por conversación), aquí se ven todos los mensajes en orden cronológico con filtros avanzados.

---

## 9. Automatizaciones

**Ruta:** `/dashboard/automations` · **Acceso:** Admin
**Componentes:** `AutomationConfigPanel`, `RulesPanel`, `PendingActionsPanel`, `FailedLogsPanel`

Centro de control del motor. Ver lógica completa en [`automatizaciones.md`](automatizaciones.md). Cuatro paneles:

#### 9.1 Control de Canales (`AutomationConfigPanel`)
Matriz **etapa × canal** con toggles sobre la tabla `automation_config`. Canales: WhatsApp 💬, Email 📧, n8n ⚙️, Meta CAPI 📊, Notif. Interna 🔔, WA al Agente 🤝.

#### 9.2 Reglas (`RulesPanel`)
CRUD de `automation_rules`. Constructor de regla: **disparador** (`stage_delay` / `date_field` / `inactivity`) → **acción** (`whatsapp_template`, `whatsapp_text`, `change_stage`, `notify_agent`, `create_task`). Para `create_task` configura tipo, título, vencimiento, prioridad y follow-ups por resultado (positiva/negativa/sin respuesta).

#### 9.3 Cola de Acciones (`PendingActionsPanel`)
Vista de `pending_actions`: **Próximas** (`pending`/`processing`) e **Historial** (`done`/`failed`/`cancelled`). Cada fila muestra lead, regla, estado, error y hora de ejecución; las pendientes pueden cancelarse.

#### 9.4 Fallos (`FailedLogsPanel`)
Últimas automatizaciones con status `failed`/`error` (tabla `automation_logs`) con botón **Reintentar** (`retryAutomation`).

---

## 9b. Tareas

**Ruta:** `/dashboard/tasks`
**Componente principal:** `TasksClient.tsx`

Bandeja centralizada de tareas del usuario (propias). Soporta filtros (Pendientes / Completadas / Todas), búsqueda y registro de resultados.

| Concepto | Valores |
| :--- | :--- |
| **Tipo** (`task_type`) | `call` (azul), `whatsapp` (verde), `meeting` (púrpura), `email` (ámbar), `custom` (gris) |
| **Estado** (`status`) | `pending`, `in_progress`, `completed`, `cancelled` |
| **Prioridad** (`priority`) | `low`, `medium`, `high`, `urgent` |
| **Resultado** (`outcome`) | `positive` ✅, `negative` ❌, `no_answer` 📵 |
| **Origen** (`source`) | `manual` o `automation` (badge) |

Las tareas también aparecen en el Lead Detail (`TasksPanel`), en un banner del Kanban (`TaskBanner`, "tienes X tareas para hoy") y se completan vía `TaskOutcomeModal`. El seguimiento automático (follow-up) se describe en [`automatizaciones.md`](automatizaciones.md#tareas-y-seguimiento-follow-up).

---

## 9c. Contactos

**Ruta:** `/dashboard/contactos` · **Detalle:** `/dashboard/contactos/[id]`
**Componente principal:** `ContactsDirectoryClient.tsx`

Directorio de **clientes** (`contacts`). Un contacto es una persona única; un lead es una reserva concreta. Un contacto puede acumular varias reservas. Deduplicación por `phone_normalized`.

**Directorio:** nombre, teléfono, email, total de reservas, reservas ganadas, **LTV** (suma de `total_amount` de leads `cerrado_ganado`), última actividad y badge "Recurrente" (2+ reservas). Orden por defecto: LTV descendente. Métricas resumen: total de contactos, recurrentes y valor total ganado.

**Ficha de contacto:** encabezado con datos + agente, tarjetas KPI (total reservas, valor ganado, cliente desde) y tabla de todas sus reservas con estado, fecha, categoría y total.

**Acceso:** admin ve todos; agente solo los contactos con `assigned_to = su id`.

---

## 9d. Logs del Sistema

**Ruta:** `/dashboard/logs` · **Acceso:** Admin
**Componente principal:** `SystemLogsPanel.tsx`

Bitácora de salud de las integraciones (tabla `system_logs`). **Semáforo** por integración según errores de la última hora: ✅ Operativo (0), ⚠️ Inestable (1-2), 🔴 Caído (3+ o `critical`).

Integraciones monitoreadas: WhatsApp 💬, Email 📧, Pagos 💳, Formularios 📋, n8n ⚙️ (también `meta_capi`, `system`).

**Filtros:** por categoría, por severidad (`info`/`warning`/`error`/`critical`) y búsqueda libre. Muestra los últimos 150 eventos con badges, mensaje, detalle técnico, tiempo relativo y enlace al lead si aplica.

---

## 10. Configuración

**Ruta:** `/dashboard/settings`
**Acceso:** Solo administradores

### Sub-secciones

#### 10.1 Configuración de WhatsApp
**Ruta:** `/dashboard/settings/whatsapp`

Gestión de los mappings de templates WABA (tabla `whatsapp_template_mappings`):
- Ver los templates configurados por etapa
- Editar el mapping de variables (qué campo del lead va a cada parámetro del template)
- Actualizar el código de idioma del template

#### 10.2 Ubicaciones
**Ruta:** `/dashboard/settings/locations`

Gestión de los puntos de pickup y devolución (tabla `locations`):
- Agregar aeropuertos, terminales, oficinas
- Editar nombre, código IATA y tipo
- Eliminar ubicaciones sin leads activos

#### 10.3 Usuarios / Agentes
**Ruta:** `/dashboard/settings/users`

Gestión del equipo (tabla `profiles`):
- Ver todos los usuarios registrados
- Cambiar rol: `admin` ↔ `agente`
- Activar/desactivar agentes (`is_active`)
- Configurar extensión Zadarma (`zadarma_sip`)
- Configurar timeout de inactividad (`inactivity_timeout`)

#### 10.4 Templates de Email
**Ruta:** `/dashboard/settings/emails`

Editor de templates HTML por etapa (tabla `email_templates`):
- Editar asunto y cuerpo HTML de cada etapa
- Vista previa del template
- Soporte para variables dinámicas en el formato `{{variable}}`

#### 10.5 Configuración del Sistema
**Ruta:** `/dashboard/settings/system`

Ajustes globales del CRM (tabla `system_settings`, singleton `id = 1`):
- Nombre del CRM (`crm_name`)
- Tagline del sistema (`crm_tagline`)
- Logo y favicon (subida a Storage)
- SEO: título, descripción, keywords
- Configuración de Google Analytics / Search Console
- Configuración de búsqueda con IA

---

## 11. Perfil del Usuario

**Ruta:** `/dashboard/profile`

Permite a cada usuario gestionar su propio perfil:
- Cambiar nombre y apellido
- Subir foto de perfil (`avatars` bucket)
- Actualizar número de teléfono y WhatsApp personal
- Editar biografía
- Ver/copiar extensión Zadarma asignada

---

## 12. Sistema de Notificaciones In-App

### NotificationProvider

El componente `NotificationProvider` usa **Supabase Realtime** para escuchar nuevos registros en la tabla `notifications` filtrados por `user_id = currentUser`.

Cuando llega una notificación:
1. Se muestra un badge de conteo en el ícono de campana del header.
2. Aparece un toast (Sonner) con el título y body de la notificación.
3. La notificación queda en el panel desplegable de la campana hasta que el usuario la marque como leída.

### Tipos de notificaciones

| Tipo (`type`) | Emoji | Descripción |
| :--- | :--- | :--- |
| `new_lead` | 🟢 | Lead nuevo en el sistema |
| `lead_assigned` | 👤 | Nuevo lead asignado al agente |
| `payment_confirmed` | 💰 | Pago recibido vía Stripe |
| `new_message` | 💬 | Nuevo mensaje de WhatsApp |
| `quote_generated` | 📄 | Cotización generada |
| `voucher_sent` | 📋 | Voucher enviado |
| `lead_closed` | ✅ | Lead cerrado (ganado/perdido) |
| `status_changed` | 🔄 | Cambio de etapa |

Los colores y emojis se definen en `NotificationBell.tsx`. El `NotificationProvider` además reproduce un beep (Web Audio API), dispara notificaciones de escritorio y web push.

---

## 13. PWA (Progressive Web App)

El CRM funciona como PWA en dispositivos móviles y desktop:

- **Manifest**: Generado dinámicamente por `PWAHead` con el logo y nombre del CRM de `system_settings`
- **Service Worker**: Gestiona caché con Workbox (estrategia network-first para APIs, cache-first para assets estáticos)
- **Push Notifications**: Los agentes pueden suscribirse para recibir notificaciones del navegador aunque el CRM esté en segundo plano
- **Instalable**: Los usuarios pueden instalar el CRM como app nativa desde el navegador
