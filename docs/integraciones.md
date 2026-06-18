# Integraciones con Servicios Externos

Este documento describe en detalle cada servicio externo integrado en Go Easy CRM: cómo funciona, qué variables necesita, qué endpoints usa, y cómo se comporta ante errores.

---

## 1. WhatsApp Business API (Meta WABA)

### Descripción
La integración oficial con Meta para enviar mensajes aprobados (templates) a clientes. Es el canal principal de comunicación automática del motor de automatizaciones.

### Archivo principal
`src/utils/waba.ts`

### Variables de entorno necesarias
```
WABA_ID=...                     # WhatsApp Business Account ID
WABA_PHONE_NUMBER_ID=123456789012345
WABA_ACCESS_TOKEN=EAAG...
WABA_VERSION=v21.0
WABA_APP_SECRET=...             # valida firma del webhook (x-hub-signature-256)
WABA_VERIFY_TOKEN=...           # verificación GET del webhook
```

### Flujo de uso
1. El motor de automatización (`automation-engine.ts`) detecta un cambio de status en un lead.
2. Consulta la tabla `whatsapp_template_mappings` para encontrar el template WABA correspondiente a la etapa.
3. Resuelve las variables dinámicas (nombre del cliente, fecha, link, etc.) con los datos reales del lead.
4. Llama a la Graph API de Meta con el template y las variables.
5. Registra el resultado en `automation_logs`.

### Endpoint de la API
```
POST https://graph.facebook.com/{WABA_VERSION}/{WABA_PHONE_NUMBER_ID}/messages
Authorization: Bearer {WABA_ACCESS_TOKEN}
Content-Type: application/json
```

### Estructura del payload (template con variables)
```json
{
  "messaging_product": "whatsapp",
  "to": "15551234567",
  "type": "template",
  "template": {
    "name": "voucher_disponible",
    "language": { "code": "es_CO" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Juan" },
          { "type": "text", "text": "Aeropuerto de Miami" },
          { "type": "text", "text": "https://goeasy.com/v/abc123" }
        ]
      }
    ]
  }
}
```

### Webhook entrante (Meta → CRM)
El endpoint `POST /api/webhooks/whatsapp` recibe:
- Mensajes de texto o multimedia enviados por clientes
- Actualizaciones de estado de mensajes enviados (`delivered`, `read`, `failed`)
- Verificación GET inicial de Meta para activar el webhook

### Templates activos en el CRM

| Template | Etapa | Idioma |
| :--- | :--- | :--- |
| `bienvenida_lead` | `lead_nuevo` | `es` |
| `cotizacion_enviada` | `en_cotizacion` | `es` |
| `reserva_confirmada` | `reserva_confirmada` | `es` |
| `voucher_disponible` | `voucher_enviado` | `es_CO` |
| `gracias_feedback` | `cerrado_ganado` | `es` |

> Los templates deben estar aprobados previamente en Meta Business Suite antes de poder usarlos.

---

## 2. Evolution API (WhatsApp Alternativo)

### Descripción
Cliente alternativo de WhatsApp que permite enviar mensajes de texto libre (no solo templates aprobados). Útil para respuestas manuales del agente desde el chat inbox del CRM.

### Archivo principal
`src/utils/whatsapp.ts`

### Variables de entorno necesarias
```
WHATSAPP_EVOLUTION_URL=https://evolution.tudominio.com
WHATSAPP_EVOLUTION_KEY=tu-api-key-evolution
WHATSAPP_EVOLUTION_INSTANCE=goeasy
```

### Diferencia clave vs. WABA

| Característica | WABA (Meta oficial) | Evolution API |
| :--- | :--- | :--- |
| Templates aprobados | Sí, obligatorio | No requerido |
| Mensajes de texto libre | Solo en ventana de 24h | Siempre |
| Multimedia | Con restricciones de template | Sí, libre |
| Costo | Sin cargo por mensaje | Depende del hosting |
| Casos de uso en el CRM | Automatizaciones | Chat manual del agente |

### Webhook entrante (Evolution → CRM)
El mismo endpoint `POST /api/webhooks/whatsapp` maneja mensajes de ambas fuentes. La lógica interna distingue el origen y los almacena en la tabla `messages`.

