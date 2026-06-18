# 🎨 Sistema de Diseño — Go Easy CRM

> Verificado contra `src/app/globals.css` y `src/lib/leads/transitions.ts` · `2026-06-17`

Tokens, colores, tipografía y patrones visuales **realmente implementados** en la aplicación. Tailwind CSS v4 (sin `tailwind.config.js`): los tokens viven en `globals.css`.

> El documento histórico de wireframes medium-fi sigue disponible en [`/design_guide.md`](../design_guide.md) (v1.0, mayo 2026). Este archivo refleja el código en producción.

---

## 1. Paleta de Color (tokens en `globals.css`)

Sistema basado en Material Design 3, azul primario `#4052b6`.

### Primarios y secundarios

| Token | Hex | Uso |
| :--- | :--- | :--- |
| `--primary` | `#4052b6` | Color principal, botones, links activos |
| `--primary-dim` | `#3346a9` | Hover de primario |
| `--primary-container` | `#8899ff` | Fondos suaves de primario |
| `--secondary` | `#4e5c71` | Texto/acciones secundarias |
| `--tertiary` | `#006573` | Acento cian |
| `--tertiary-fixed` | `#50e1f9` | Detalles cian brillante |

### Semánticos

| Token | Hex | Significado |
| :--- | :--- | :--- |
| `--error` | `#b41340` | Errores |
| `--accent-emerald` | `#10b981` | Éxito / confirmado |
| `--accent-amber` | `#f59e0b` | Advertencia / pendiente |

### Superficies y texto

| Token | Hex | Uso |
| :--- | :--- | :--- |
| `--background` | `#f8fafc` | Fondo de la app |
| `--on-background` | `#0f172a` | Texto principal |
| `--surface` | `#ffffff` | Cards, inputs |
| `--surface-variant` | `#f1f5f9` | Fondos sutiles |
| `--on-surface-variant` | `#64748b` | Texto terciario |
| `--outline` | `#94a3b8` | Bordes |
| `--outline-variant` | `#e2e8f0` | Bordes sutiles / divisores |

Escala de contenedores: `--surface-container-lowest` (`#ffffff`) → `--surface-container-highest` (`#cbd5e1`).

---

## 2. Tipografía

Fuente única **Radio Canada** (variable font vía `next/font`), declarada en los tokens:

```css
--font-sans / --font-body / --font-headline / --font-label
  : var(--font-radio-canada), ui-sans-serif, system-ui;
```

**Iconos:** Material Symbols Outlined (`material-symbols-outlined`, `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`, clase `.fill-1` para relleno) + `lucide-react` en componentes.

**Estilos de texto recurrentes (Tailwind):**

| Rol | Clases |
| :--- | :--- |
| Label/caption | `text-[10px] font-black uppercase tracking-widest text-slate-400` |
| Body small | `text-xs font-bold` |
| Heading small | `text-sm font-black` |
| Heading medio | `text-xl font-black` |
| KPI / heading grande | `text-3xl font-black tracking-tight` |

---

## 3. Radios, sombras y efectos

| Token / patrón | Valor |
| :--- | :--- |
| `--radius-xl` | `3rem` |
| Cards estándar | `rounded-2xl` (1.5rem) |
| Drawers | `rounded-l-[3.5rem]` (esquina izquierda) |
| Botones de acción | `rounded-[1.25rem]` |
| Sombra de card | `shadow-sm` → `hover:shadow-md` |
| Sombra de primario | `shadow-xl shadow-primary/20` |

**Utilidades CSS propias:**

```css
.bg-oceanic   /* linear-gradient(135deg, #4052b6 0%, #8899ff 100%) */
.bg-dots      /* radial dots #cbd5e1, 32px grid */
.custom-scrollbar  /* scrollbar 6px, thumb #e2e8f0 */
```

**Animaciones:** `animate-shimmer` (skeletons), `animate-wiggle` (campana), `animate-bounce-subtle` (badge recurrente), más utilidades `tailwindcss-animate`: `slide-in-from-right/top/bottom`, `zoom-in-95`, `fade-in`, `animate-spin`.

