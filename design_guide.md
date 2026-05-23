# Go Easy CRM — Documento de Diseño

Wireframes medium-fi para un CRM de renta de autos en LATAM. Este documento describe el sistema visual, la arquitectura de pantallas y las decisiones de diseño.

---

## 1. Resumen

**Producto:** Plataforma CRM para empresas de renta de vehículos, con foco en pipeline de ventas, WhatsApp Business y automatizaciones (n8n).

**Audiencia:** Agentes de ventas, gerentes y administradores en LATAM (es-MX, es-CO, es-PE, es-AR, es-CL).

**Fidelidad:** Medium-fi — layout final, tipografía real, color funcional, datos realistas. Iconografía y fotografías de vehículos como placeholders.

**Formato:** Una sola HTML con design canvas (pan/zoom) de 18 artboards a 1280×800.

---

## 2. Arquitectura de Información

```
GO EASY CRM
├── Operación
│   ├── 01  Inicio (Dashboard)                  [+ variante densa]
│   ├── 02  Pipeline Kanban                     [+ variante por agente]
│   ├── 03  Lead Detail
│   ├── 04  Chats WhatsApp
│   ├── 05  Catálogo de Flota
│   ├── 06  Proveedores
│   ├── 07  Reportes y Análisis
│   ├── 08  Mensajes (n8n)
│   └── 09  Automatizaciones
└── Configuración
    ├── 10  Mi Perfil
    ├── 11  Settings Hub
    ├── 12  Usuarios y Roles
    ├── 13  Sitios y Ubicaciones
    ├── 14  Plantillas de Email
    ├── 15  Configuración General
    └── 16  WhatsApp Business API
```

**Navegación primaria:** Sidebar fija de 260px, fondo `#0f172a` (slate-900) con accent bar azul para el item activo.
**Navegación secundaria:** Tabs internos (Lead Detail, Configuración General).

---

## 3. Sistema Visual

### 3.1 Tipografía

| Rol             | Fuente | Peso | Tamaño  | Tracking |
|-----------------|--------|------|---------|----------|
| Page title      | Inter  | 700  | 22 px   | -0.4 px  |
| Card title      | Inter  | 600  | 14 px   | -0.1 px  |
| KPI value       | Inter  | 700  | 26 px   | -0.5 px  |
| Body            | Inter  | 400-500 | 13 px |          |
| Label/caption   | Inter  | 600  | 11 px   | 0.05em UPPERCASE |
| Mono (IDs)      | ui-monospace | 600 | 10-12 px |       |

Fallback stack: `Inter, system-ui, -apple-system, 'Segoe UI', sans-serif`.

### 3.2 Paleta

**Neutrals (cool gray / slate)**

| Token        | Hex       | Uso                         |
|--------------|-----------|-----------------------------|
| `--bg`       | `#f6f7f9` | Fondo de contenido          |
| `--surface`  | `#ffffff` | Cards, inputs, sidebar item |
| `--surface-2`| `#fbfbfc` | Hover sutil, table head     |
| `--line`     | `#e5e7eb` | Borde estándar              |
| `--line-2`   | `#eef0f3` | Borde sutil, divisores      |
| `--ink`      | `#0f172a` | Texto primario              |
| `--ink-2`    | `#334155` | Texto secundario            |
| `--ink-3`    | `#64748b` | Texto terciario / labels    |
| `--ink-4`    | `#94a3b8` | Disabled, placeholders      |
| `--ink-5`    | `#cbd5e1` | Bordes inactivos            |

**Acentos funcionales**

| Token       | Hex       | Significado                              |
|-------------|-----------|------------------------------------------|
| `--blue`    | `#2563eb` | Primario, links, etapa "Lead Nuevo"      |
| `--green`   | `#059669` | Éxito, en línea, "Cerrado Ganado"        |
| `--amber`   | `#d97706` | Atención, "Voucher Enviado", sin asignar |
| `--rose`    | `#e11d48` | Error, urgente, "Cerrado Perdido"        |
| `--violet`  | `#7c3aed` | Etapa "En Cotización", n8n               |
| `--indigo`  | `#4f46e5` | Personal/perfil                          |
| `--emerald` | `#10b981` | Operación/ubicaciones                    |

Cada acento tiene un companion `*-soft` (≈10% lightness) para tags y backgrounds suaves.

**Sidebar (dark)**

```
--sidebar-bg:        #0f172a    (slate-900)
--sidebar-ink:       #cbd5e1
--sidebar-ink-dim:   #64748b
--sidebar-active-bg: rgba(37, 99, 235, 0.16)
```

