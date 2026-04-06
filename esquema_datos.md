# 📊 Esquema de Base de Datos - Sistema de Reservas

Este documento detalla la estructura relacional, los tipos de datos y la lógica de estados para el CRM de renta de vehículos.

---

## 1. Extensiones y Tipos Personalizados (Enums)

Definen los estados del embudo de ventas y los roles de acceso al sistema.

| Tipo | Valores Permitidos |
| :--- | :--- |
| **`lead_status`** | `lead_nuevo`, `en_cotizacion`, `reserva_confirmada`, `voucher_enviado`, `cerrado` |
| **`user_role`** | `admin`, `agente` |

---

## 2. Tablas Maestras (Catálogos)

Estas tablas alimentan los selectores del CRM y del formulario público de reservación.

### **Categorías de Vehículos (`categories`)**
Define la flota disponible y sus precios base.
* **`id`**: `UUID` (PK)
* **`name`**: `TEXT` (Ej: Económico, SUV, Minivan)
* **`daily_price`**: `DECIMAL(10, 2)` (Precio de venta público / sugerido)
* **`base_daily_cost`**: `DECIMAL(10, 2)` (Costo real dictado por el proveedor)
* **`image_url`**: `TEXT` (URL de imagen en Storage)
* **`description`**: `TEXT`

### **Proveedores (`providers`)**
Rentadoras aliadas para la gestión de flota externa.
* **`id`**: `UUID` (PK)
* **`name`**: `TEXT`
* **`contact_name`**: `TEXT`
* **`email`**: `TEXT`
* **`whatsapp_group_id`**: `TEXT` (Integración con n8n / Evolution API)

---

## 3. Tabla Principal: Gestión de Leads

Centraliza toda la información del cliente y el ciclo de vida de la reserva.

### **`leads`**
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único |
| `first_name` | TEXT | Nombre del cliente |
| `last_name` | TEXT | Apellido del cliente |
| `phone` | TEXT | Teléfono de contacto |
| `email` | TEXT | Correo electrónico |
| `pickup_date` | TIMESTAMPTZ | Fecha/Hora entrega |
| `return_date` | TIMESTAMPTZ | Fecha/Hora devolución |
| `pickup_location` | TEXT | Lugar de entrega |
| `return_location` | TEXT | Lugar de devolución |
| `category_id` | UUID (FK) | Relación con `categories` |
| `status` | lead_status | Estado actual del proceso |
| `assigned_to` | UUID (FK) | Relación con `auth.users` |
| `provider_id` | UUID (FK) | Proveedor asignado al confirmar |
| `rate_plan` | TEXT | Tarifa seleccionada ('base' o 'premium') |
| `agreed_daily_price` | DECIMAL | Tarifa por día negociada/fija para este lead |
| `total_amount` | DECIMAL | Monto total de la renta |
| `deposit_paid` | BOOLEAN | Indica si el depósito fue abonado |
| `stripe_payment_id`| TEXT | ID de transacción de Stripe |
| `notes` | TEXT | Notas internas (solo agentes) |

---

## 4. Documentación y Salidas

Tablas para el manejo de archivos dinámicos y confirmaciones.

### **Cotizaciones (`quotes`)**
Historial de presupuestos enviados al cliente.
* **`lead_id`**: Relación con el lead (Borrado en cascada).
* **`stripe_link`**: Link de pago dinámico.
* **`pdf_url`**: Enlace a la landing o PDF de cotización.
* **`expires_at`**: Fecha de vencimiento de la oferta.

### **Vouchers (`vouchers`)**
Documentación final una vez cerrada la venta.
* **`confirmation_number`**: ID interno (Formato: `GEF-YYYY-XXXXXX`).
* **`provider_confirmation`**: ID oficial de la rentadora final.
* **`voucher_url`**: Link al PDF alojado en Supabase Storage.

### **Mensajes / Chats (`messages`)**
Historial de interacción por WhatsApp / Evolution API.
* **`id`**: `UUID` (PK)
* **`lead_id`**: `UUID` (FK -> `leads`)
* **`content`**: `TEXT` (Contenido del mensaje)
* **`direction`**: `TEXT` (`inbound` / `outbound`)
* **`created_at`**: `TIMESTAMPTZ` (Fecha de envío/recepción)

---

> **Nota técnica:** Todas las tablas incluyen campos de auditoría `created_at` y, en el caso de leads, `updated_at` para control de cambios.