---

## 4. Colores del Pipeline (fuente única de verdad)

Definidos en `src/lib/leads/transitions.ts` (`STATUS_CONFIG`). **Usar siempre estas constantes**, no hardcodear colores por estado.

| Estado | Label | Color (dot/bar) |
| :--- | :--- | :--- |
| `lead_nuevo` | Lead Nuevo | `bg-blue-500` |
| `en_cotizacion` | En Cotización | `bg-indigo-500` |
| `reserva_confirmada` | Reserva Confirmada | `bg-emerald-500` |
| `voucher_enviado` | Voucher Enviado | `bg-amber-500` |
| `cerrado_ganado` | Cerrado Ganado | `bg-emerald-600` |
| `cerrado_perdido` | Cerrado Perdido | `bg-rose-400` |

Constantes relacionadas en el mismo archivo:
* `STAGE_ORDER` — orden lineal del pipeline (sin `cerrado_perdido`).
* `LOST_STAGE = 'cerrado_perdido'` — alcanzable desde cualquier etapa.
* `STAGE_AUTOMATION_NOTE` — texto que advierte qué enviará cada transición.
* `LOST_REASONS` — motivos de pérdida para `cerrado_perdido`.

> **Píldoras del Lead Detail:** `LeadDetailClient.tsx` define variantes pastel (`STATUS_PILL`) y puntos (`STATUS_DOT`) con la misma semántica de color (En Cotización usa ámbar en la píldora del detalle).

**Paleta de gráficas** (`ReportsClient.tsx`): `['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#64748b']`.

---

## 5. Componentes Visuales Base

### Card KPI
```
bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md
  · Label arriba (text-[10px] uppercase text-slate-400)
  · Valor (text-3xl font-bold)
  · Trend abajo con border-t
```

### Input (patrón estándar)
```
label: flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400
input: w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold
       focus:ring-2 focus:ring-primary/10  (ícono lucide a la izquierda)
```

### Badge / Chip de estado
```
px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest
  · Recurrente: bg-amber-100 text-amber-700 + Sparkles + animate-bounce-subtle
```

### Progress bar
```
contenedor: h-2 w-full bg-slate-100 rounded-full overflow-hidden
relleno:    h-full bg-[color] rounded-full transition-all duration-500 (width %)
```

### Tabla
```
text-xs · header pb-3 font-bold text-slate-400 uppercase tracking-wider
filas: py-3 hover:bg-slate-50/50 · divide-y divide-slate-50
```

### Toast (Sonner)
```ts
toast.success('Mensaje', { description, icon: <CheckCircle2 className="text-emerald-500"/> })
toast.error('Error', { description })
toast('Título', { action: { label, onClick }, duration: Infinity })  // acciones
```

### Timeline (línea de tiempo)
```
contenedor: space-y-8 pl-6 border-l-2 border-slate-50
nodo:       círculo -left-[41px] ring-8 ring-white + color por evento
card:       rounded-2xl p-5 ml-4 border (rojo si es alerta de mismatch)
```

---

## 6. Layout y Responsividad

* **Desktop:** sidebar fija (`SidebarNav`) + header (`DashboardHeader`) + contenido.
* **Móvil:** sidebar oculta; botón FAB + drawer (`MobileAppNavigation`) deslizable desde la derecha.
* **Grids de formulario:** 1 columna en móvil → 2 columnas en `md+`.
* **PWA:** instalable; banners de instalación iOS/Android en `PWAHead`.

---

## 7. Principios

1. **Bordes antes que sombras** para separar superficies (sombras muy sutiles, reservadas a cards elevadas/arrastrables).
2. **Color funcional:** cada acento comunica estado; los colores de etapa salen de `transitions.ts`.
3. **Labels en mayúsculas** con `tracking` amplio y `font-black` para jerarquía.
4. **Esquinas generosas** (`rounded-2xl`+) y mucho espacio en blanco.
5. **Feedback inmediato:** toasts Sonner en toda mutación; optimistic updates en chat.
