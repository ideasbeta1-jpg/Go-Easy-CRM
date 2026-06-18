# 📊 Esquema de Base de Datos - Go Easy CRM

> **Verificado contra Supabase** · Proyecto `oupphpttipkedntaxizk` · PostgreSQL 17.6 · `2026-06-17`

Este documento detalla la estructura relacional, los tipos de datos y la lógica de estados del CRM de renta de vehículos Go Easy Florida. **24 tablas activas.**

> 💾 El DDL completo y ejecutable (extensiones, enums, tablas, índices, triggers, funciones, políticas RLS y datos semilla) está en **[`schema.sql`](schema.sql)**. Este `.md` es la versión explicada en español.

---

## 1. Tipos Personalizados (Enums)

| Tipo | Valores Permitidos |
| :--- | :--- |
| **`lead_status`** | `lead_nuevo`, `en_cotizacion`, `reserva_confirmada`, `voucher_enviado`, `cerrado` *(legacy)*, `cerrado_ganado`, `cerrado_perdido` |
| **`user_role`** | `admin`, `agente` (Default: `agente`) |

> **Cambio importante:** el estado terminal `cerrado` fue reemplazado por dos estados explícitos: `cerrado_ganado` (venta exitosa) y `cerrado_perdido` (venta caída, con `lost_reason`). `cerrado` se mantiene en el enum solo por compatibilidad con registros históricos.

---

## 2. Tablas Maestras (Catálogos)

