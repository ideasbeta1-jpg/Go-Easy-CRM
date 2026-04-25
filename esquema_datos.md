# 📊 Esquema de Base de Datos - Go Easy CRM

> **Verificado contra Supabase** · Proyecto `oupphpttipkedntaxizk` · PostgreSQL 17.6 · `2026-04-25`

Este documento detalla la estructura relacional, los tipos de datos y la lógica de estados del CRM de renta de vehículos Go Easy Florida. **15 tablas activas.**

---

## 1. Tipos Personalizados (Enums)

| Tipo | Valores Permitidos |
| :--- | :--- |
| **`lead_status`** | `lead_nuevo`, `en_cotizacion`, `reserva_confirmada`, `voucher_enviado`, `cerrado` |
| **`user_role`** | `admin`, `agente` (Default: `agente`) |

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
Mapea las oficinas de cada proveedor en cada ubicación. RLS: ✅

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

## 3. Tabla Principal: Gestión de Leads

### **`leads`** — Pipeline de Ventas
Centraliza toda la información del cliente y el ciclo de vida de la reserva. RLS: ✅ · **23 registros**

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
| `assigned_to` | `uuid` (FK) | → `auth.users.id` — Agente asignado (Nullable) |
| `provider_id` | `uuid` (FK) | → `providers.id` — Proveedor asignado (Nullable) |
| `rate_plan` | `text` | Tarifa seleccionada. Default: `'base'`. Valores: `base`, `premium` (Nullable) |
| `agreed_daily_price` | `numeric` | Ganancia Go Easy acordada ($/día). Base para el depósito Stripe. (Nullable) |
| `total_amount` | `numeric` | Monto total final = (Costo Prov + Ganancia) × días (Nullable) |
| `deposit_paid` | `boolean` | Indica si el depósito fue abonado. Default: `false` |
| `stripe_payment_id` | `text` | ID de transacción de Stripe (Nullable) |
| `source` | `text` | Canal de origen del lead: `web`, `whatsapp`, etc. (Nullable) |
| `utm_source` | `text` | UTM tracking (Nullable) |
| `utm_medium` | `text` | UTM tracking (Nullable) |
| `utm_campaign` | `text` | UTM tracking (Nullable) |
| `utm_term` | `text` | UTM tracking (Nullable) |
| `utm_content` | `text` | UTM tracking (Nullable) |
| `notes` | `text` | Notas internas — solo visibles para agentes (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |
| `updated_at` | `timestamptz` | Default: `now()` |

---

## 4. Tablas de Documentación y Salidas

### **`quotes`** — Cotizaciones
Historial de presupuestos enviados al cliente. Actúa como snapshot de los valores pactados. RLS: ✅ · **26 registros**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `lead_id` | `uuid` (FK) | → `leads.id` |
| `stripe_link` | `text` | Link de pago dinámico de Stripe (Nullable) |
| `pdf_url` | `text` | Enlace a la landing o PDF de cotización (Nullable) |
| `total_amount` | `numeric` | Monto total snapshot al momento de generar (Nullable) |
| `pickup_date` | `timestamptz` | Fecha de entrega snapshot (Nullable) |
| `return_date` | `timestamptz` | Fecha de devolución snapshot (Nullable) |
| `expires_at` | `timestamptz` | Fecha de vencimiento de la oferta (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |

> **Comportamiento en UI Cliente:** Cuando el `lead` vinculado pasa a `reserva_confirmada`, la cotización en vivo (`/q/[id]`) bloquea el botón de pago y muestra "RESERVA PAGADA" para evitar pagos duplicados.

---

### **`vouchers`** — Vouchers de Confirmación
Documentación final una vez cerrada la venta. RLS: ✅ · **7 registros**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `lead_id` | `uuid` (FK) | → `leads.id` |
| `confirmation_number` | `text` | ID interno Go Easy (Formato: `GF-XXXXXX`) |
| `provider_confirmation` | `text` | ID oficial de la rentadora (Ej: Hertz, Budget) (Nullable) |
| `voucher_url` | `text` | URL del voucher generado (Nullable) |
| `created_at` | `timestamptz` | Default: `now()` |

> **Comportamiento:** Al generarse, el lead cambia automáticamente a `voucher_enviado`. El sistema usa redirección `/v/{id}` como enlace corto.

---

## 5. Tablas de Comunicación

### **`messages`** — Historial de Chat
Mensajes WhatsApp / WABA intercambiados con el cliente. RLS: ✅ · **143 registros**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `lead_id` | `uuid` (FK) | → `leads.id` (Nullable) |
| `content` | `text` | Contenido del mensaje |
| `direction` | `text` | Check: `inbound` o `outbound` (Nullable) |
| `media_url` | `text` | URL del archivo multimedia en Storage (Nullable) |
| `media_type` | `text` | Tipo MIME: `audio/ogg`, `image/jpeg`, etc. (Nullable) |
| `wamid` | `text` | ID de mensaje de WhatsApp Business API (Nullable) |
| `status` | `text` | Estado de entrega WABA: `sent`, `delivered`, `read`, etc. Default: `'sent'` (Nullable) |
| `is_read` | `boolean` | Indica si fue visto por un agente. Default: `false` (Nullable) |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`notifications`** — Notificaciones In-App
Alertas internas para los usuarios del CRM. RLS: ✅ · **132 registros**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `user_id` | `uuid` (FK) | → `auth.users.id` (Nullable) |
| `type` | `text` | Tipo de evento: `lead_assigned`, `payment_confirmed`, etc. |
| `title` | `text` | Título de la notificación |
| `body` | `text` | Cuerpo del mensaje (Nullable) |
| `link` | `text` | URL de redirección interna (Nullable) |
| `lead_id` | `uuid` (FK) | → `leads.id` (Nullable) |
| `is_read` | `boolean` | Default: `false` (Nullable) |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

---

## 6. Tablas de Usuarios

### **`profiles`** — Perfiles de Staff
Información extendida de los usuarios del sistema. RLS: ✅ · **4 registros**

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
| `is_active` | `boolean` | Si el agente está activo en el sistema (Nullable, Default: `false`) |
| `last_active_at` | `timestamptz` | Última vez que el agente estuvo activo. Default: `now()` (Nullable) |
| `last_assigned_at` | `timestamptz` | Última asignación de lead — usado para Round Robin. Default: `now()` (Nullable) |
| `inactivity_timeout` | `integer` | Minutos de inactividad antes de marcar offline. Default: `60` (Nullable) |
| `updated_at` | `timestamptz` | Default: `now()` |

> **Lógica Round Robin:** La asignación automática de leads (`assignLeadToAgent`) ordena los agentes con `role = 'agente'` por `last_assigned_at ASC` y selecciona el primero (el que lleva más tiempo sin recibir un lead).

---

## 7. Tablas de Automatización

### **`automation_logs`** — Logs de Automatizaciones
Registro de todas las acciones automáticas disparadas por el motor. RLS: ❌ (sin restricciones) · **180 registros**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `lead_id` | `uuid` (FK) | → `leads.id` (Nullable) |
| `stage` | `text` | Etapa que disparó la automatización |
| `channel` | `text` | Canal utilizado: `whatsapp`, `email`, etc. |
| `template_name` | `text` | Nombre del template usado (Nullable) |
| `status` | `text` | Resultado: `sent`, `failed`, etc. Default: `'sent'` (Nullable) |
| `error_message` | `text` | Detalle del error si falló (Nullable) |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`email_templates`** — Templates de Email
Plantillas de correo configurables por etapa. RLS: ✅ · **5 registros**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `uuid_generate_v4()` |
| `stage` | `text` | **UNIQUE** — Etapa del pipeline asociada |
| `subject` | `text` | Asunto del correo |
| `body` | `text` | Cuerpo HTML del correo |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |
| `updated_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`whatsapp_template_mappings`** — Mappings de Templates WABA
Configuración de variables para templates aprobados de WhatsApp Business. RLS: ✅ · **4 registros**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `template_name` | `text` | **UNIQUE** — Nombre exacto del template en Meta |
| `stage` | `text` | Etapa del pipeline que usa este template (Nullable) |
| `language_code` | `text` | Idioma: `es`, `en`, etc. Default: `'es'` (Nullable) |
| `mappings` | `jsonb` | Variables del template → campos del lead. Default: `{}` |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |
| `updated_at` | `timestamptz` | Nullable, Default: `now()` |

---

## 8. Tablas de Notas y Configuración

### **`lead_notes`** — Notas Internas de Leads
Historial de notas agregadas por los agentes sobre un lead. RLS: ✅ · **25 registros**

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Default: `gen_random_uuid()` |
| `lead_id` | `uuid` (FK) | → `leads.id` |
| `agent_id` | `uuid` (FK) | → `profiles.id` — Agente que escribió la nota (Nullable) |
| `content` | `text` | Contenido de la nota |
| `created_at` | `timestamptz` | Nullable, Default: `now()` |

---

### **`system_settings`** — Configuración Global del CRM
Tabla singleton (una sola fila, `id = 1`) con ajustes de marca y SEO. RLS: ✅

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | `integer` (PK) | Check: `id = 1` — Singleton. Default: `1` |
| `crm_name` | `text` | Nombre del CRM. Default: `'Go Easy CRM'` (Nullable) |
| `crm_tagline` | `text` | Tagline del sistema (Nullable) |
| `logo_url` | `text` | Logo en Storage (Nullable) |
| `favicon_url` | `text` | Favicon en Storage (Nullable) |
| `seo_title` | `text` | Título SEO por defecto (Nullable) |
| `seo_description` | `text` | Meta description por defecto (Nullable) |
| `seo_keywords` | `text` | Meta keywords (Nullable) |
| `google_config` | `jsonb` | Config de Google (GA, Search Console, etc.). Default: `{}` (Nullable) |
| `ai_search_config` | `jsonb` | Config de búsqueda con IA. Default: `{}` (Nullable) |
| `updated_at` | `timestamptz` | Default: `now()` (Nullable) |

---

## 9. Diagrama de Relaciones

```
auth.users ──── (1:1) ──── profiles
auth.users ──── (1:N) ──── leads (assigned_to)
auth.users ──── (1:N) ──── notifications (user_id)

leads ──── (N:1) ──── categories
leads ──── (N:1) ──── providers
leads ──── (N:1) ──── locations (pickup_location_id)
leads ──── (N:1) ──── locations (return_location_id)
leads ──── (1:N) ──── quotes
leads ──── (1:N) ──── vouchers
leads ──── (1:N) ──── messages
leads ──── (1:N) ──── lead_notes
leads ──── (1:N) ──── automation_logs
leads ──── (1:N) ──── notifications

providers ──── (1:N) ──── provider_offices
locations ──── (1:N) ──── provider_offices
profiles  ──── (1:N) ──── lead_notes (agent_id)
```

---

## 10. Almacenamiento (Storage Buckets)

| Bucket | Uso | Acceso |
| :--- | :--- | :--- |
| `avatars` | Fotos de perfil de agentes y admins. Path: `avatars/{user_id}/{filename}` | Público lectura, restringido por UID para escritura |
| `chat_media` | Audios, imágenes y documentos de los chats de WhatsApp | Público lectura |
| `provider-logos` | Logotipos de las rentadoras aliadas | Público lectura |
| `vehicles` | Imágenes de flota por categorías | Público lectura |

---

## 11. Lógica de Cálculo y Negociación (Sistema de Triple Control)

### Fórmulas Base
- **Total Diario** = `Costo Vehículo (base_daily_cost)` + `Ganancia Go Easy (agreed_daily_price)`
- **Total Reserva** = `Total Diario` × `Días de Renta`
- **Depósito Stripe** = `Ganancia Go Easy (agreed_daily_price)` × `Días de Renta`

### Comportamiento en la Interfaz (Lead Detail)
Cuando el asesor entra en modo edición, el sistema ofrece tres campos interconectados:
1. **Costo Vehículo**: Editable. Al cambiarlo → el **Total Diario** se actualiza manteniendo la **Ganancia** fija.
2. **Ganancia Go Easy**: Editable. Al cambiarlo → el **Total Diario** se actualiza manteniendo el **Costo** fijo.
3. **Total Diario**: Editable. Al cambiarlo → el **Costo Vehículo** se recalcula manteniendo la **Ganancia** fija (para "price matching").

### Persistencia y Escalado
- **Tarifa locked-in**: Una vez guardado un total personalizado, el sistema calcula un rate diario implícito.
- **Cambio de Fechas**: El sistema mantiene el valor diario negociado en lugar de volver al precio por categoría.
- **Cobro de Depósito**: `generateQuoteForLead` prioriza `agreed_daily_price` para el depósito en Stripe.
- **Restablecer**: Un botón permite volver a los valores predeterminados de la tabla `categories`.

---

> **Nota técnica:** Todas las tablas incluyen `created_at`. Las tablas `leads` y `profiles` también incluyen `updated_at` para control de cambios. Los campos `nullable` no son requeridos al momento de inserción.