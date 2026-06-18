# 🧩 Componentes Reutilizables

> Verificado contra el código · `2026-06-17`

Inventario de los componentes compartidos del CRM: propósito, props, tipo (cliente/servidor) y dónde se usan. Para modales y drawers ver [`modales-drawers.md`](modales-drawers.md); para tokens visuales ver [`sistema-diseno.md`](sistema-diseno.md).

---

## 1. Layout y Navegación (`src/app/dashboard/components/`)

### `SidebarNav`
Navegación lateral con iconos Material Symbols y estado activo. **Client.**
- **Props:** `menuItems: { name: string; href: string }[]`
- Consume `useNotifications()` para badges; resalta la ruta actual.

### `DashboardHeader`
Barra superior: saludo dinámico, toggle **Online/Offline**, búsqueda global y `NotificationBell`. **Client.**
- **Props:** `userProfile`
- Llama a la acción de estado de perfil; feedback con toasts; avatar vía UI Avatars.

### `MobileAppNavigation`
Navegación móvil: botón FAB + drawer deslizable desde la derecha. **Client.**
- **Props:** `menuItems`
- Oculta en `lg+`. El FAB sube su posición en la vista de chats.

### `ActiveStatusTracker`
Componente invisible que actualiza `last_active_at` cada ~10 min y al detectar actividad (throttle 5 min). Mantiene la presencia del agente. **Client.**

### `PWAHead`
Detección e instalación de PWA: banner iOS (instrucciones), prompt nativo Android y detección de actualizaciones del service worker (toast "Nueva versión"). **Client.**

---

## 2. Notificaciones

### `NotificationProvider`
Context provider global de notificaciones. **Client.**
- **Props:** `children`
- **Context:** `{ unreadCount: number; refreshUnreadCount: () => Promise<void> }`
- Suscripción Realtime a `notifications`; beep (Web Audio API, throttle 2s), notificaciones de escritorio y **web push** (VAPID). Toasts con icono/color por tipo.
- Se monta en el layout raíz.

### `NotificationBell`
Campana con dropdown en tiempo real. **Client.**
- Suscripción `postgres_changes` sobre `notifications`; badge de no leídos; "Marcar todas leídas".
- Mapa `typeConfig` con emoji/color por tipo (`new_lead`, `lead_assigned`, `payment_confirmed`, `new_message`, `voucher_sent`, `quote_generated`, `lead_closed`, `status_changed`).
- Se usa dentro de `DashboardHeader`.

---

## 3. Gráficas (Recharts)

### `PipelineChart` + `PipelineChartArea`
Gráfico de área del pipeline con tabs 24h / 7d / 30d. **Client.**
- **Props (`PipelineChart`):** `data: { '24h': Point[]; '7d': Point[]; '30d': Point[] }`
- `PipelineChartArea` se carga con `next/dynamic` (`ssr:false`) para lazy-load; gradiente `#4052b6`. Usado en el dashboard de inicio.

### `ReportsCharts` (`reports/components/`)
Conjunto de gráficas lazy-loaded (`dynamic`, `ssr:false`) con fallback spinner:
| Componente | Tipo | Notas |
| :--- | :--- | :--- |
| `LeadsAreaChart` | AreaChart | Gradiente indigo `#6366f1` |
| `StatusPieChart` | Donut | innerRadius 55 / outerRadius 80, conteo al centro |
| `CategoryBarChart` | BarChart | Barras `#8b5cf6` |
| `ChatActivityBarChart` | Stacked Bar | Inbound `#3b82f6` / Outbound `#10b981` |

`ReportsClient` orquesta los datos y la tabla de rendimiento por agente.

---

## 4. Telefonía

### `ZadarmaWidget` (`src/components/`)
Widget WebRTC de llamadas Zadarma. **Client.**
- **Props:** `sipExtension: string`, `pbxNumber: string`
- Carga dinámica de los scripts de Zadarma; obtiene la WebRTC key vía `/api/zadarma/webrtc-key`; se posiciona abajo-derecha. Se monta en el Lead Detail cuando el agente tiene extensión SIP.

---

## 5. Componentes del Lead Detail (`leads/[id]/components/`)

| Componente | Rol |
| :--- | :--- |
| `LeadDetailClient` | Contenedor de 2 columnas + tabs (Información, Cotización, Voucher, Historial, Tareas, Chat) |
| `sections/PipelineStatusBar` | Barra de 6 etapas clickeables |
| `sections/ActivityTimeline` | Línea de tiempo (cotizaciones, vouchers, eventos, notas) |
| `sections/TasksPanel` | Tareas del lead (crear/completar/cancelar) |
| `sections/TaskOutcomeModal` | Modal de resultado de tarea (ver modales-drawers.md) |
| `sections/NotesPanel` | Notas internas con autor y timestamp |
| `CallLogPanel` | Llamadas Zadarma del lead |
| `ContactReservationsBanner` | Aviso de otras reservas del mismo contacto |

---

## 6. Componentes del Kanban (`leads/components/`)

| Componente | Rol |
| :--- | :--- |
| `KanbanBoard` | Tablero por etapas con drag & drop |
| `KanbanFilterContext` | Contexto de filtros (agente, categoría, fecha, búsqueda) |
| `KanbanSearchControls` | Controles de búsqueda/filtro |
| `TaskBanner` | "Tienes X tareas para hoy" (vencidas en rojo) |
| `NewLeadButton` / `NewLeadModal` | Crear lead (ver modales-drawers.md) |
| `ExportLeadsButton` | Exportar leads |

---

## 7. Convenciones de Reutilización

* **Colores de estado:** siempre desde `src/lib/leads/transitions.ts` (`STATUS_CONFIG`, `STAGE_ORDER`, `LOST_REASONS`).
* **Toasts:** `sonner` (`toast.success/error/message`) — patrón en [`sistema-diseno.md`](sistema-diseno.md#5-componentes-visuales-base).
* **Iconos:** `lucide-react` en componentes React; Material Symbols en navegación.
* **Tipos compartidos:** las interfaces de `Task`/`FollowUpRule` viven en `src/app/utils/actions/tasks.ts`; reutilizar en lugar de redefinir.
* **Carga diferida de gráficas:** todo Recharts se importa con `next/dynamic` + `ssr:false` para reducir el bundle inicial.