### **`categories`** — Categorías de Vehículos
Define la flota disponible y sus precios base. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `name` | `text` | Ej: Económico, SUV, Minivan |
| `daily_price` | `numeric` | Precio de venta público / sugerido |
| `base_daily_cost` | `numeric` | Costo real dictado por el proveedor (Nullable) |
| `image_url` | `text` | URL de imagen en Storage (Nullable) |
| `description` | `text` | Descripción del vehículo (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |

---

### **`providers`** — Proveedores / Rentadoras
Rentadoras aliadas para gestión de flota externa. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `name` | `text` | Nombre del proveedor |
| `contact_name` | `text` | Nombre del contacto (Nullable) |
| `email` | `text` | Email de contacto (Nullable) |
| `whatsapp_group_id` | `text` | Integración con n8n / Evolution API (Nullable) |
| `logo_url` | `text` | Logo del proveedor en Storage (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |

---

### **`locations`** — Ubicaciones / Aeropuertos
Puntos de pickup y devolución disponibles. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `name` | `text` | **UNIQUE** — Nombre del aeropuerto o punto |
| `code` | `text` | Código IATA u otro (Nullable) |
| `type` | `text` | Tipo de sitio: `airport`, `downtown`, `terminal`, etc. (Nullable) |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`provider_offices`** — Oficinas por Ubicación
Mapea las oficinas de cada proveedor en cada ubicación. RLS: ✅ · **UNIQUE (`provider_id`, `location_id`)**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `provider_id` | `uuid` (FK) | → `providers.id` |
| `location_id` | `uuid` (FK) | → `locations.id` |
| `address` | `text` | Dirección física (Nullable) |
| `phone` | `text` | Teléfono de la oficina (Nullable) |
| `hours` | `text` | Horario de atención (Nullable) |
| `notes` | `text` | Notas internas (Nullable) |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

---

## 3. Usuarios y Contactos

### **`profiles`** — Perfiles de Staff
Información extendida de los usuarios del sistema. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK, FK) | → `auth.users.id` |
| `role` | `user_role` | Enum: `admin` / `agente`. Default: `'agente'` |
| `first_name` | `text` | Nombre (Nullable) |
| `last_name` | `text` | Apellido (Nullable) |
| `full_name` | `text` | Nombre completo — sincronizado desde `auth.users` (Nullable) |
| `phone` | `text` | Teléfono de contacto (Nullable) |
| `whatsapp_number` | `text` | Número para WhatsApp CRM (Nullable) |
| `bio` | `text` | Biografía o notas internas (Nullable) |
| `avatar_url` | `text` | URL de la imagen de perfil en Storage (Nullable) |
| `is_active` | `boolean` | Presencia online/offline del agente (Nullable, Default: `false`) |
| `last_active_at` | `timestamptz` | Última actividad del agente. Default: `now()` (Nullable) |
| `last_assigned_at` | `timestamptz` | Última asignación de lead — usado para Round Robin. Default: `now()` (Nullable) |
| `inactivity_timeout` | `integer` | Minutos de inactividad antes de marcar offline. Default: `60` (Nullable) |
| `zadarma_sip` | `text` | Extensión PBX del agente en Zadarma (Ej: `100`, `101`) (Nullable) |
| `zadarma_sip_password` | `text` | Contraseña SIP del agente (WebRTC) (Nullable) |
| `disabled` | `boolean` | **Controlado por admin.** Si es `true`, el agente NO recibe leads vía Round Robin. Default: `false` |
| `updated_at` | `timestamptz` | Default: `now()` |

> **`disabled` vs `is_active`:** `disabled` es un interruptor administrativo permanente (suspender a un agente); `is_active` es presencia en tiempo real (online/offline) que se apaga sola tras `inactivity_timeout` minutos vía `cleanup_stale_agents()`.

> **Lógica Round Robin:** la asignación ordena los agentes con `role = 'agente'` **y `disabled = false`** por `last_assigned_at ASC` (NULLS FIRST) y selecciona el primero. Índice parcial `idx_profiles_assignment` optimiza esta consulta. Ver [`automatizaciones.md`](automatizaciones.md#asignación-round-robin).

---

### **`contacts`** — Directorio de Clientes
Persona única (cliente) que puede tener múltiples reservas (leads) a lo largo del tiempo. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `first_name` | `text` | Nombre (Nullable) |
| `last_name` | `text` | Apellido (Nullable) |
| `email` | `text` | Correo (Nullable) |
| `phone` | `text` | Teléfono tal como se capturó (Nullable) |
| `phone_normalized` | `text` | Teléfono normalizado — **clave de deduplicación** (Nullable) |
| `assigned_to` | `uuid` (FK) | → `auth.users.id` — Agente "dueño" del cliente (Nullable) |
| `source` | `text` | Canal de origen (Nullable) |
| `utm_source` … `utm_content` | `text` | UTM tracking (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |
| `updated_at` | `timestamptz` | Default: `now()` |
| `deleted_at` | `timestamptz` | Soft delete (Nullable) |

> **Deduplicación:** índice único parcial sobre `phone_normalized` (cuando no es nulo y tiene ≥7 caracteres) impide contactos duplicados. Al crear un lead se busca por `phone_normalized`; si el contacto ya existe, el nuevo lead hereda su `assigned_to` (continuidad de agente).

---

## 4. Tabla Principal: Gestión de Leads

### **`leads`** — Pipeline de Ventas
Centraliza toda la información del cliente y el ciclo de vida de una reserva. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `first_name` | `text` | Nombre del cliente |
| `last_name` | `text` | Apellido del cliente |
| `phone` | `text` | Teléfono de contacto (Nullable) |
| `email` | `text` | Correo electrónico (Nullable) |
| `pickup_date` | `timestamptz` | Fecha/Hora de entrega (Nullable) |
| `return_date` | `timestamptz` | Fecha/Hora de devolución (Nullable) |
| `pickup_location` | `text` | Nombre de lugar de entrega — texto libre (Nullable) |
| `pickup_location_id` | `uuid` (FK) | → `locations.id` (Nullable) |
| `return_location` | `text` | Nombre de lugar de devolución — texto libre (Nullable) |
| `return_location_id` | `uuid` (FK) | → `locations.id` (Nullable) |
| `category_id` | `uuid` (FK) | → `categories.id` (Nullable) |
| `status` | `lead_status` | Estado del pipeline. Default: `lead_nuevo` |
| `status_changed_at` | `timestamptz` | Timestamp del último cambio de etapa — base para reglas de inactividad (Nullable) |
| `assigned_to` | `uuid` (FK) | → `auth.users.id` — Agente asignado (Nullable) |
| `provider_id` | `uuid` (FK) | → `providers.id` — Proveedor asignado (Nullable) |
| `contact_id` | `uuid` (FK) | → `contacts.id` — Cliente al que pertenece la reserva (Nullable) |
| `rate_plan` | `text` | Tarifa seleccionada. Default: `'base'`. Valores: `base`, `premium` (Nullable) |
| `agreed_daily_price` | `numeric` | Ganancia Go Easy acordada ($/día). Base para el depósito Stripe (Nullable) |
| `total_amount` | `numeric` | Monto total final = (Costo Prov + Ganancia) × días (Nullable) |
| `deposit_paid` | `boolean` | Indica si el depósito fue abonado. Default: `false` |
| `stripe_payment_id` | `text` | ID de transacción de Stripe (Nullable) |
| `source` | `text` | Canal de origen del lead: `web`, `whatsapp`, etc. (Nullable) |
| `utm_source` … `utm_content` | `text` | UTM tracking (Nullable) |
| `notes` | `text` | Notas internas — solo visibles para agentes (Nullable) |
| `lost_reason` | `text` | Motivo de pérdida (al pasar a `cerrado_perdido`) (Nullable) |
| `draft_provider_confirmation` | `text` | Borrador del nº de confirmación del proveedor, previo al voucher (Nullable) |
| `draft_conductor_nombre` | `text` | Borrador: nombre del conductor (Nullable) |
| `draft_conductor_telefono` | `text` | Borrador: teléfono del conductor (Nullable) |
| `deleted_at` | `timestamptz` | Soft delete — archivar lead sin borrarlo (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |
| `updated_at` | `timestamptz` | Default: `now()` · Trigger `update_leads_updated_at` |

> **Campos `draft_*`:** capturan los datos del voucher *antes* de generarlo formalmente. Permiten que el webhook de Stripe auto-genere el voucher al confirmarse el pago si el lead ya tiene `provider_id` + `draft_provider_confirmation`.

---

## 5. Documentos de Salida

### **`quotes`** — Cotizaciones
Historial de presupuestos enviados al cliente. Snapshot de los valores pactados. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `lead_id` | `uuid` (FK) | → `leads.id` |
| `stripe_link` | `text` | Link de pago dinámico de Stripe (Nullable) |
| `pdf_url` | `text` | Enlace a la landing o PDF de cotización (Nullable) |
| `total_amount` | `numeric` | Monto total snapshot al generar (Nullable) |
| `deposit_amount` | `numeric` | Depósito a cobrar online snapshot (Nullable) |
| `pickup_date` | `timestamptz` | Fecha de entrega snapshot (Nullable) |
| `return_date` | `timestamptz` | Fecha de devolución snapshot (Nullable) |
| `expires_at` | `timestamptz` | Fecha de vencimiento de la oferta (Nullable) |
| `is_active` | `boolean` | `true` = cotización vigente. Se pone en `false` al regenerar. Default: `true` |
| `created_at` | `timestamptz` | Default: `now()` |

> **Regeneración:** al regenerar una cotización, la anterior se marca `is_active = false` (invalida su enlace de pago). La línea de tiempo del lead muestra "Cotización Regenerada".
>
> **Comportamiento en UI Cliente:** cuando el lead vinculado pasa a `reserva_confirmada`, la cotización en vivo (`/q/[id]`) bloquea el botón de pago y muestra "RESERVA PAGADA".

---

### **`vouchers`** — Vouchers de Confirmación
Documentación final una vez asegurada la reserva. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `lead_id` | `uuid` (FK) | → `leads.id` |
| `confirmation_number` | `text` | ID interno Go Easy (Formato: `GF-XXXXXX`) |
| `provider_confirmation` | `text` | ID oficial de la rentadora (Ej: Hertz, Budget) (Nullable) |
| `voucher_url` | `text` | URL del voucher generado (Nullable) |
| `conductor_nombre` | `text` | Nombre del conductor titular (Nullable) |
| `conductor_telefono` | `text` | Teléfono del conductor (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |

> **Comportamiento:** al generarse, el lead cambia a `voucher_enviado`. El sistema usa la redirección corta `/v/{id}` hacia la vista detallada `/voucher/[id]`.

---

## 6. Comunicación

### **`messages`** — Historial de Chat
Mensajes WhatsApp (WABA / Evolution) intercambiados con el cliente. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `lead_id` | `uuid` (FK) | → `leads.id` (Nullable) |
| `contact_id` | `uuid` (FK) | → `contacts.id` — heredado automáticamente del lead (Nullable) |
| `content` | `text` | Contenido del mensaje |
| `direction` | `text` | Check: `inbound` o `outbound` (Nullable) |
| `media_url` | `text` | URL del archivo multimedia en Storage (Nullable) |
| `media_type` | `text` | Tipo MIME: `audio/ogg`, `image/jpeg`, etc. (Nullable) |
| `wamid` | `text` | ID de mensaje de WhatsApp — **UNIQUE** (parcial, cuando no es nulo) |
| `status` | `text` | Estado WABA: `sent`, `delivered`, `read`, `failed`. Default: `'sent'` (Nullable) |
| `is_read` | `boolean` | Indica si fue visto por un agente. Default: `false` (Nullable) |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

> **Trigger `trg_set_message_contact_id`:** al insertar un mensaje sin `contact_id`, lo hereda del lead asociado. Función SQL `get_conversation_previews(uuid[])` devuelve el último mensaje de cada lead (usado por la bandeja de chats).

---

### **`lead_notes`** — Notas Internas de Leads
Notas agregadas por los agentes sobre un lead. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `lead_id` | `uuid` (FK) | → `leads.id` |
| `agent_id` | `uuid` (FK) | → `profiles.id` — Agente que escribió la nota (Nullable) |
| `content` | `text` | Contenido de la nota |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`lead_events`** — Auditoría del Lead
Registro inmutable de eventos del ciclo de vida del lead. Alimenta la Línea de Tiempo. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `lead_id` | `uuid` (FK) | → `leads.id` |
| `event_type` | `text` | `stage_change`, `payment_confirmed`, `agent_assigned`, `field_changed`, etc. |
| `actor_id` | `uuid` (FK) | → `profiles.id` — Usuario que disparó el evento (Nullable) |
| `actor_label` | `text` | Etiqueta legible del actor (ej. "Sistema", "Stripe") (Nullable) |
| `from_status` | `text` | Estado previo (en `stage_change`) (Nullable) |
| `to_status` | `text` | Estado nuevo (en `stage_change`) (Nullable) |
| `metadata` | `jsonb` | Datos del evento (campo cambiado, monto, etc.). Default: `{}` |
| `created_at` | `timestamptz` | Default: `now()` |

---

### **`notifications`** — Notificaciones In-App
Alertas internas para los usuarios del CRM. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `user_id` | `uuid` (FK) | → `auth.users.id` (Nullable) |
| `type` | `text` | `lead_assigned`, `payment_confirmed`, `new_message`, `new_lead`, `quote_generated`, `voucher_sent`, `lead_closed`, `status_changed` |
| `title` | `text` | Título de la notificación |
| `body` | `text` | Cuerpo del mensaje (Nullable) |
| `link` | `text` | URL de redirección interna (Nullable) |
| `lead_id` | `uuid` (FK) | → `leads.id` (Nullable) |
| `is_read` | `boolean` | Default: `false` (Nullable) |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`call_logs`** — Historial de Llamadas Zadarma
Registra todas las llamadas VoIP procesadas por Zadarma PBX. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `lead_id` | `uuid` (FK) | → `leads.id` (Nullable) |
| `agent_id` | `uuid` (FK) | → `profiles.id` (Nullable) |
| `zadarma_call_id` | `text` | **UNIQUE** — ID de la llamada en Zadarma (Nullable) |
| `caller_number` | `text` | Número que inició la llamada (Nullable) |
| `called_number` | `text` | Número al que se llamó (Nullable) |
| `pbx_extension` | `text` | Extensión PBX del agente (Nullable) |
| `direction` | `text` | Check: `inbound` o `outbound` (Nullable) |
| `status` | `text` | `initiated`, `answered`, `missed`, `failed`, `ended`. Default: `'initiated'` |
| `duration` | `integer` | Duración en segundos. Default: `0` |
| `recording_url` | `text` | URL de grabación (tras webhook `NOTIFY_RECORD`) (Nullable) |
| `started_at` / `answered_at` / `ended_at` | `timestamptz` | Timestamps del ciclo de la llamada (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |

---

### **`push_subscriptions`** — Suscripciones Web Push
Endpoints de notificaciones push del navegador por usuario. RLS: ✅ · **UNIQUE (`user_id`, `endpoint`)**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `user_id` | `uuid` (FK) | → `auth.users.id` |
| `endpoint` | `text` | URL del push service |
| `p256dh` | `text` | Clave pública de la suscripción |
| `auth` | `text` | Secreto de autenticación de la suscripción |
| `created_at` | `timestamptz` | Default: `now()` |

> Las suscripciones inválidas (respuestas `410`/`404`) se limpian automáticamente al enviar.

---

## 7. Tareas y Seguimiento

### **`tasks`** — Tareas del Equipo
Tareas manuales o generadas por el motor, con seguimiento por resultado. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `lead_id` | `uuid` (FK) | → `leads.id` |
| `task_type` | `text` | `call`, `whatsapp`, `meeting`, `email`, `custom`. Default: `'call'` |
| `title` | `text` | Título de la tarea |
| `description` | `text` | Descripción (Nullable) |
| `due_date` | `timestamptz` | Fecha de vencimiento (Nullable) |
| `assigned_to` | `uuid` (FK) | → `auth.users.id` (Nullable) |
| `status` | `text` | `pending`, `in_progress`, `completed`, `cancelled`. Default: `'pending'` |
| `priority` | `text` | `low`, `medium`, `high`, `urgent`. Default: `'medium'` |
| `outcome` | `text` | Resultado: `positive`, `negative`, `no_answer` (Nullable) |
| `outcome_notes` | `text` | Notas del resultado capturadas al completar (Nullable) |
| `completed_at` | `timestamptz` | Cuándo se completó (Nullable) |
| `completed_by` | `uuid` (FK) | → `auth.users.id` (Nullable) |
| `follow_up_rules` | `jsonb` | Acciones automáticas por outcome. Default: `{}` |
| `parent_task_id` | `uuid` (FK) | → `tasks.id` — tarea de la que deriva un follow-up (Nullable) |
| `automation_rule_id` | `uuid` | Regla que generó la tarea (auditoría) (Nullable) |
| `source` | `text` | `manual` o `automation`. Default: `'manual'` |
| `created_by` | `uuid` (FK) | → `auth.users.id` (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |
| `updated_at` | `timestamptz` | Default: `now()` · Trigger `tasks_updated_at` |

> **`follow_up_rules`:** estructura anidable que define qué hacer según el resultado. Ejemplo:
> ```json
> {
>   "positive": { "action": "notify_agent", "message": "Confirmado con {{first_name}} ✅" },
>   "no_answer": { "action": "create_task", "task_type": "whatsapp", "delay_hours": 24 }
> }
> ```
> Ver [`automatizaciones.md`](automatizaciones.md#tareas-y-seguimiento-follow-up).

---

## 8. Plantillas y Configuración

### **`email_templates`** — Templates de Email
Plantillas de correo configurables por etapa. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `stage` | `text` | **UNIQUE** — Etapa del pipeline asociada |
| `subject` | `text` | Asunto del correo |
| `body` | `text` | Cuerpo HTML del correo |
| `created_at` / `updated_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`whatsapp_template_mappings`** — Mappings de Templates WABA
Configuración de variables para templates aprobados de WhatsApp Business. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `template_name` | `text` | **UNIQUE** — Nombre exacto del template en Meta |
| `stage` | `text` | Etapa del pipeline que usa este template (Nullable) |
| `language_code` | `text` | Idioma: `es`, `en`, `es_CO`, etc. Default: `'es'` (Nullable) |
| `mappings` | `jsonb` | Variables del template → campos del lead. Default: `{}` |
| `created_at` / `updated_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`system_settings`** — Configuración Global del CRM
Tabla singleton (una sola fila, `id = 1`) con ajustes de marca y SEO. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `integer` (PK) | Check: `id = 1` — Singleton. Default: `1` |
| `crm_name` | `text` | Default: `'Go Easy CRM'` (Nullable) |
| `crm_tagline` | `text` | Default: `'Premium Car Rental CRM'` (Nullable) |
| `logo_url` / `favicon_url` | `text` | Assets en Storage (Nullable) |
| `seo_title` / `seo_description` / `seo_keywords` | `text` | SEO por defecto (Nullable) |
| `google_config` | `jsonb` | Config de Google (Analytics/Search Console). Default: `{}` (Nullable) |
| `ai_search_config` | `jsonb` | Config de búsqueda con IA. Default: `{}` (Nullable) |
| `updated_at` | `timestamptz` | Default: `now()` (Nullable) |

---

## 9. Motor de Automatización

### **`automation_config`** — Canales por Etapa
Habilita/deshabilita cada canal por etapa. RLS: ✅ · **PK compuesta (`stage`, `channel`)**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `stage` | `text` (PK) | Etapa del pipeline |
| `channel` | `text` (PK) | `whatsapp`, `email`, `n8n`, `in_app`, `meta_capi`, `agent_whatsapp` |
| `enabled` | `boolean` | Default: `true` |
| `updated_at` | `timestamptz` | Default: `now()` (Nullable) |

> Si no existe la fila para un canal, el motor lo asume **habilitado** por defecto.

---

### **`automation_rules`** — Reglas del Motor
Reglas configurables: disparadores (delay / fecha / inactividad) → acciones. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `name` | `text` | Nombre descriptivo |
| `enabled` | `boolean` | Default: `true` (Nullable) |
| `trigger_type` | `text` | `stage_delay`, `date_field`, `inactivity` |
| `trigger_stage` | `text` | Etapa que dispara (para `stage_delay`/`inactivity`) (Nullable) |
| `trigger_delay_hours` | `integer` | Horas de espera tras el disparo (Nullable) |
| `trigger_date_field` | `text` | `pickup_date` o `return_date` (para `date_field`) (Nullable) |
| `trigger_date_offset_hours` | `integer` | Offset desde la fecha. Default: `-24` (Nullable) |
| `action_type` | `text` | `whatsapp_template`, `whatsapp_text`, `change_stage`, `notify_agent`, `create_task` |
| `action_template` | `text` | Nombre de plantilla WABA (Nullable) |
| `action_message` | `text` | Texto libre con `{{variables}}` (Nullable) |
| `action_stage` | `text` | Etapa destino (para `change_stage`) (Nullable) |
| `task_payload` | `jsonb` | Config de la tarea a crear (título, prioridad, follow-ups) (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` (Nullable) |

---

### **`pending_actions`** — Cola de Acciones Diferidas
Acciones programadas que el cron ejecuta cuando `execute_at <= now()`. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `rule_id` | `uuid` (FK) | → `automation_rules.id` (Nullable) |
| `lead_id` | `uuid` | Lead objetivo |
| `execute_at` | `timestamptz` | Cuándo ejecutar |
| `status` | `text` | `pending`, `processing`, `done`, `failed`, `cancelled`. Default: `'pending'` |
| `action_type` | `text` | Tipo de acción |
| `action_payload` | `jsonb` | Datos para ejecutar la acción. Default: `{}` |
| `error` | `text` | Mensaje de error si falló (Nullable) |
| `executed_at` | `timestamptz` | Cuándo se ejecutó (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` (Nullable) |

---

### **`automation_logs`** — Logs de Automatizaciones
Un registro por canal disparado. Alimenta el panel de fallos. **RLS: ❌ (ver nota de seguridad)**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `lead_id` | `uuid` (FK) | → `leads.id` (Nullable) |
| `stage` | `text` | Etapa que disparó la automatización |
| `channel` | `text` | `whatsapp`, `email`, `n8n`, `meta_capi`, `in_app`, `agent_whatsapp`, `system` |
| `template_name` | `text` | Nombre del template/acción (Nullable) |
| `status` | `text` | `sent`, `failed`, `skipped`, `success`, `error`. Default: `'sent'` (Nullable) |
| `error_message` | `text` | Detalle del error si falló (Nullable) |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

> ⚠️ **Seguridad:** esta tabla tiene **RLS deshabilitado** en producción, por lo que queda expuesta a las roles `anon`/`authenticated`. El SQL de remediación (habilitar RLS + políticas admin/service_role) está documentado al final de [`schema.sql`](schema.sql). Validar `FailedLogsPanel` antes de aplicarlo.

---

### **`system_logs`** — Bitácora de Salud del Sistema
Registro centralizado de errores y eventos de integraciones. Alimenta `/dashboard/logs`. RLS: ✅ (solo admin lee)

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `category` | `text` | `whatsapp`, `email`, `payment`, `form`, `system`, `n8n`, `meta_capi` |
| `severity` | `text` | `info`, `warning`, `error`, `critical`. Default: `'error'` |
| `source` | `text` | Origen (ej. `automation_engine`, `stripe_webhook`) |
| `status` | `text` | `success`, `failed`, `skipped` (Nullable) |
| `message` | `text` | Mensaje legible |
| `error` | `text` | Detalle técnico (Nullable) |
| `lead_id` | `uuid` (FK) | → `leads.id` (Nullable) |
| `context` | `jsonb` | Metadata adicional. Default: `{}` |
| `created_at` | `timestamptz` | Default: `now()` |

---

## 10. Funciones y Triggers

| Objeto | Tipo | Propósito |
| :--- | :--- | :--- |
| `is_admin()` | función | Devuelve `true` si el usuario actual es admin y no está `disabled`. Usada por las políticas RLS. `SECURITY DEFINER` |
| `handle_new_user()` | función + trigger `on_auth_user_created` | Crea un `profile` al registrarse un usuario en `auth.users` |
| `cleanup_stale_agents()` | función | Marca `is_active = false` a los agentes que superaron su `inactivity_timeout` |
| `get_conversation_previews(uuid[])` | función | Último mensaje de cada lead — bandeja de chats |
| `set_message_contact_id()` | función + trigger `trg_set_message_contact_id` | Hereda `contact_id` del lead al insertar un mensaje |
| `update_updated_at_column()` | función + trigger `update_leads_updated_at` | `updated_at = now()` en UPDATE de `leads` |
| `update_tasks_updated_at()` | función + trigger `tasks_updated_at` | `updated_at = now()` en UPDATE de `tasks` |

---

## 11. Diagrama de Relaciones

```
auth.users ──── (1:1) ──── profiles
auth.users ──── (1:N) ──── leads (assigned_to)
auth.users ──── (1:N) ──── contacts (assigned_to)
auth.users ──── (1:N) ──── notifications (user_id)
auth.users ──── (1:N) ──── push_subscriptions (user_id)
auth.users ──── (1:N) ──── tasks (assigned_to / created_by / completed_by)

contacts  ──── (1:N) ──── leads (contact_id)
contacts  ──── (1:N) ──── messages (contact_id)

leads ──── (N:1) ──── categories
leads ──── (N:1) ──── providers
leads ──── (N:1) ──── locations (pickup_location_id / return_location_id)
leads ──── (1:N) ──── quotes
leads ──── (1:N) ──── vouchers
leads ──── (1:N) ──── messages
leads ──── (1:N) ──── lead_notes
leads ──── (1:N) ──── lead_events
leads ──── (1:N) ──── tasks
leads ──── (1:N) ──── call_logs
leads ──── (1:N) ──── automation_logs
leads ──── (1:N) ──── system_logs
leads ──── (1:N) ──── notifications
leads ──── (1:N) ──── pending_actions (por lead_id)

providers ──── (1:N) ──── provider_offices
locations ──── (1:N) ──── provider_offices
profiles  ──── (1:N) ──── lead_notes / lead_events / call_logs (actor/agent)

automation_rules ──── (1:N) ──── pending_actions (rule_id)
tasks ──── (1:N) ──── tasks (parent_task_id, self-ref)
```

---

## 12. Almacenamiento (Storage Buckets)

| Bucket | Uso | Acceso |
| :--- | :--- | :--- |
| `avatars` | Fotos de perfil de agentes y admins | Público lectura |
| `chat_media` | Audios, imágenes y documentos de los chats de WhatsApp | Público lectura |
| `provider-logos` | Logotipos de las rentadoras aliadas | Público lectura |
| `vehicles` | Imágenes de flota por categorías | Público lectura |

---

## 13. Lógica de Cálculo y Negociación (Sistema de Triple Control)

### Fórmulas Base
* **Total Diario** = `Costo Vehículo (base_daily_cost)` + `Ganancia Go Easy (agreed_daily_price)`
* **Total Reserva** = `Total Diario` × `Días de Renta`
* **Depósito Stripe** = `Ganancia Go Easy (agreed_daily_price)` × `Días de Renta`
* **Pago en Counter** = `Total Reserva` − `Depósito`

### Comportamiento en la Interfaz (Lead Detail)
1. **Costo Vehículo**: Editable. Al cambiarlo → el **Total Diario** se actualiza manteniendo la **Ganancia** fija.
2. **Ganancia Go Easy**: Editable. Al cambiarlo → el **Total Diario** se actualiza manteniendo el **Costo** fijo.
3. **Total Diario**: Editable. Al cambiarlo → el **Costo Vehículo** se recalcula manteniendo la **Ganancia** fija.
