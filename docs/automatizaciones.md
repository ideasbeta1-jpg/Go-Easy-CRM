# 🤖 Automatizaciones y Notificaciones

Este documento describe el funcionamiento del motor de automatización interno diseñado para gestionar la comunicación con los clientes de Go Easy Florida de forma automática según el estado del lead en el embudo de ventas.

## 🚀 Filosofía del Sistema
Las automatizaciones han sido migradas de n8n a un **motor interno (`automation-engine.ts`)** para mayor velocidad, confiabilidad y control. Cada vez que un lead cambia de etapa, el sistema dispara automáticamente:
1. **WhatsApp Business API**: Mensajes directos al cliente.
2. **Resend (Email)**: Confirmaciones formales.
3. **Sistema de Notificaciones In-App**: Alertas persistentes en la "campanita" del CRM para que el vendedor nunca pierda un evento crítico (nuevos mensajes, pagos, asignaciones).

---

## 📋 Resumen de Etapas y Automatizaciones

| Etapa | Gatillo (Trigger) | Comunicación WhatsApp | Comunicación Email |
| :--- | :--- | :--- | :--- |
| **Lead Nuevo** | Entrada por Webhook WA / Formulario | Bienvenida y asignación | Confirmación de contacto |
| **En Cotización** | Generación de cotización manual | Link de pago y detalles | Presupuesto detallado |
| **Cotización Modificada**| Detección de Mismatch | Alerta Roja en Timeline | Advertencia de validación |
| **Reserva Confirmada**| Webhook de pago (Stripe) | Confirmación e instrucciones | Recibo y confirmación |
| **Voucher Enviado** | Subida de voucher a la DB | Entrega de documento digital| Link de descarga del voucher |
| **Cerrado** | Cierre de alquiler por el agente | Agradecimiento y feedback | Seguimiento post-alquiler |

---

## 🔍 Detalle por Etapa

### 1. Lead Nuevo (`lead_nuevo`)
* **Qué sucede**: Se activa inmediatamente cuando un cliente escribe por primera vez por WhatsApp o se registra.
* **WhatsApp**:
  * **Plantilla**: `bienvenida_lead`
  * **Contenido**: "¡Hola [Nombre_Cliente]! 🌴 Te saluda [Nombre_Asesor] de Goeasy Florida. Acabo de recibir tu solicitud y ya estoy reservando un espacio en mi agenda para ayudarte con tu renta. Antes de enviarte las mejores opciones, quiero confirmar que tengo todo bien..."

### 2. En Cotización (`en_cotizacion`)
* **Qué sucede**: Se activa cuando el agente genera el enlace de pago de Stripe. Sistema toma un **Snapshot** de los valores actuales.
* **WhatsApp**:
  * **Plantilla**: `cotizacion_enviada`
  * **Variables**: `[Nombre]`, `[Fecha_Llegada]`, `[Ciudad]`, `[Enlace_Cotización]`
  * **Contenido**: "¡Listo, [Nombre_Cliente]! Ya tengo tu propuesta personalizada. 🚗✨ Seleccioné las opciones que mejor se adaptan a tu llegada el [Fecha_Llegada] a [Ciudad], priorizando comodidad, espacio y, por supuesto, el mejor precio..."
* **Validación de Integridad**:
  * Si el precio o fechas cambian sin regenerar la cotización, aparece una alerta en la línea de tiempo.

### 3. Reserva Confirmada (`reserva_confirmada`)
* **Qué sucede**: Se dispara automáticamente cuando el webhook de Stripe confirma que el pago se ha completado.
* **Cara al Cliente**: La URL de la cotización desactiva automáticamente el botón de Stripe (para evitar pagos duplicados) y mostrará un banner superior de *¡Reserva Asegurada!*.
* **WhatsApp al Cliente**:
  * **Plantilla**: `reserva_confirmada`
  * **Variables**: `[Nombre]`, `[Fecha_Llegada]`, `[Ciudad]`
* **Notificaciones al Vendedor**:
  * **WhatsApp Interno**: *"🎉 ¡Felicidades! Tu cliente [Nombre] ha pagado el depósito de $[Monto]. Ahora ayúdanos gestionando el voucher."*
  * **CRM In-App**: Trigger del evento `payment_confirmed` (💰 ¡Pago Confirmado!).

### 4. Voucher Enviado (`voucher_enviado`)
* **Qué sucede**: Se activa cuando el agente genera el voucher oficial desde el Lead Detail. Esto crea un registro en la tabla `vouchers` y genera un número de confirmación único (GF-XXXXXX).
* **WhatsApp al Cliente**:
  * **Plantilla**: `voucher_disponible`
  * **Código de Idioma**: `es_CO` ⚠️ (obligatorio)
  * **Variables**: `[Nombre]`, `[Pickup_Location]`, `[Enlace_Corto_Voucher]`
* **Email al Cliente**:
  * **Asunto**: "Tu voucher de reserva - Go Easy Florida 📄"
  * **Contenido**: HTML profesional con botón de acceso directo al voucher.
* **Enrutamiento**: El sistema utiliza el formato `/v/{id}` que actúa como un enlace recortado y redirecciona automáticamente a la vista detallada del voucher.

### 5. Cerrado (`cerrado`)
* **Qué sucede**: Cuando el alquiler finaliza y el agente marca el lead como cerrado.
* **WhatsApp**:
  * **Plantilla**: `gracias_feedback`
  * **Variables**: `[Nombre]`

---

## 🛠️ Variables Dinámicas Soportadas
El sistema puede inyectar los siguientes datos reales en cualquier plantilla:

* `first_name`: Nombre del cliente.
* `last_name`: Apellido del cliente.
* `category_name`: Tipo de vehículo.
* `pickup_date` / `pickup_time`: Fecha y hora de recogida.
* `pickup_location`: Lugar de entrega acordada.
* `total_amount`: Monto total del alquiler.
* `stripe_link`: Enlace directo al checkout de Stripe.
* `agent_name`: Nombre del asesor asignado.
* `voucher_url`: Enlace de descarga del documento.

---

## 📊 Monitoreo y Línea de Tiempo
Cada paso crítico del proceso alimenta la **Línea de Tiempo** del lead:
* **Lead Capturado**: Registro inicial.
* **Cotización Generada**: Incluye botón directo **"Ver Propuesta"**.
* **Alerta de Mismatch**: Aparece si hay cambios en precio/fechas sin regenerar.
* **Depósito Recibido**: Confirmación automática vía Stripe.
* **Notificaciones In-App**: Registro persistente de cada evento para consulta rápida.

> **n8n como fallback pasivo**: El motor interno (`automation-engine.ts`) es el ejecutor principal de TODAS las automatizaciones. n8n (`sendLeadToN8n`) se llama después como un bus de eventos secundario — solo actúa si la variable de entorno `N8N_WEBHOOK_URL` tiene un valor configurado.
