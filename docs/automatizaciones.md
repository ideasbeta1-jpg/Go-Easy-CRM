# 🤖 Automatizaciones y Notificaciones

> Actualizado `2026-06-17` · Motor interno `automation-engine.ts` + scheduler + cron.

Este documento describe el motor de automatización del CRM: cómo se disparan las comunicaciones con el cliente según el estado del lead, cómo se programan acciones diferidas, las reglas configurables, las tareas con seguimiento y la asignación de leads.

---

## 🚀 Arquitectura General

Las automatizaciones corren en un **motor interno** (sin depender de n8n). Hay tres piezas:

| Pieza | Archivo | Rol |
| :--- | :--- | :--- |
| **Motor de etapa** | `src/utils/automation-engine.ts` | Al cambiar un lead de etapa, dispara los 6 canales habilitados (síncrono). |
| **Programador (scheduler)** | `src/utils/automation-scheduler.ts` | Lee `automation_rules` y encola tareas o `pending_actions` diferidas. |
| **Cron** | `src/app/api/cron/process-actions/route.ts` | Ejecuta `pending_actions` vencidas y reglas de inactividad. |

```
Cambio de etapa del lead
        │
        ├──> executeStageAutomation(leadId, stage)   [INMEDIATO]
        │      ├─ WhatsApp (WABA)         ── automation_config.whatsapp
        │      ├─ Email (Resend)          ── automation_config.email
        │      ├─ n8n webhook             ── automation_config.n8n
        │      ├─ WhatsApp al agente      ── automation_config.agent_whatsapp
        │      ├─ Notificación in-app     ── automation_config.in_app
        │      └─ Meta CAPI (Conversions) ── automation_config.meta_capi
        │      └─ logAutomation() → automation_logs (+ system_logs si falla)
        │
        └──> scheduleRulesForStage(stage)            [PROGRAMA FUTURO]
               ├─ action_type = create_task  → crea tarea ya (tabla tasks)
               └─ otra acción                → encola en pending_actions (execute_at = now + delay)

[Cada día 09:00 UTC] /api/cron/process-actions
        ├─ Ejecuta pending_actions con execute_at <= now()
        └─ Evalúa reglas de inactividad
```

---

## 📋 Canales por Etapa (`automation_config`)

La tabla `automation_config` (PK `stage` + `channel`) habilita/deshabilita cada canal por etapa. Se gestiona desde **Automatizaciones → Control de Canales**. Si una fila no existe, el canal se asume **habilitado**.

| Etapa | whatsapp | email | in_app | n8n | meta_capi | agent_whatsapp |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `lead_nuevo` | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `en_cotizacion` | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `reserva_confirmada` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `voucher_enviado` | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `cerrado_ganado` | ✅ | ✅ | ✅ | ✅ | — | — |
| `cerrado_perdido` | — | — | ✅ | ✅ | — | — |

---

## 🔍 Detalle por Etapa

### 1. Lead Nuevo (`lead_nuevo`)
* **Gatillo:** entrada por webhook de WhatsApp, formulario público (`/api/leads`) o creación manual.
* **Acciones:** asignación Round Robin → WhatsApp de bienvenida + Email de contacto + notificación in-app a los agentes + evento Meta CAPI (`Lead`) + webhook n8n `nuevo-lead-whatsapp`.
* **WhatsApp — parámetros:** `[nombre_cliente, nombre_agente, fecha_recogida, ubicación_recogida]`.

### 2. En Cotización (`en_cotizacion`)
* **Gatillo:** el agente genera el enlace de pago de Stripe (snapshot en `quotes`).
* **Acciones:** WhatsApp con link de cotización + Email con presupuesto + Meta CAPI `InitiateCheckout`.
* **WhatsApp — parámetros:** `[nombre, fecha, ciudad, url_cotización]`.
* **Validación de integridad:** si el precio o las fechas cambian sin regenerar, la cotización anterior queda obsoleta y la línea de tiempo muestra una alerta roja "Precio Modificado sin Regenerar".

### 3. Reserva Confirmada (`reserva_confirmada`)
* **Gatillo:** webhook de Stripe (`checkout.session.completed`).
* **Acciones:** WhatsApp de confirmación al cliente + Email recibo + **WhatsApp privado al agente** (`agent_whatsapp`) + notificación in-app (`payment_confirmed` 💰) + Meta CAPI `Purchase` (valor = depósito) + n8n `pago-recibido-whatsapp`.
* **Auto-voucher:** si el lead ya tiene `provider_id` + `draft_provider_confirmation`, el webhook genera el voucher automáticamente y avanza a `voucher_enviado`.
* **Cara al cliente:** la cotización en vivo desactiva el botón de pago y muestra "RESERVA ASEGURADA".
* **Auditoría:** registra `PAYMENT_CONFIRMED` en `lead_events` y un evento `payment` en `system_logs`.

### 4. Voucher Enviado (`voucher_enviado`)
* **Gatillo:** generación del voucher (manual o auto). Crea registro en `vouchers` con número `GF-XXXXXX`.
* **Acciones:** WhatsApp con enlace corto del voucher + Email con botón de descarga + Meta CAPI `Schedule`.
* **WhatsApp — parámetros:** `[nombre, pickup_location, enlace_voucher]` · idioma `es_CO` ⚠️ obligatorio.
* **Enrutamiento:** `/v/{id}` redirecciona a `/voucher/[id]`.

