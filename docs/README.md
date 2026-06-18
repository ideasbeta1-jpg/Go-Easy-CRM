# Centro de Documentación — Go Easy CRM

Documentación técnica completa del CRM especializado en renta de autos de Go Easy Florida. Next.js 16 · React 19 · Tailwind v4 · Supabase · WhatsApp Business API · Stripe · Zadarma VoIP.

> Última actualización general: **2026-06-17** · 24 tablas · verificado contra Supabase y código fuente.

---

## Navegación de Documentos

### Fundamentos

| Documento | Descripción |
| :--- | :--- |
| [PRD — Product Requirements](prd.md) | Visión ejecutiva, objetivos, usuarios del sistema y stack tecnológico |
| [Esquema de Base de Datos](esquema-datos.md) | 24 tablas, enums, funciones, triggers, RLS, buckets y fórmulas de cálculo |
| [Diagrama ER (Mermaid)](diagrama-er.md) | Diagrama entidad-relación visual de todo el esquema |
| [`schema.sql`](schema.sql) | **DDL completo y ejecutable** para recrear la base de datos desde cero |
| [Arquitectura del Proyecto](arquitectura.md) | Stack, estructura de repo, endpoints API, server actions, Round Robin, integraciones |

> Tipos TypeScript del esquema en [`src/types/database.types.ts`](../src/types/database.types.ts).

### Guías Detalladas

| Documento | Descripción |
| :--- | :--- |
| [Guía del Desarrollador](guia-desarrollador.md) | Setup local, variables de entorno, scripts, patrones de código, despliegue |
| [Flujo del Pipeline de Ventas](flujo-pipeline.md) | Ciclo completo lead_nuevo → cerrado_ganado/perdido con precios y transiciones |
| [Módulos del Dashboard](modulos-dashboard.md) | Cada sección: Kanban, Lead Detail, Contactos, Tareas, Chats, Reportes, Logs, Configuración |
| [Integraciones Externas](integraciones.md) | WhatsApp WABA, Evolution API, Stripe, Zadarma VoIP, Resend, Meta CAPI, Web Push, n8n |
| [Automatizaciones y Notificaciones](automatizaciones.md) | Motor interno, canales por etapa, reglas, tareas/follow-up, cron, Round Robin |

### Diseño y UI

| Documento | Descripción |
| :--- | :--- |
| [Sistema de Diseño](sistema-diseno.md) | Tokens, paleta, tipografía, colores del pipeline y componentes base (verificado contra `globals.css`) |
| [Componentes Reutilizables](componentes-reutilizables.md) | Inventario de componentes compartidos con props y uso |
| [Modales y Drawers](modales-drawers.md) | Catálogo de modales/drawers y sus patrones reutilizables |

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
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Ver [Guía del Desarrollador](guia-desarrollador.md) para la lista completa de variables y el setup de cada integración.
