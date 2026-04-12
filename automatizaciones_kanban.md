# Automatizaciones del Pipeline de Leads (Go Easy CRM)

Este documento describe el funcionamiento del motor de automatización interno diseñado para gestionar la comunicación con los clientes de Go Easy Florida de forma automática según el estado del lead en el embudo de ventas.

## 🚀 Filosofía del Sistema
Las automatizaciones han sido migradas de n8n a un **motor interno (`automation-engine.ts`)** para mayor velocidad, confiabilidad y control. Cada vez que un lead cambia de etapa, el sistema dispara automáticamente mensajes personalizados a través de **WhatsApp Business API** y **Resend (Email)**.

---

## 📋 Resumen de Etapas y Automatizaciones

| Etapa | Gatillo (Trigger) | Comunicación WhatsApp | Comunicación Email |
| :--- | :--- | :--- | :--- |
| **Lead Nuevo** | Entrada por Webhook WA / Formulario | Bienvenida y asignación | Confirmación de contacto |
| **En Cotización** | Generación de cotización manual | Link de pago y detalles | Presupuesto detallado |
| **Cotización Modificada** | Detección de Mismatch (Cambio de precio) | Alerta Roja en Timeline | Advertencia de validación |
| **Reserva Confirmada**| Webhook de pago (Stripe) | Confirmación y próximas instrucciones | Recibo y confirmación |
| **Voucher Enviado** | Subida de voucher a la DB | Entrega de documento digital | Link de descarga de voucher |
| **Cerrado** | Cierre de alquiler por el agente | Agradecimiento y solicitud feedback | Seguimiento post-alquiler |

---

## 🔍 Detalle por Etapa

### 1. Lead Nuevo (`lead_nuevo`)
*   **Qué sucede**: Se activa inmediatamente cuando un cliente potencial escribe por primera vez por WhatsApp o se registra.
*   **WhatsApp**:
    *   **Plantilla**: `bienvenida_lead`
    *   **Contenido**: "Hola [Nombre], gracias por contactar a Go Easy Florida 🚗. Un asesor te contactará pronto."
*   **Email**:
    *   **Asunto**: "¡Bienvenido a Go Easy Florida!"
    *   **Propósito**: Dar una respuesta inmediata para mejorar la tasa de conversión.

### 2. En Cotización (`en_cotizacion`)
*   **Qué sucede**: Se activa cuando el agente genera el enlace de pago (Stripe). Sistema toma un **Snapshot** de los valores actuales.
*   **WhatsApp**:
    *   **Plantilla**: `cotizacion_enviada`
    *   **Variables**: `[Nombre]`, `[Link de Stripe]`
    *   **Contenido**: "Hola [Nombre], tu cotización está lista. Revisa y paga aquí: [Link]"
*   **Validación de Integridad**:
    *   Si el precio o fechas cambian sin regenerar la cotización, aparece una alerta en la línea de tiempo.
    *   **Botón de Acción**: Permite al vendedor regenerar la propuesta para asegurar que el link de Stripe coincida con lo acordado.

### 3. Reserva Confirmada (`reserva_confirmada`)
*   **Qué sucede**: Se dispara automáticamente cuando Stripe confirma que el pago de la reserva se ha completado.
*   **WhatsApp**:
    *   **Plantilla**: `pago_confirmado`
    *   **Variables**: `[Nombre]`, `[Fecha de recogida]`
    *   **Contenido**: "¡[Nombre], tu reserva está confirmada! 🎉 Entrega: [Fecha]. Recibirás tu voucher pronto."
*   **Email**:
    *   **Asunto**: "¡Reserva confirmada!"

### 4. Voucher Enviado (`voucher_enviado`)
*   **Qué sucede**: Se activa cuando el agente sube el PDF del voucher al lead en el panel de control.
*   **WhatsApp**:
    *   **Plantilla**: `voucher_disponible`
    *   **Variables**: `[Nombre]`, `[URL del Voucher]`
    *   **Contenido**: "[Nombre], tu voucher está listo. Descárgalo aquí: [URL]"
*   **Email**:
    *   **Asunto**: "Tu voucher de reserva"

### 5. Cerrado (`cerrado`)
*   **Qué sucede**: Cuando el alquiler finaliza y el agente marca el lead como cerrado.
*   **WhatsApp**:
    *   **Plantilla**: `gracias_feedback`
    *   **Variables**: `[Nombre]`
    *   **Contenido**: "Gracias [Nombre] por confiar en Go Easy Florida ⭐. ¡Esperamos verte pronto!"
*   **Email**:
    *   **Asunto**: "Gracias por tu confianza"

---

## 🛠️ Variables Dinámicas Soportadas
El sistema puede inyectar los siguientes datos reales en cualquier plantilla:

- `first_name`: Nombre del cliente.
- `last_name`: Apellido del cliente.
- `category_name`: Tipo de vehículo (ej. Midsize SUV).
- `pickup_date` / `pickup_time`: Fecha y hora de recogida (formateada en español).
- `pickup_location`: Lugar de entrega acordada.
- `total_amount`: Monto total del alquiler.
- `stripe_link`: Enlace directo al checkout de Stripe.
- `agent_name`: Nombre del asesor asignado.
- `voucher_url`: Enlace de descarga del documento.

---

## 📊 Monitoreo y Línea de Tiempo
Cada paso crítico del proceso alimenta la **Línea de Tiempo** del lead:
- **Lead Capturado**: Registro inicial.
- **Cotización Generada**: Incluye botón directo **"Ver Propuesta"**.
- **Alerta de Mismatch**: Aparece si hay cambios en precio/fechas sin regenerar.
- **Depósito Recibido**: Confirmación automática vía Stripe.

> [!TIP]
> Si una automatización falla, el sistema todavía realiza un "fallback" enviando la notificación a **n8n** como respaldo de seguridad.