### 3.3 Espaciado y Radii

| Token         | Valor   | Uso                          |
|---------------|---------|------------------------------|
| `--radius-sm` | 6 px    | Inputs pequeños, chips       |
| `--radius`    | 10 px   | Cards, paneles               |
| `--radius-lg` | 14 px   | (reservado, no usado)        |
| Padding card  | 18 px   | Estándar                     |
| Gap grid      | 14 px   | Entre cards                  |
| Gap inline    | 6-12 px | Iconos + texto, chips        |

### 3.4 Sombras

```css
--shadow-sm: 0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.02);
--shadow:    0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.04);
```

Las sombras son **muy sutiles**; preferimos bordes a 1px para separar superficies. Las sombras solo aparecen en cards del kanban (cards arrastrables) y elementos elevados.

### 3.5 Iconografía

- Set propio de íconos SVG inline (stroke-based, 1.7px stroke, 24×24 viewBox).
- 40+ íconos: navegación (`home`, `kanban`, `chat`, `car`, `chart`...), acciones (`plus`, `edit`, `trash`, `send`...), estado (`check`, `x`, `bolt`).
- Tamaños canónicos: 11, 12, 13, 14, 16 px.
- Color: hereda `currentColor` para integrarse con el contexto.

---

## 4. Componentes

### 4.1 Sidebar
- Logo + wordmark + tagline en el header.
- Section label "Operación" en uppercase 10px.
- 8 items de navegación principal.
- Tip card en el footer ("Sales tip" — patrón educativo).
- Settings + logout al fondo.

### 4.2 Topbar (60 px)
- Welcome message ("¡Buen día! Mariana López")
- Online/offline toggle pill — control crítico para agentes
- Search global
- Notifications (badge)
- User chip con avatar

### 4.3 Kanban Card
Card del lead con:
- ID (mono, 10px)
- Badges: "Nuevo" / "🔥 Urgente" / contador de no leídos
- Nombre + monto destacados
- Fecha de recogida + ciudad
- Tag de categoría + indicador de edad (verde <24h, ámbar 2-3d, rojo 5+d)
- Footer: agente asignado o "Sin asignar" + monto de reserva
- **Accent bar izquierdo:** azul (no leídos) / ámbar (sin asignar) / verde (nuevo)

### 4.4 KPI Card
```
┌──────────────────────────┐
│ ETIQUETA               ↑% │
│ $284,920                  │
│ ▰▰▰▰▰▰▰░░░  72%           │
│ vs mes anterior           │
└──────────────────────────┘
```
Variantes: `default` (blanco), `dark` (gradient slate-900 → slate-800).

### 4.5 Tabla
- Header: `--surface-2` background, label 11px uppercase
- Filas con hover sutil
- Avatar + nombre como pattern recurrente
- Acciones inline (icon buttons ghost) en la última columna

### 4.6 Chat Bubble
- **Entrante** (`in`): fondo blanco, borde, esquina `12px 12px 12px 2px`
- **Saliente** (`out`): fondo `--blue`, texto blanco, esquina `12px 12px 2px 12px`
- Timestamp 10px alineado a la derecha, opacidad 0.7

### 4.7 Forms
- Inputs: 36px alto, radius 8px, border `--line`
- Focus: border `--blue` + shadow ring `--blue-soft` (3px)
- Labels: 11px uppercase, color `--ink-3`
- Validación inline (no implementada visualmente aún)

### 4.8 Toggle Switch
- 30×17 px, knob de 13px
- Verde cuando está activo, `--ink-5` cuando off
- Transición de 150ms

### 4.9 Tags / Chips
- Tag: 22px alto, 11px texto, variantes `blue`/`green`/`amber`/`rose`/`violet`
- Tag con dot: prefijo con círculo de 6px en color
- Chip removable: 26px alto, "×" con hit area de 14px

---

## 5. Marcadores Especiales

| Marker | Significado |
|--------|-------------|
| `⚡` (zap amarillo) | Sección con datos en tiempo real |
| Borde `dashed` azul | Estado modal / overlay |
| Borde `dotted` gris | Zona drag-and-drop |

---

## 6. Pipeline (Etapas)

| ID            | Label                | Color     | Tono   |
|---------------|----------------------|-----------|--------|
| `nuevo`       | Lead Nuevo           | `#2563eb` | blue   |
| `cotizacion`  | En Cotización        | `#7c3aed` | violet |
| `confirmada`  | Reserva Confirmada   | `#0891b2` | cyan   |
| `voucher`     | Voucher Enviado      | `#d97706` | amber  |
| `ganado`      | Cerrado Ganado       | `#059669` | green  |
| `perdido`     | Cerrado Perdido      | `#e11d48` | rose   |

