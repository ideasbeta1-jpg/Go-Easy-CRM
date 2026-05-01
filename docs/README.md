# Centro de Documentación — Go Easy CRM

Documentación técnica completa del CRM especializado en renta de autos de Go Easy Florida. Next.js 16 · Supabase · WhatsApp Business API · Stripe · Zadarma VoIP.

---

## Navegación de Documentos

### Fundamentos

| Documento | Descripción |
| :--- | :--- |
| [PRD — Product Requirements](prd.md) | Visión ejecutiva, objetivos, usuarios del sistema y stack tecnológico |
| [Esquema de Base de Datos](esquema-datos.md) | 15 tablas, enums, relaciones, buckets de Storage y fórmulas de cálculo |
| [Arquitectura del Proyecto](arquitectura.md) | Estructura de repositorio, endpoints API, lógica Round Robin, integraciones |

### Guías Detalladas

| Documento | Descripción |
| :--- | :--- |
| [Guía del Desarrollador](guia-desarrollador.md) | Setup local, variables de entorno, migraciones, patrones de código, despliegue |
| [Flujo del Pipeline de Ventas](flujo-pipeline.md) | Ciclo completo lead_nuevo → cerrado con lógica de precios, transiciones y automatizaciones |
| [Módulos del Dashboard](modulos-dashboard.md) | Descripción de cada sección del CRM: Kanban, Chats, Catálogo, Reportes, Configuración |
| [Integraciones Externas](integraciones.md) | WhatsApp WABA, Evolution API, Stripe, Zadarma VoIP, Resend, Meta CAPI, Web Push, n8n |
| [Automatizaciones y Notificaciones](automatizaciones.md) | Motor interno, templates por etapa, variables dinámicas, monitoreo |

---

## Setup Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Crear .env.local con las credenciales (ver guia-desarrollador.md para detalle completo)
cp .env.example .env.local   # si existe, o crear manualmente

# 3. Ejecutar en desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:3000  →  redirige a /dashboard (con sesión) o /landing (sin sesión)
```

Variables mínimas requeridas para funcionar:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Ver [Guía del Desarrollador](guia-desarrollador.md) para la lista completa de variables y el setup de cada integración.
