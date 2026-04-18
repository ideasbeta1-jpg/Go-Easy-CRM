# Automatizaciones del Pipeline de Leads (Go Easy CRM)

Este documento describe el funcionamiento del motor de automatización interno diseñado para gestionar la comunicación con los clientes de Go Easy Florida de forma automática según el estado del lead en el embudo de ventas.

## 🚀 Filosofía del Sistema
Las automatizaciones han sido migradas de n8n a un **motor interno (`automation-engine.ts`)** para mayor velocidad, confiabilidad y control. Cada vez que un lead cambia de etapa, el sistema dispara automáticamente:
1.  **WhatsApp Business API**: Mensajes directos al cliente.
2.  **Resend (Email)**: Confirmaciones formales.
3.  **Sistema de Notificaciones In-App**: Alertas persistentes en la "campanita" del CRM para que el vendedor nunca pierda un evento crítico (nuevos mensajes, pagos, asignaciones).

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
    *   **Contenido**: "¡Hola [Nombre_Cliente]! 🌴 Te saluda [Nombre_Asesor] de Goeasy Florida. Acabo de recibir tu solicitud y ya estoy reservando un espacio en mi agenda para ayudarte con tu renta. Antes de enviarte las mejores opciones, quiero confirmar que tengo todo bien: Veo que llegas el [Fecha_Llegada] a [Ciudad]. ¿Es correcto o hubo algún cambio en tus planes?"
*   **Email**:
    *   **Asunto**: "¡Bienvenido a Go Easy Florida!"
    *   **Propósito**: Dar una respuesta inmediata para mejorar la tasa de conversión.

### 2. En Cotización (`en_cotizacion`)
*   **Qué sucede**: Se activa cuando el agente genera el enlace de pago (Stripe). Sistema toma un **Snapshot** de los valores actuales.
*   **WhatsApp**:
    *   **Plantilla**: `cotizacion_enviada`
    *   **Variables**: `[Nombre]`, `[Fecha_Llegada]`, `[Ciudad]`, `[Enlace_Cotización]`
    *   **Contenido**: "¡Listo, [Nombre_Cliente]! Ya tengo tu propuesta personalizada. 🚗✨ Seleccioné las opciones que mejor se adaptan a tu llegada el [Fecha_Llegada] a [Ciudad], priorizando comodidad, espacio y, por supuesto, el mejor precio. Puedes revisar el detalle de los autos y confirmar tu reserva de una vez realizando el pago de forma segura aquí: 🔗 [Enlace_Cotización] ¿Tienes alguna duda con el proceso de pago?"
*   **Validación de Integridad**:
    *   Si el precio o fechas cambian sin regenerar la cotización, aparece una alerta en la línea de tiempo.
    *   **Botón de Acción**: Permite al vendedor regenerar la propuesta para asegurar que el link de Stripe coincida con lo acordado.

### 3. Reserva Confirmada (`reserva_confirmada`)
*   **Qué sucede**: Se dispara automáticamente cuando el webhook de Stripe (`checkout.session.completed`) confirma que el pago del depósito se ha completado.
*   **Cara al Cliente**: La URL de la cotización desactiva automáticamente el botón de Stripe (con el fin de evitar pagos duplicados) y mostrará un banner superior de *¡Reserva Asegurada!* en conjunto con una etiqueta fija de "RESERVA PAGADA".
*   **WhatsApp al Cliente**:
    *   **Plantilla**: `reserva_confirmada`
    *   **Variables**: `[Nombre]`, `[Fecha_Llegada]`, `[Ciudad]`
    *   **Contenido**: "¡Excelente noticia, [Nombre_Cliente]! 🥳 Acabamos de recibir tu pago correctamente. ¡Tu auto en Goeasy Florida ya está oficialmente reservado..."
*   **Email al Cliente**:
    *   **Asunto**: "¡Reserva confirmada!"
*   **Notificaciones al Vendedor**:
    *   **WhatsApp Interno**: Inmediatamente el sistema le envía un texto al agente asignado: *"🎉 ¡Felicidades! Tu cliente [Nombre] ha pagado el depósito de $[Monto]. Ahora ayúdanos gestionando el voucher."*
    *   **CRM In-App**: Trigger del evento `payment_confirmed` (💰 ¡Pago Confirmado!) que impacta en el Activity Feed de la plataforma.

### 4. Voucher Enviado (`voucher_enviado`)
*   **Qué sucede**: Se activa cuando el agente genera el voucher oficial desde el Lead Detail. Esto crea un registro en la tabla `vouchers` y genera un número de confirmación único (GF-XXXXXX). El agente también puede **Regenerar el Voucher** usando el botón dedicado si hubo cambio de proveedor o datos incorrectos — esto crea un nuevo registro y re-dispara todas las automatizaciones con el nuevo enlace.
*   **WhatsApp al Cliente**:
    *   **Plantilla**: `voucher_disponible`
    *   **Código de Idioma**: `es_CO` ⚠️ (obligatorio — la plantilla está aprobada bajo este código en Meta)
    *   **Variables**: `[Nombre]`, `[Pickup_Location]`, `[Enlace_Corto_Voucher]`
    *   **Contenido**: "¡Aquí tienes la llave virtual de tu viaje, [Nombre_Cliente]! 🔑🌴 Ya tengo listo tu voucher oficial de confirmación para tu renta en [Ciudad]. Puedes verlo y descargar la versión en PDF... 📄 [Enlace_Voucher]"
*   **Email al Cliente**:
    *   **Asunto**: "Tu voucher de reserva - Go Easy Florida 📄"
    *   **Contenido**: HTML profesional con botón de acceso directo al voucher (fallback automático si no hay plantilla en DB).
*   **In-App**: Notificación `voucher_sent` al agente asignado (📋 Voucher Enviado).
*   **Gestión de Enlaces**: El sistema utiliza el formato `/v/{id}` que actúa como un enlace recortado y redirecciona automáticamente a la vista detallada del voucher.
*   **Línea de Tiempo**: Se añade una nota automática marcando la fecha y hora exacta de la generación del documento.

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
- **Notificaciones In-App**: Registro persistente de cada evento para consulta rápida desde el header.

> [!NOTE]
> **n8n como fallback pasivo**: El motor interno (`automation-engine.ts`) es el ejecutor principal de TODAS las automatizaciones. n8n (`sendLeadToN8n`) se llama después como un bus de eventos secundario — solo actúa si la variable de entorno `N8N_WEBHOOK_URL` tiene un valor configurado. Si no está configurada, la llamada no hace nada. El motor nativo (WhatsApp WABA + Resend + In-App) siempre tiene prioridad.

> [!IMPORTANT]
> **Código de Idioma de Plantillas**: Las plantillas de WhatsApp deben usar el mismo código de idioma con el que fueron aprobadas en Meta Business Manager. Actualmente todas las plantillas activas usan `es_CO`. El motor usa `es_CO` por defecto. Si creas una nueva plantilla con un idioma diferente, configura el `language_code` en la tabla `whatsapp_template_mappings` de Supabase.
