# Flujo del Pipeline de Ventas

Este documento describe en detalle el recorrido completo de un lead: desde su captura inicial hasta el cierre, incluyendo transiciones de estado, lógica de precios, documentos generados y automatizaciones disparadas en cada etapa.

---

## 1. Estados del Pipeline

El lead recorre los siguientes estados (definidos en el enum `lead_status`):

```
lead_nuevo → en_cotizacion → reserva_confirmada → voucher_enviado → cerrado_ganado
                                     │
                                     └────────────► cerrado_perdido (desde cualquier etapa)
```

* **`cerrado_ganado`** — venta exitosa.
* **`cerrado_perdido`** — venta caída; requiere `lost_reason`. Alcanzable desde cualquier etapa.
* `cerrado` (sin sufijo) es un estado **legacy** conservado solo por registros históricos.

> El orden lineal y los colores están en `src/lib/leads/transitions.ts` (`STAGE_ORDER`, `STATUS_CONFIG`, `LOST_STAGE`, `LOST_REASONS`). Ver [`sistema-diseno.md`](sistema-diseno.md#4-colores-del-pipeline-fuente-única-de-verdad).

Cada transición puede ser:
- **Automática**: Disparada por un webhook externo (Stripe, WhatsApp) o por el cron.
- **Manual**: El agente mueve la tarjeta en el Kanban o usa un botón en el detalle del lead.

---

## 2. Etapa 1: Lead Nuevo (`lead_nuevo`)

### Orígenes de captura

| Canal | Cómo llega | Ruta |
| :--- | :--- | :--- |
| Formulario web | Cliente llena `/cotizar` | Server Action `createLead` |
| WhatsApp directo | Cliente escribe al número WABA | Webhook `POST /api/webhooks/whatsapp` |
| Ingreso manual | Agente crea desde el Kanban | Server Action `createLead` |

### Deduplicación automática

Al crear un lead, el sistema verifica si ya existe un lead con el mismo número de teléfono y status `lead_nuevo`. Si existe, actualiza ese lead en lugar de crear uno nuevo.

```typescript
// src/app/api/leads/route.ts
const { data: existing } = await supabase
  .from('leads')
  .select('id')
  .eq('phone', phone)
  .eq('status', 'lead_nuevo')
  .single()

if (existing) {
  // Actualizar en lugar de crear
}
```

### Asignación Round Robin

Inmediatamente después de crear el lead (`assignLeadWithContact`):

1. Si el lead pertenece a un **contacto recurrente** con agente, hereda ese agente (sin Round Robin).
2. Si no, se consultan los agentes con `role = 'agente'` y `disabled = false`.
3. Se ordenan por `last_assigned_at ASC` (NULLS FIRST) — el que lleva más tiempo sin recibir un lead.
4. Se asigna el lead al primero y se actualiza `last_assigned_at = now()`.
5. Se propaga el agente al `contacts.assigned_to` y se crea una notificación in-app.

### Automatizaciones disparadas

- **WhatsApp al cliente**: Template `bienvenida_lead` con nombre del cliente y nombre del agente asignado.
- **Notificación in-app**: Al agente asignado: "¡Nuevo lead! [Nombre] está esperando respuesta."

### Datos capturados en el lead

```
first_name, last_name, phone, email
pickup_date, return_date
pickup_location_id, return_location_id
category_id (tipo de vehículo)
source (web | whatsapp)
utm_source, utm_medium, utm_campaign, utm_term, utm_content
```

---

## 3. Etapa 2: En Cotización (`en_cotizacion`)

### Quién activa esta transición

El agente, desde la vista de detalle del lead (`/dashboard/leads/[id]`), ajusta los precios y genera el link de pago de Stripe.

### Sistema de Triple Control de Precios

La UI expone tres campos editables con lógica dependiente:

| Campo | Columna en DB | Descripción |
| :--- | :--- | :--- |
| Costo Vehículo | `base_daily_cost` (de `categories`) | Costo que cobra el proveedor por día |
| Ganancia Go Easy | `agreed_daily_price` | Margen que retiene Go Easy por día |
| Total Diario | Calculado | Suma de los dos anteriores |

**Reglas de recálculo:**
- Si se edita **Costo**: `Total = Costo + Ganancia` (Ganancia fija)
- Si se edita **Ganancia**: `Total = Costo + Ganancia` (Costo fijo)
- Si se edita **Total**: `Costo = Total - Ganancia` (Ganancia fija)

**Fórmulas finales:**
```
Total Reserva = Total Diario × Días de Renta
Depósito Stripe = Ganancia Go Easy × Días de Renta
Días de Renta = (return_date - pickup_date) en días completos
```

> El cliente solo paga el **depósito** (ganancia de Go Easy). El costo del proveedor se paga por separado fuera de Stripe.

### Snapshot de cotización

Al generar el link de Stripe, el sistema crea un registro en la tabla `quotes` con un snapshot de los valores actuales:

```typescript
{
  lead_id: lead.id,
  stripe_link: paymentLink.url,
  total_amount: totalAmount,
  pickup_date: lead.pickup_date,
  return_date: lead.return_date,
  expires_at: // según configuración del sistema
}
```

### Validación de integridad (Mismatch)

Si el agente modifica precios o fechas **después** de generar la cotización sin regenerarla, la UI muestra una alerta de mismatch en la línea de tiempo del lead. Esto previene que el cliente pague un monto desactualizado.

### Landing page del cliente

El cliente recibe la URL `/q/[quote_id]` con:
- Detalle del vehículo y fechas
- Monto total y desglose
- Botón de pago con Stripe integrado

### Automatizaciones disparadas

- **WhatsApp al cliente**: Template `cotizacion_enviada` con nombre, fecha de llegada, ciudad y link de cotización.
- **Email al cliente**: Template HTML de la etapa `en_cotizacion` con propuesta detallada.

---

## 4. Etapa 3: Reserva Confirmada (`reserva_confirmada`)

### Quién activa esta transición

**Automática**: El webhook de Stripe en `POST /api/webhooks/stripe` al recibir el evento `checkout.session.completed`.

### Acciones del webhook

```typescript
// src/app/api/webhooks/stripe/route.ts
1. Verificar firma HMAC del payload
2. Extraer lead_id del metadata del Payment Link
3. Actualizar lead:
   - status → 'reserva_confirmada'
   - deposit_paid → true
   - stripe_payment_id → session.payment_intent
4. Triggear automation para 'reserva_confirmada'
```

### Cambios en la UI del cliente

La página `/q/[quote_id]` reacciona automáticamente:
- El botón de pago queda **deshabilitado**
- Aparece un banner superior verde: **"¡RESERVA PAGADA!"**
- Se muestra el número de transacción de Stripe

### Automatizaciones disparadas

- **WhatsApp al cliente**: Template `reserva_confirmada` con nombre, fecha y ciudad.
- **WhatsApp interno al agente**: "¡Felicidades! Tu cliente [Nombre] ha pagado $[Monto]. Ayúdanos generando el voucher."
- **Email al cliente**: Confirmación formal con recibo del depósito.
- **Notificación in-app**: Al agente asignado: "💰 ¡Pago Confirmado! [Nombre] ha pagado el depósito."

---

## 5. Etapa 4: Voucher Enviado (`voucher_enviado`)

### Quién activa esta transición

El agente, desde el detalle del lead, genera el voucher oficial. Esta acción:

1. Crea un registro en la tabla `vouchers`.
2. Genera un número de confirmación único con formato `GF-XXXXXX`.
3. Genera el documento PDF/HTML del voucher.
4. Sube el voucher a Supabase Storage.
5. Actualiza el status del lead a `voucher_enviado`.
6. Registra la URL del voucher en `voucher_url`.

### URL corta del voucher

El sistema usa el patrón `/v/[voucher_id]` como enlace corto. Esta ruta redirige automáticamente a `/voucher/[voucher_id]` donde está la vista completa del documento.

### Datos del voucher

| Campo | Descripción |
| :--- | :--- |
| `confirmation_number` | ID interno Go Easy: `GF-XXXXXX` |
| `provider_confirmation` | ID de reserva oficial de la rentadora (Hertz, Budget, etc.) |
| `voucher_url` | Link de descarga en Supabase Storage |

### Automatizaciones disparadas

- **WhatsApp al cliente**: Template `voucher_disponible` con nombre, lugar de pickup y enlace corto del voucher.
- **Email al cliente**: Asunto "Tu voucher de reserva - Go Easy Florida 📄" con botón de descarga directo.

---

## 6. Etapa 5: Cierre (`cerrado_ganado` / `cerrado_perdido`)

### Cerrado Ganado (`cerrado_ganado`)
El agente marca el lead como ganado cuando la reserva se concreta.
- **WhatsApp + Email al cliente**: agradecimiento/cierre (`gracias_feedback`).
- **Notificación in-app**: `lead_closed` 🏆.

### Cerrado Perdido (`cerrado_perdido`)
El agente marca el lead como perdido y selecciona un `lost_reason` (precio alto, eligió competencia, sin respuesta, canceló viaje, fechas no disponibles, no calificó, otro). Alcanzable desde cualquier etapa.
- **Notificación in-app**: `lead_closed` ❌.
- **No** envía WhatsApp/Email automáticos al cliente.

> Ambas transiciones quedan registradas en `lead_events` (auditoría) y disparan los canales habilitados en `automation_config`.

---

## 7. Diagrama de Flujo Completo

```
Cliente llena formulario / escribe por WA
           │
           ▼
    ┌──────────────┐
    │  LEAD NUEVO  │──► Round Robin asignación de agente
    │ (lead_nuevo) │──► WhatsApp: Bienvenida
    └──────┬───────┘
           │ Agente ajusta precios y genera Stripe link
           ▼
    ┌────────────────┐
    │ EN COTIZACIÓN  │──► Snapshot en tabla quotes
    │(en_cotizacion) │──► WhatsApp + Email: Link de cotización
    └──────┬─────────┘
           │ Cliente paga en /q/[id] → Stripe Webhook
           ▼
    ┌──────────────────────┐
    │ RESERVA CONFIRMADA   │──► Lead actualizado automáticamente
    │(reserva_confirmada)  │──► WhatsApp + Email: Confirmación
    └──────┬───────────────┘    Notificación in-app al agente
           │ Agente genera voucher oficial
           ▼
    ┌───────────────────┐
    │  VOUCHER ENVIADO  │──► Voucher en Storage
    │ (voucher_enviado) │──► WhatsApp + Email: Enlace del voucher
    └──────┬────────────┘
           │ Agente cierra el lead
           ▼
    ┌──────────────────┐        ┌───────────────────┐
    │ CERRADO GANADO   │   o    │ CERRADO PERDIDO   │
    │(cerrado_ganado)  │        │(cerrado_perdido)  │  (con lost_reason)
    │ WhatsApp+Email   │        │ solo notif. in-app│
    └──────────────────┘        └───────────────────┘

  En paralelo: el motor puede crear TAREAS de seguimiento (llamar, verificar
  voucher) según automation_rules → ver automatizaciones.md
```

---

## 8. Línea de Tiempo del Lead

Cada lead tiene una línea de tiempo (`Timeline`) visible en su vista de detalle que registra:

| Evento | Ícono | Descripción |
| :--- | :--- | :--- |
| Lead capturado | 📥 | Fecha y origen de la captura |
| Agente asignado | 👤 | Quién y cuándo fue asignado |
| Cotización generada | 📋 | Link directo "Ver Propuesta" |
| Alerta Mismatch | ⚠️ | Precios/fechas modificados sin regenerar cotización |
| Depósito recibido | 💰 | Monto pagado y fecha del pago |
| Voucher generado | 📄 | Número de confirmación GF-XXXXXX |
| Notas del agente | 💬 | Notas internas con autor y fecha |

---

## 9. Acciones Manuales del Agente en Cada Etapa

### Desde el Kanban (`/dashboard/leads`)

- Drag & drop de tarjetas entre columnas para cambiar el status.
- Filtros por agente, categoría, fecha.
- Vista rápida de información básica del lead en cada tarjeta.

### Desde el detalle del lead (`/dashboard/leads/[id]`)

| Acción | Etapa requerida | Descripción |
| :--- | :--- | :--- |
| Editar precios | Cualquiera | Modifica costo, ganancia, total diario |
| Generar cotización | `lead_nuevo` | Crea link de Stripe y mueve a `en_cotizacion` |
| Regenerar cotización | `en_cotizacion` | Actualiza snapshot y link de pago |
| Agregar nota | Cualquiera | Nota interna visible solo para el equipo |
| Generar voucher | `reserva_confirmada` | Crea voucher y mueve a `voucher_enviado` |
| Cerrar ganado | `voucher_enviado` | Finaliza el ciclo, mueve a `cerrado_ganado` |
| Marcar perdido | Cualquiera | Mueve a `cerrado_perdido` con `lost_reason` |
| Crear tarea | Cualquiera | Tarea de seguimiento (llamada, WhatsApp, etc.) |
| Enviar mensaje manual | Cualquiera | Mensaje libre por WhatsApp desde el chat inline |

---

## 10. Soft Delete de Leads

Los leads eliminados no se borran físicamente. Se usa la columna `deleted_at` (agregada en migración `20260501_soft_delete_leads.sql`).

- **Eliminar**: `UPDATE leads SET deleted_at = now() WHERE id = ?`
- **Restaurar**: `UPDATE leads SET deleted_at = NULL WHERE id = ?`
- **Consultas normales**: Siempre incluir `.is('deleted_at', null)` en el filtro para excluir eliminados.
