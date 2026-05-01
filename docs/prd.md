# 📋 Product Requirements Document (PRD)

**Go Easy Florida**  
**CRM de Ventas — Especializado en Renta de Autos**

| Información | Detalle |
| :--- | :--- |
| **Versión** | 1.0 |
| **Fecha** | Marzo 2026 |
| **Estado** | Definición para Desarrollo |

---

## 1. Resumen Ejecutivo
**Go Easy Florida** requiere una solución tecnológica a medida para centralizar su proceso de ventas. El proyecto consiste en el desarrollo de un **CRM especializado** que automatice:
* Captación de leads.
* Generación de cotizaciones interactivas.
* Procesamiento de pagos (Stripe).
* Coordinación con proveedores mediante **Evolution API** (WhatsApp) y correo electrónico.

---

## 2. Objetivos del Producto
1. **Automatización:** Eliminar tiempos de espera con mensajes de bienvenida instantáneos.
2. **Conversión:** Implementar *landings* dinámicas de cotización con pago en un clic.
3. **Eficiencia Operativa:** Sustituir intermediarios costosos por infraestructura propia (Evolution API).
4. **Sincronización:** Automatizar la entrega de vouchers y notificaciones a partners.

---

## 3. Usuarios del Sistema
* **Administrador:** Gestión de flota, precios, agentes y reportes.
* **Vendedor (Agente):** Gestión del pipeline, ajustes manuales y asignación de proveedores.
* **Cliente:** Usuario final que cotiza, recibe la oferta y paga el depósito.
* **Proveedor:** Rentadora aliada que recibe la confirmación y el voucher.

---

## 4. Flujo del Negocio (Pipeline Kanban)
1. **Lead Nuevo (Auto):** Captura de formulario + WhatsApp de bienvenida.
2. **En Cotización:** Agente define precio/descuentos y envía link de landing.
3. **Reserva Confirmada (Auto):** Activado por Webhook de Stripe tras el pago.
4. **Voucher Enviado:** Generación de documento y cierre de notificaciones.

---

## 5. Especificaciones del Módulo

### 5.1. Formulario de Captura
* **Campos:** Nombre, Apellido, WhatsApp, Email, Fechas/Horas, Lugares de recogida/devolución.
* **Selector:** Galería visual de categorías de vehículos.
* **Cálculo:** Proyección inicial basada en tarifa diaria.

### 5.2. Inventario y Precios
* **Catálogo:** Categorías (Económico, SUV, Minivan) con imagen y descripción.
* **Lógica de Costos:**
  $$Total = (Días \times Tarifa) + Taxes - Descuento$$

### 5.3. Cotizaciones Dinámicas e Interactivas
* **Landing Pages Únicas:** En lugar de PDFs, cada cliente recibe una URL personalizada.
* **Pasarela:** Botón de pago integrado con **Stripe** para depósitos parciales.
* **Vigencia:** Los enlaces de pago caducan según la configuración del admin.

### 5.4. Proveedores y Vouchers
* **Directorio:** Base de datos con ID de grupos de WhatsApp para logística.
* **Voucher PDF:** Documento automático con ID de reserva, datos del proveedor e instrucciones.

---

## 6. Automatizaciones (Matriz de Notificaciones)

| Disparador (Trigger) | Acción | Canal |
| :--- | :--- | :--- |
| Envío de formulario | Mensaje de bienvenida | WhatsApp (Evolution API) |
| Generación de cotización | Envío de link personalizado | WhatsApp + Email |
| Pago detectado (Stripe) | Notificación push al vendedor | Sistema CRM |
| Emisión de Voucher | Confirmación a cliente y grupo | WhatsApp + Email |

---

## 7. Stack Tecnológico
* **Frontend/Backend:** Next.js + Tailwind CSS.
* **Base de Datos:** Supabase (PostgreSQL) + Auth.
* **Orquestación/Fallback:** n8n (Self-hosted) para flujos adicionales y webhooks secundarios.
* **Mensajería:** Evolution API / WhatsApp Business API.
* **Pagos:** Stripe API.