### 5. Cerrado Ganado (`cerrado_ganado`)
* **Gatillo:** el agente marca el lead como ganado.
* **Acciones:** WhatsApp + Email de agradecimiento/cierre + notificación in-app (`lead_closed` 🏆).

### 6. Cerrado Perdido (`cerrado_perdido`)
* **Gatillo:** el agente marca el lead como perdido y elige un `lost_reason`.
* **Acciones:** solo notificación in-app (`lead_closed` ❌) + n8n. **No** envía WhatsApp/Email automáticos al cliente.

---

## ⏱️ Reglas Configurables (`automation_rules`)

Las reglas se gestionan en **Automatizaciones → Reglas** (`RulesPanel`). Cada regla es **disparador → acción**.

### Tipos de disparador (`trigger_type`)

| Tipo | Cuándo dispara | Campos relevantes |
| :--- | :--- | :--- |
| `stage_delay` | X horas después de entrar a una etapa | `trigger_stage`, `trigger_delay_hours` |
| `date_field` | X horas antes/después de una fecha del lead | `trigger_date_field` (`pickup_date`/`return_date`), `trigger_date_offset_hours` (def. `-24`) |
| `inactivity` | El lead lleva X horas sin moverse de una etapa | `trigger_stage`, `trigger_delay_hours` (evaluado por el cron) |

### Tipos de acción (`action_type`)

| Acción | Qué hace | Campos |
| :--- | :--- | :--- |
| `whatsapp_template` | Envía plantilla WABA aprobada | `action_template` |
| `whatsapp_text` | Envía texto libre con `{{variables}}` | `action_message` |
| `change_stage` | Mueve el lead a otra etapa | `action_stage` |
| `notify_agent` | Notifica al agente asignado | `action_message` |
| `create_task` | Crea una tarea con follow-ups | `task_payload` (jsonb) |

### Programación

* **`stage_delay` + `create_task`** → la tarea se crea **de inmediato** (no espera al cron), con `due_date = now + due_hours` y deduplicación contra tareas pendientes de la misma regla.
* **`stage_delay` + otra acción** → se encola en `pending_actions` con `execute_at = now + trigger_delay_hours`.
* **`date_field`** → al crear/actualizar el lead, se encola con `execute_at = fecha_base + trigger_date_offset_hours` (deduplicado por regla+lead).
* **`inactivity`** → no se pre-encola; el cron busca leads estancados en cada corrida.

### Reglas activas de ejemplo (seed actual)

| Regla | Disparador | Acción |
| :--- | :--- | :--- |
| **Llamar al lead en cotización** | `stage_delay` · `en_cotizacion` · +1h | `create_task` (llamada, prioridad alta). Follow-ups: positivo → tarea +48h; negativo → WhatsApp +4h; sin respuesta → reintento +4h |
| **Confirmar datos reserva confirmada** | `stage_delay` · `reserva_confirmada` · +0h | `create_task` (verificar datos conductor/fechas). Follow-ups: positivo → notificar agente; sin respuesta → tarea WhatsApp +24h |
| **Verificar recepción del voucher** | `stage_delay` · `voucher_enviado` · +2h | `create_task` (confirmar voucher recibido). Follow-ups: positivo → notificar agente; sin respuesta → WhatsApp +6h |

---

## ✅ Tareas y Seguimiento (Follow-up)

Las tareas (`tasks`) pueden ser **manuales** o **generadas por reglas** (`source = 'automation'`). Cuando un agente completa una tarea, registra un **resultado** (`outcome`) y el sistema dispara automáticamente la acción configurada en `follow_up_rules` para ese resultado.

### Resultados posibles

| Outcome | Significado |
| :--- | :--- |
| `positive` | El cliente respondió favorablemente |
| `negative` | El cliente respondió, pero negativamente |
| `no_answer` | No contestó / sin respuesta |

### Acciones de follow-up (`follow_up_rules[outcome].action`)

| Acción | Comportamiento |
| :--- | :--- |
| `create_task` | Crea nueva tarea. Si `delay_hours = 0` → inmediata; si `> 0` → encola en `pending_actions`. Soporta anidar más `follow_up_rules`. |
| `whatsapp_template` | Encola envío de plantilla WABA |
| `whatsapp_text` | Encola texto libre interpolado |
| `notify_agent` | Encola notificación al agente |

### Flujo completo

```
Regla crea Tarea (con follow_up_rules)
        │
Agente abre TaskOutcomeModal y la completa
        │
completeTask(taskId, outcome, notes)
        ├─ tasks.status = 'completed', outcome, outcome_notes, completed_at/by
        └─ scheduleFollowUp(task, follow_up_rules[outcome])
                ├─ delay_hours = 0 → ejecuta ya
                └─ delay_hours > 0 → pending_actions (execute_at = now + delay)
                                          │
                          [cron] /api/cron/process-actions ejecuta al vencer
```

