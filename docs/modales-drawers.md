# 🪟 Modales y Drawers

> Verificado contra el código · `2026-06-17`

Catálogo de modales (overlay centrado/fullscreen) y drawers (panel deslizable lateral) del CRM, con sus props y estructura. Para tokens visuales ver [`sistema-diseno.md`](sistema-diseno.md).

---

## Patrones Comunes

El proyecto usa **dos patrones** repetidos:

### A) Drawer lateral (formularios de catálogo/configuración)
Panel deslizable desde la derecha. Comparten estructura `CategoryDrawer`, `ProviderDrawer`, `LocationDrawer`:

```
Overlay: fixed inset-0 backdrop-blur semi-transparente (click cierra)
Panel:   w-full max-w-xl, slide-in-from-right duration-500, rounded-l-[3.5rem]
  ├─ Header  (p-10): título + botón cerrar (rounded-full bg-slate-50)
  ├─ Form    (flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar)
  └─ Footer  (p-10 border-t): [Descartar] [Guardar]  (flex 1 : 2)
```

**Props comunes:**
```ts
{
  <entity>: Entity | null      // null = crear, objeto = editar
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: Entity) => void
}
```

### B) Modal overlay (acciones puntuales)
`NewLeadModal` (fullscreen) y `TaskOutcomeModal` (centrado, slide-up en móvil). Render por portal en `document.body`, backdrop blur, transición de escala/opacidad.

---

## Catálogo

### `NewLeadModal`
`src/app/dashboard/leads/components/NewLeadModal.tsx` — **Modal fullscreen.**
- **Props:** `{ isOpen, onClose, categories, locations, currentUserId }`
- **Función:** crear lead/reserva. Detecta **cliente recurrente** por teléfono/email (debounce 600 ms) y muestra badge "Recurrente" (Sparkles) + autocompleta datos. Cálculo automático de total según rango de fechas.
- **Campos:** nombre, apellido, teléfono, email, fecha+hora de recogida, fecha+hora de devolución, ubicación, categoría, total.
- **Apertura:** desde la página de Leads (`NewLeadButton`).

### `CategoryDrawer`
`src/app/dashboard/catalog/CategoryDrawer.tsx` — **Drawer (patrón A).**
- **Props:** `{ category, isOpen, onClose, onSuccess }`
- **Función:** crear/editar categoría de vehículo. Subida de imagen con compresión a **WebP** (canvas) y preview en vivo.
- **Campos:** nombre, `daily_price` (emerald), `base_daily_cost` (rose), descripción, imagen (upload + URL).

### `ProviderDrawer`
`src/app/dashboard/providers/components/ProviderDrawer.tsx` — **Drawer (patrón A).**
- **Props:** `{ provider, isOpen, onClose, onSuccess }`
- **Función:** crear/editar proveedor **con gestión anidada de oficinas** (`provider_offices`). Subida de logo con barra de progreso (→ WebP).
- **Campos proveedor:** nombre, contacto, email, `whatsapp_group_id` (para n8n).
- **Oficinas (sub-form):** ubicación, dirección, teléfono, horario, notas — agregar/editar/eliminar inline.

### `LocationDrawer`
`src/app/dashboard/settings/locations/components/LocationDrawer.tsx` — **Drawer (patrón A).**
- **Props:** `{ location, isOpen, onClose, onSuccess }`
- **Función:** crear/editar ubicación.
- **Campos:** `type` (selector visual Aeropuerto/Ciudad/Terminal con iconos), nombre, código IATA (opcional).

### `TaskOutcomeModal`
`src/app/dashboard/leads/[id]/components/sections/TaskOutcomeModal.tsx` — **Modal (patrón B).**
- **Props:** `{ task, onClose, onCompleted }`
- **Función:** registrar el resultado de una tarea en **2 pasos**:
  1. ¿El cliente respondió? → **No** = `no_answer`.
  2. Si sí → ¿Positivo o Negativo? = `positive` / `negative`.
- Muestra **preview del follow-up automático** (fondo ámbar) si la tarea tiene `follow_up_rules` para ese resultado. Textarea de notas opcional. Llama a `completeTask(task.id, outcome, notes)`.
- El texto se adapta al `task_type` (llamada: "¿contestó?"; otros: "¿respondió?").

---

## Tabla Resumen

| Componente | Patrón | Entidad | Ubicación |
| :--- | :--- | :--- | :--- |
| `NewLeadModal` | Modal fullscreen | `leads` | Kanban / Leads |
| `CategoryDrawer` | Drawer derecho | `categories` | Catálogo |
| `ProviderDrawer` | Drawer derecho | `providers` + `provider_offices` | Proveedores |
| `LocationDrawer` | Drawer derecho | `locations` | Settings › Ubicaciones |
| `TaskOutcomeModal` | Modal centrado | `tasks` | Lead Detail › Tareas |

---

## Crear un Nuevo Drawer (guía)

Para mantener consistencia, al añadir un drawer de catálogo:

1. Reutiliza la firma de props `{ entity, isOpen, onClose, onSuccess }`.
2. Estructura Header / Form scrollable / Footer (ver patrón A).
3. Overlay `fixed inset-0` con `backdrop-blur` que cierra al hacer click.
4. Animación `slide-in-from-right duration-500` y `rounded-l-[3.5rem]`.
5. Feedback con `toast.success` / `toast.error` (sonner).
6. Subidas de imagen: comprimir a WebP en canvas antes de subir a Storage.
7. Tras guardar: `onSuccess(updated)` y `onClose()` para que el padre refresque sin recargar.