---

## 3. Stripe — Pagos

### Descripción
Procesa el cobro del depósito de reserva. El flujo es: el agente genera un link de pago → el cliente paga → Stripe notifica al CRM → el lead avanza a `reserva_confirmada`.

### Archivo principal
`src/utils/stripe.ts`

### Variables de entorno necesarias
```
STRIPE_SECRET_KEY=sk_live_...      # sk_test_... en desarrollo
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Flujo completo del pago

```
Agente genera cotización en LeadDetail
       ↓
Crea Payment Link en Stripe via API
(amount = agreed_daily_price × días, en centavos)
       ↓
Guarda stripe_link en tabla quotes
       ↓
Envía link al cliente por WhatsApp/Email
       ↓
Cliente paga en la landing /q/[id]
       ↓
Stripe envía POST /api/webhooks/stripe
  con evento checkout.session.completed
       ↓
CRM actualiza lead:
  - status → reserva_confirmada
  - deposit_paid → true
  - stripe_payment_id → session.payment_intent
       ↓
Se dispara automatización de confirmación
```

### Verificación del webhook

El webhook de Stripe incluye una firma HMAC en el header `Stripe-Signature`. El CRM la verifica con `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` antes de procesar cualquier evento.

### Prevención de pagos duplicados

La página de cotización `/q/[id]` consulta el status del lead vinculado. Si ya es `reserva_confirmada`, deshabilita el botón de pago y muestra un banner "RESERVA PAGADA".

---

## 4. Zadarma — VoIP / Click-to-Call

### Descripción
Integración con el PBX en la nube de Zadarma para realizar llamadas directamente desde el CRM y recibir notificaciones de llamadas entrantes con sus grabaciones.

### Archivos principales
- `src/lib/zadarma.ts` — Cliente API de Zadarma
- `src/app/api/zadarma/` — Webhooks y endpoints de llamadas

### Variables de entorno necesarias
```
ZADARMA_USER_KEY=tu-user-key
ZADARMA_SECRET_KEY=tu-secret-key
ZADARMA_PBX_NUMBER=...           # número PBX para el widget WebRTC
```

> La firma HMAC del webhook se construye con `ZADARMA_SECRET_KEY` (ver `src/lib/zadarma.ts`). Endpoints WebRTC: `/api/zadarma/webrtc-key`; credencial SIP del agente en `profiles.zadarma_sip` / `zadarma_sip_password`.

### Configuración por agente

Cada agente debe tener su extensión PBX configurada en el campo `zadarma_sip` de la tabla `profiles` (Ej: `100`, `101`). Esto permite mapear llamadas entrantes al agente correcto.

### Endpoints del CRM

| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `/api/zadarma/click-to-call` | `POST` | Inicia una llamada saliente desde el CRM |
| `/api/zadarma/webhook` | `GET/POST` | Recibe eventos: llamada iniciada, contestada, finalizada, grabación lista |
| `/api/zadarma/calls` | `GET` | Lista el historial de llamadas de un lead |
| `/api/zadarma/webrtc-key` | `POST` | Credenciales WebRTC para el widget del agente |
| `/api/zadarma/test` | `GET` | Test de conexión |

### Eventos del webhook de Zadarma

| Evento | Descripción | Acción del CRM |
| :--- | :--- | :--- |
| `NOTIFY_START` | Llamada iniciada | Crea registro en `call_logs` con status `initiated` |
| `NOTIFY_ANSWER` | Llamada contestada | Actualiza `answered_at` y status `answered` |
| `NOTIFY_END` | Llamada terminada | Actualiza `ended_at`, `duration`, status `ended` |
| `NOTIFY_RECORD` | Grabación disponible | Actualiza `recording_url` en el registro |

---

## 5. Resend — Email Transaccional

### Descripción
Servicio de envío de emails transaccionales. Usado para confirmar cotizaciones, pagos y enviar vouchers por correo electrónico.

### Archivo principal
`src/utils/email.ts`

### Variables de entorno necesarias
```
RESEND_API_KEY=re_...
EMAIL_FROM=Goeasy Florida <reservas@tudominio.com>
```

### Templates de email

Los templates HTML se almacenan en la tabla `email_templates` (una fila por etapa del pipeline). El motor de automatización los recupera en tiempo de ejecución e inyecta variables dinámicas antes de enviar.

| Etapa | Asunto por defecto |
| :--- | :--- |
| `lead_nuevo` | "Recibimos tu solicitud - Go Easy Florida" |
| `en_cotizacion` | "Tu propuesta personalizada está lista" |
| `reserva_confirmada` | "¡Reserva confirmada! Detalles de tu vehículo" |
| `voucher_enviado` | "Tu voucher de reserva - Go Easy Florida" |
| `cerrado_ganado` | "¡Gracias por confiar en Go Easy Florida!" |

### Gestión de templates

Los templates se editan desde la UI en `/dashboard/settings/emails`. Un administrador puede modificar el asunto y el cuerpo HTML sin tocar el código.

---

## 6. Meta Conversions API (CAPI)

### Descripción
Envía eventos de conversión directamente al pixel de Facebook para mejorar el tracking de anuncios, especialmente cuando el adblocker o iOS bloquean el pixel del lado cliente.

### Archivo principal
`src/utils/meta-capi.ts`

### Variables de entorno necesarias
```
NEXT_PUBLIC_FB_PIXEL_ID=123456789
FB_ACCESS_TOKEN=...
FB_TEST_EVENT_CODE=...        # opcional — test events
```

### Eventos que se envían

| Evento | Etapa | Descripción |
| :--- | :--- | :--- |
| `Lead` | `lead_nuevo` | Captación de interés |
| `InitiateCheckout` | `en_cotizacion` | El cliente recibe el link de pago |
| `Purchase` | `reserva_confirmada` | Reserva pagada (valor = depósito) |
| `Schedule` | `voucher_enviado` | Voucher entregado |

> El PII (email, teléfono, nombre) se envía hasheado con SHA-256. Cada evento usa `eventID = {leadId}_{stage}` para deduplicar con el pixel del cliente. Si `NEXT_PUBLIC_FB_PIXEL_ID` no está definida, no se envían eventos.

---

## 7. Web Push Notifications

### Descripción
Notificaciones push del navegador para alertar a los agentes sobre eventos críticos en tiempo real (nuevo lead asignado, pago recibido, mensaje nuevo).

### Archivo principal
`src/utils/push-notifications.ts`

### Variables de entorno necesarias
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@goeasy.com
```

### Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

### Flujo de suscripción

1. El agente abre el CRM en el navegador.
2. El componente `PWAHead` solicita permiso para notificaciones.
3. Si el usuario acepta, el service worker crea una suscripción.
4. El CRM guarda la suscripción en la tabla `push_subscriptions` vía `POST /api/push/subscribe`.
5. Cuando ocurre un evento, el backend itera las suscripciones del usuario y envía la notificación.

### Endpoint de suscripción

```
POST /api/push/subscribe
Body: { subscription: PushSubscription, user_id: string }
```

> Las suscripciones inválidas (respuestas `410`/`404`) se eliminan automáticamente al enviar (`push-notifications.ts`).

---

## 8. n8n (Bus de Eventos Secundario)

### Descripción
n8n actúa como bus de eventos secundario. El motor interno de automatización es el ejecutor principal; n8n recibe una copia del evento para integraciones externas (grupos de WhatsApp de proveedores, etc.).

### Archivo principal
`src/utils/n8n.ts`

### Configuración
La URL base del webhook está **fijada en el código** (`https://n8nib.ideasbeta.com/webhook`), no se configura por variable de entorno. El evento se mapea a una ruta según la etapa:

| Etapa | Ruta del webhook |
| :--- | :--- |
| `lead_nuevo` | `nuevo-lead-whatsapp` |
| `reserva_confirmada` | `pago-recibido-whatsapp` |
| `voucher_enviado` | `confirmacion-proveedor-whatsapp` |

### Cuándo se activa

```typescript
// automation-engine.ts, tras la automatización principal (si el canal n8n está habilitado):
await sendLeadToN8n(leadId, event, payload)
```

Los workflows de n8n están en el directorio `n8n-workflows/` del repositorio.