Server actions relevantes: `getMyTasks`, `getTasksForLead`, `createTask`, `completeTask`, `updateTask`, `cancelTask`, `createTaskAdmin` (`src/app/utils/actions/tasks.ts`).

---

## 🗓️ Procesamiento Diferido (Cron)

### `/api/cron/process-actions`
* **Programación:** Vercel Cron — `0 9 * * *` (09:00 UTC diario, definido en `vercel.json`). Puede invocarse con mayor frecuencia desde un scheduler externo.
* **Autenticación:** header `Authorization: Bearer ${CRON_SECRET}`.
* **Hace dos cosas:**
  1. **Acciones pendientes:** `SELECT … FROM pending_actions WHERE status='pending' AND execute_at <= now()` (lote de 50). Marca `processing` → ejecuta → `done` / `failed`.
  2. **Reglas de inactividad:** busca leads en `status = trigger_stage` sin cambios desde `now - trigger_delay_hours` (deduplicado: no repite la misma acción en 24h).
* **Dispatcher `executeAction()`** soporta: `whatsapp_template`, `whatsapp_text`, `change_stage`, `notify_agent`, `create_task`. Todas registran en `messages` y `automation_logs`.

### `/api/cron/daily-report`
* **Propósito:** reporte diario de ventas (leads creados + pagos recibidos + monto recaudado) enviado por WhatsApp.
* **Corte:** 08:00 p.m. Colombia (01:00 UTC), ventana de 24h.
* **Autenticación:** `CRON_SECRET`.
* **Nota:** no está en `vercel.json`; debe programarse con un scheduler externo (cron-job.org, etc.) o añadirse a Vercel Cron.

---

## 🧮 Asignación Round Robin

Archivo `src/utils/assignment.ts`.

1. **`assignLeadToAgent(leadId)`** — round robin puro: selecciona el agente con `role = 'agente'`, `disabled = false` y `last_assigned_at` más antiguo (NULLS FIRST). Actualiza `leads.assigned_to` y `profiles.last_assigned_at = now()`.
2. **`assignLeadWithContact(leadId)`** — round robin con herencia:
   * Si el **contacto ya tiene agente** (cliente recurrente) → hereda ese agente (sin round robin), validando que no esté `disabled`.
   * Si el **contacto es nuevo** → ejecuta round robin y propaga el agente al `contacts.assigned_to`.
3. **Notificación:** en ambos casos `broadcastNotification()` con `type: 'lead_assigned'` 👤.

Índice de soporte: `idx_profiles_assignment` (parcial sobre agentes activos asignables).

---

## 🛠️ Variables Dinámicas Soportadas

El motor (`resolveLeadField()` / `interpolateMessage()`) inyecta estos campos en plantillas y textos (`{{campo}}`):

`first_name`, `last_name`, `category_name`, `pickup_date`, `pickup_time`, `return_date`, `return_time`, `pickup_location`, `return_location`, `agreed_daily_price`, `total_amount`, `deposit_amount`, `stripe_link`, `quote_url`, `voucher_url`, `provider_confirmation`, `agent_name`, `agent_phone`, `voucher_number`.

---

## 📊 Monitoreo y Auditoría

| Tabla | Para qué |
| :--- | :--- |
| `automation_logs` | Un registro por canal disparado (sent/failed/skipped). Panel **Automatizaciones → Fallos** permite reintentar. |
| `system_logs` | Solo errores/eventos de integraciones. Panel **Logs del Sistema** con semáforo de salud por canal. |
| `lead_events` | Auditoría inmutable del lead (cambios de etapa, pagos, reasignaciones). Alimenta la Línea de Tiempo. |
| `pending_actions` | Cola visible en **Automatizaciones → Cola de Acciones** (próximas + historial, con cancelación). |

---

## 🔌 Integraciones de Canal (utils)

| Canal | Archivo | Funciones clave |
| :--- | :--- | :--- |
| WhatsApp (WABA) | `src/utils/waba.ts` | `sendTemplateMessageWithError`, `sendWABATextMessage`, `sendWABAMediaMessage`, `getTemplates`, `createTemplate`, `downloadWABAMedia` |
| WhatsApp (Evolution) | `src/utils/whatsapp.ts` | Canal alternativo de envío |
| Email | `src/utils/email.ts` | `sendEmail`, `getStageEmailTemplate` (Resend) |
| Meta CAPI | `src/utils/meta-capi.ts` | `sendMetaEvent` (hash SHA-256 de PII, `eventID` dedup) |
| n8n | `src/utils/n8n.ts` | `sendLeadToN8n` (bus de eventos secundario) |
| Push web | `src/utils/push-notifications.ts` | `sendPushToUser`, `sendPushToUsers` (VAPID) |
| Pagos | `src/utils/stripe.ts` | cliente Stripe |
| Telefonía | `src/lib/zadarma.ts` | firma HMAC, webhook, click-to-call |
| Bitácora | `src/utils/system-log.ts` | `logSystemEvent` (no bloqueante) |

> **n8n como bus secundario:** el motor interno es el ejecutor principal. `sendLeadToN8n` se llama después como bus de eventos para integraciones externas.
