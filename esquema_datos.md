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
Historial de interacción por WhatsApp / WABA / Evolution API.
* **`id`**: `UUID` (PK)
* **`lead_id`**: `UUID` (FK -> `leads`)
* **`content`**: `TEXT` (Contenido del mensaje)
* **`direction`**: `TEXT` (`inbound` / `outbound`)
* **`media_url`**: `TEXT` (Enlace al archivo de audio/multimedia en Storage)
* **`media_type`**: `TEXT` (Tipo MIME, ej. `audio/ogg`, `image/jpeg`)
* **`is_read`**: `BOOLEAN` (Default: `FALSE`, indica si el mensaje fue visto por un agente)
* **`created_at`**: `TIMESTAMPTZ` (Fecha de envío/recepción)


### **Perfiles de Staff (`profiles`)**
Información extendida de los usuarios del sistema.
* **`id`**: `UUID` (PK, FK -> `auth.users`)
* **`first_name`**: `TEXT` (Nombre)
* **`last_name`**: `TEXT` (Apellido)
* **`role`**: `user_role` (`admin` / `agente`)
* **`phone`**: `TEXT` (Teléfono de contacto)
* **`whatsapp_number`**: `TEXT` (Número para WhatsApp CRM)
* **`bio`**: `TEXT` (Biografía o notas)
* **`avatar_url`**: `TEXT` (URL de la imagen de perfil en Storage)

---

## 5. Almacenamiento (Storage Buckets)

### **`avatars`**
* **Uso**: Fotos de perfil de agentes y administradores.
* **Estructura**: `avatars/{user_id}/{filename}`.
* **Acceso**: Público para lectura, restringido por UID para escritura/borrado.

### **`chat_media`**
* **Uso**: Audios, notas de voz, imágenes o documentos enviados/recibidos en el chat.
* **Acceso**: Público para lectura (facilita reproducción en web y envío por API).

### **`provider-logos`**
* **Uso**: Logotipos de las rentadoras aliadas.

### **`vehicles`**
* **Uso**: Imágenes de la flota por categorías.

---

---

> **Nota técnica:** Todas las tablas incluyen campos de auditoría `created_at` y, en el caso de leads, `updated_at` para control de cambios.