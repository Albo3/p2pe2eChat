# P2P Chat Design System

## Color Palette

Background Colors:
- Primary Background: radial-gradient(circle at 50% -250%, rgba(17, 24, 39, 1), rgba(3, 7, 18, 1) 55%)
- Panel Background: glass-dark (linear-gradient with backdrop-filter)
- Element Background: bg-black/40 (40% opacity black)

Accent Colors:
- Primary: text-emerald-400 with varying opacities (/90, /80, /70)
- Status: bg-emerald-500 with shadow-emerald-500/50
- Borders: border-white/5 (subtle white borders)

Text Colors:
- Primary: text-white/90
- Secondary: text-white/60
- Muted: text-white/50
- Interactive: text-emerald-400

## Components

Glass Panel:
- border border-white/5 
- glass-dark 
- rounded-lg p-6

Buttons:
- Primary: border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20
- Secondary: border-white/5 bg-black/40 text-white/80

Inputs:
- border-white/5 
- bg-black/40 
- focus:ring-emerald-500/30
- placeholder:text-white/20

Status Indicators:
- Active: bg-emerald-500 shadow-lg shadow-emerald-500/50
- Inactive: bg-white/20

## Typography

Font Families:
- Monospace: font-mono (for technical text, terminal-style elements)
- Sans: font-sans (for general UI text)

Text Sizes:
- Headers: text-lg to text-3xl
- Body: text-sm
- Status: text-xs

## Effects

Glow Effects:
- terminal-glow: box-shadow: 0 0 20px rgba(34, 197, 94, 0.1)

Glass Effect:
- backdrop-filter: blur(10px)
- gradient background with reduced opacity

## Layout

Container:
- container mx-auto px-4

Grid System:
- Panels: grid gap-6 md:grid-cols-2
- Tech specs: grid gap-6 md:grid-cols-3

Spacing:
- Panel padding: p-6
- Vertical spacing: space-y-1.5
- Section margins: mb-12

## Responsive Design

Breakpoints:
- sm: 640px (font sizes, button text)
- md: 768px (grid layouts)
- lg: 1024px (search bar text)

## Interactive States

Hover:
- Buttons: hover:bg-emerald-500/20
- Links: hover:text-white/90

Focus:
- Inputs: focus:ring-1 focus:ring-emerald-500/30
- Buttons: focus:outline-none focus:ring-2

## Reusable Classes

Terminal Text:
- font-mono text-sm text-emerald-400/[opacity]

Panel Headers:
- text-lg font-mono text-emerald-400/90 mb-4

Status Text:
- text-sm text-emerald-400/70

## Animation

Transitions:
- transition-colors (for color changes)
- transition-opacity (for hover states)
- transition-transform (for interactive elements)

## Best Practices

1. Use opacity values consistently:
   - /90 for primary content
   - /70 for secondary content
   - /50 for tertiary content
   - /30 for subtle accents
   - /10 for backgrounds

2. Maintain consistent spacing:
   - Use p-6 for panel padding
   - Use gap-6 for grid gaps
   - Use space-y-1.5 for stacked elements

3. Glass effect usage:
   - Apply to container elements
   - Combine with subtle borders
   - Use with dark backgrounds

4. Typography hierarchy:
   - Use monospace for technical/terminal text
   - Use sans-serif for UI elements
   - Maintain consistent sizing scale

5. Interactive elements:
   - Always include hover states
   - Use emerald accents for primary actions
   - Maintain consistent focus states