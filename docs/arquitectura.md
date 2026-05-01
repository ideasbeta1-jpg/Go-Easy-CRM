# 🏗️ Arquitectura y Estructura del Proyecto

Este documento detalla la estructura del repositorio de **Go Easy CRM**, las rutas de API disponibles, los módulos core y las integraciones con servicios externos.

---

## 📂 Estructura del Repositorio

El proyecto utiliza **Next.js (App Router)** y **TypeScript** para estructurar la lógica del CRM:

```
├── .next                  # Archivos generados por Next.js en build
├── public                 # Assets públicos, imágenes estáticas
├── src                    # Directorio fuente de la aplicación
│   ├── app                # Next.js App Router (Páginas, APIs, Estilos)
│   │   ├── api            # Rutas de API REST de backend
│   │   │   ├── audio      # Procesamiento de audio/mensajes
│   │   │   ├── cron       # Tareas programadas (Scheduler)
│   │   │   ├── leads      # Operaciones CRUD para Leads
│   │   │   ├── media      # Carga de archivos y multimedia
│   │   │   ├── push       # Envío de notificaciones web push
│   │   │   ├── webhooks   # Webhooks de Stripe y WhatsApp/Evolution API
│   │   │   └── zadarma    # Webhook y llamadas VoIP de Zadarma
│   │   ├── cotizacion     # Vista/Gestión de cotización
│   │   ├── dashboard      # Panel de administración principal (Agentes, Leads)
│   │   ├── globals.css    # Estilos globales y Tailwind CSS
│   │   ├── landing        # Páginas de destino y formularios de captura
│   │   └── page.tsx       # Redirección o página principal
│   ├── lib                # Lógicas core del CRM
│   │   ├── leads          # Funciones para la gestión y asignación de leads
│   │   └── zadarma.ts     # Cliente API de integración con Zadarma VoIP
│   └── utils              # Utilidades compartidas y motores
│       ├── assignment.ts  # Algoritmo Round Robin de asignación
│       ├── automation-engine.ts  # Motor interno de automatizaciones
│       ├── automation-scheduler.ts # Programador de tareas automáticas
│       ├── email.ts       # Utilidad para envío de emails (Resend)
│       ├── n8n.ts         # Integración secundaria con n8n
│       ├── push-notifications.ts # Gestor de notificaciones push
│       ├── stripe.ts      # Cliente API para procesamiento de pagos
│       └── waba.ts        # Cliente de WhatsApp Business API (Evolution API)
```

---

## 🌐 Rutas de API Clave (Endpoints)

| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `/api/leads` | `GET`, `POST` | Listar y crear leads en la plataforma. |
| `/api/leads/[id]` | `GET`, `PATCH` | Obtener y actualizar datos o estados de un lead. |
| `/api/webhooks/stripe`| `POST` | Webhook para detectar y procesar pagos exitosos. |
| `/api/webhooks/whatsapp`| `POST` | Webhook para recibir mensajes y eventos de WhatsApp. |
| `/api/zadarma/webhook`| `POST` | Recibir eventos de llamadas y grabaciones de Zadarma. |

---

## 🧮 Lógica de Asignación Round Robin

El sistema de asignación de leads a los agentes se gestiona a través del algoritmo implementado en `src/utils/assignment.ts`:

1. **Filtro de Agentes Activos:** Se seleccionan perfiles que tengan el rol de `agente` (`role = 'agente'`) y estén activos.
2. **Criterio Round Robin:** Los agentes se ordenan de manera ascendente por el campo `last_assigned_at` (`ASC`), seleccionando al que más tiempo lleva sin recibir un lead.
3. **Persistencia:** Al asignar el lead al agente seleccionado, el campo `last_assigned_at` se actualiza con el timestamp actual (`now()`), moviendo al agente al final de la cola para futuras asignaciones.

---

## 🔗 Integraciones Externas

* **Supabase Client:** Usado para acceder a la base de datos de manera directa tanto en el cliente como en el backend con políticas de RLS.
* **Evolution API / WABA Client:** Administra la comunicación de WhatsApp enviando textos o multimedia al cliente.
* **Resend Client:** Genera correos electrónicos de confirmación usando plantillas HTML profesionales basadas en la etapa actual.
* **Stripe API Client:** Genera enlaces de pago y confirma transacciones para asegurar las reservas.