---

## 7. Datos de Muestra (Realistas)

Los wireframes usan datos coherentes con el mercado LATAM:

- **Leads:** Carolina Mendoza (CDMX), Sebastián Restrepo (Bogotá), Joaquín Salgado (Buenos Aires), Lucía Paredes (Cusco)…
- **Vehículos:** Económico ($380/día), Compacto, Sedán, SUV Familiar, SUV Premium ($1,480/día), Pickup
- **Ciudades:** CDMX, Guadalajara, Monterrey, Cancún, Tulum, Bogotá, Lima, Santiago, Buenos Aires, Quito
- **Proveedores:** AutoRent CDMX, Pacífico Rentals, Andes Mobility, Inka Travel Cars
- **Montos:** MXN con orden de magnitud realista ($4,980 – $26,800)
- **Teléfonos:** Formato internacional con códigos de país correctos

---

## 8. Decisiones de Diseño Clave

### 8.1 Dos variantes de Dashboard
- **A (estándar):** 4 KPIs grandes + tabla de actividad reciente + columna derecha de insights. Apropiado para gerentes que monitorean el día.
- **B (densa):** sparkline hero + 6 KPIs pequeños + 3 cards comparativas. Apropiada para power users.

### 8.2 Dos variantes de Kanban
- **A (por etapa):** Las 6 columnas del pipeline horizontalmente. Vista clásica del flujo de ventas.
- **B (por agente):** Swimlanes por agente con las 4 etapas activas + columnas colapsadas para Ganado/Perdido. Vista de gerencia para balancear carga.

### 8.3 Lead Detail con chat lateral
Decisión: el chat de WhatsApp **siempre visible** en el detalle del lead. La acción más común del agente es responder un mensaje mientras revisa los datos del cliente — no debería requerir cambio de pantalla.

### 8.4 Mensajes vs. Chats vs. Automatizaciones
Tres pantallas relacionadas pero distintas:
- **Chats WhatsApp:** inbox conversacional, vista de agente.
- **Mensajes:** feed crudo + estado del motor n8n, vista técnica/admin.
- **Automatizaciones:** reglas, delays, plantillas, control de canales por etapa.

### 8.5 Settings Hub como tarjetas
En vez de una lista vertical, las 6 secciones de configuración aparecen como cards visuales con icono + badge + descripción. Reduce la cognitive load para usuarios que entran a Settings ocasionalmente.

### 8.6 WhatsApp QR a la vista
Vincular el dispositivo es la primera tarea al configurar. El QR está en el panel derecho (no escondido tras un click) con instrucciones claras y botón de regenerar.

### 8.7 Empty states y placeholders
- Imágenes de vehículos: pattern diagonal hatched con filename mono (`suv_premium.jpg`). Indica "imagen real va aquí" sin pretender ser la imagen final.
- Logos: caja con texto descriptivo (`logo.svg`, `fav.png`).
- Sin emojis decorativos (excepto 🔥 para "Urgente" — funcional, no decorativo).

---

## 9. Notas para Implementación

- **Stack sugerido:** React + Tailwind o CSS Modules. Las custom properties del wireframe migran directo a tokens de Tailwind.
- **Real-time:** Las áreas marcadas con ⚡ deberían usar WebSocket o Server-Sent Events para no requerir refresh manual.
- **Drag-and-drop:** Kanban requiere DnD library (react-dnd o dnd-kit). El visual ya prevé el accent border y la sombra elevada.
- **i18n:** Todo el copy en español. Estructura listo para llaves i18n si se requiere portugués (mercado Brasil) o inglés.
- **Permisos:** Roles `Admin`, `Agent`, `Viewer` ya tipados en la tabla de usuarios.

---

## 10. Pendientes / Próximos Pasos

- [ ] Recibir logo final y reemplazar wordmark "G"
- [ ] Modales adicionales: Nuevo Lead, Avanzar etapa con confirmación, Asignar agente
- [ ] Estados vacíos para cada lista (sin leads, sin mensajes, sin proveedores)
- [ ] Mobile breakpoints — al menos Chats y Kanban
- [ ] Variantes para tema oscuro (opcional)
- [ ] Hi-fi pass con iconos finales y fotografías reales de la flota
- [ ] Microcopy review con equipo de ventas (tone of voice LATAM)

---

*Última actualización: 23 Mayo 2026 · v1.0*