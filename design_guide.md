# 🌴 Go Easy Florida - Design Guide

## 🎨 Sistema de Diseño: "Indigo Coast"
El sistema de diseño de Go Easy Florida está inspirado en la frescura de la costa de Florida combinada con la robustez y profesionalismo de una herramienta administrativa de alto rendimiento.

---

## 🔤 Tipografía
La identidad tipográfica ha evolucionado para usar **Radio Canada Big** como fuente principal unificada.

- **Fuente:** `Radio Canada Big` (Google Fonts)
- **Headline (H1, H2, H3):** 
  - Weight: 900 (Black)
  - Style: Italic (para dar dinamismo y velocidad)
  - Tracking: -0.05em (Tighter)
- **Body & Labels:** 
  - Weight: 400, 700
  - Tracking: Tight

---

## 🌈 Paleta de Colores (Material 3 Inspired)

### Colores Primarios (Coastal Blue)
- **Primary:** `#4052b6` (Deep Indigo)
- **Primary Container:** `#8899ff` (Oceanic Blue)
- **Gradient "Oceanic":** `linear-gradient(135deg, #4052b6 0%, #8899ff 100%)`

### Colores de Acento (Sun & Nature)
- **Emerald (Success):** `#10b981`
- **Amber (Warning):** `#f59e0b`
- **Error (Danger):** `#b41340`

### Colores de Superficie (Sand & Slate)
- **Background:** `#f8fafc` (Ultra Light Grey)
- **Surface:** `#ffffff` (Pure White)
- **Outline:** `#94a3b8` (Slate 400)

---

## 📐 Layout & Spacing
- **Borders:** Se utilizan bordes extremadamente redondeados para una sensación orgánica y premium.
  - Grandes contenedores (Sidebar, Cards): `3rem` (48px)
  - Pequeños elementos (Buttons, Inputs): `1rem` (16px)
- **Grid:** Layout de "Bento Box" asimétrico para el contenido principal.
- **Header:** Sticky y con efecto de desenfoque de cristal (`backdrop-blur`).

---

## 💠 Componentes Clave

### 1. Stats Cards
- Fondo blanco puro.
- Iconos de Material Symbols sobre contenedores de color suave.
- Indicador "REAL-TIME" en la esquina superior derecha.

### 2. SideNavBar
- Contenedor lateral blanco con borde derecho suave.
- Botones redondeados al 100% (píldora).
- Efecto de sombra sutil (`shadow-lg shadow-primary/20`) para el estado activo.

### 3. Recent Activity List
- Filas espaciadas con bordes de `2rem`.
- Avatares circulares con iniciales.
- Etiquetas de estado con colores semánticos.

---

## ✨ Micro-interacciones
- **Hover:** Escalado sutil (`scale-105`) y transiciones de 500ms para una sensación de fluidez.
- **FAB:** El botón de acción flotante debe tener una sombra proyectada intensa y animación de rotación al pasar el mouse.
