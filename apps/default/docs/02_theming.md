# 02 - Theming

All color flows through CSS variables in `src/index.css`. Components reference
semantic Tailwind classes; re-theming rewrites the variables, never the
components. A baked-in literal color survives a theme swap and clashes - zero
palette classes (`bg-blue-500`), zero raw hex/rgb/hsl in component source.

## Semantic tokens

Defined as HSL triples on `:root` (light) and `.dark` (dark) in `src/index.css`:

| Classes | Use for |
|---|---|
| `bg-background text-foreground` | page default |
| `bg-card text-card-foreground` | cards, panels |
| `bg-primary text-primary-foreground` | primary buttons, emphasis |
| `bg-secondary text-secondary-foreground` | secondary elements |
| `bg-muted text-muted-foreground` | subtle/disabled, secondary text |
| `bg-accent text-accent-foreground` | highlights, hover states |
| `bg-destructive text-destructive-foreground` | delete/error |
| `border-border`, `ring-ring` | borders, focus rings |
| `bg-popover text-popover-foreground` | menus, popovers |

`--radius` controls corner rounding. Sidebar-specific vars (`--sidebar-*`)
exist for the `ui/sidebar` primitive.

## Chart tokens

Five categorical colors: `--chart-1` ... `--chart-5`, exposed as
`bg-chart-N` / `text-chart-N` classes and as `'hsl(var(--chart-N))'` values
for Recharts series (via a `ChartConfig` with `ui/chart`).

Class names MUST appear verbatim in `.tsx` source - the Tailwind JIT content
scan cannot see a computed `` `bg-chart-${n}` ``. Map indexes to literals:

```tsx
const CHART_BG = { 1: 'bg-chart-1', 2: 'bg-chart-2', 3: 'bg-chart-3',
                   4: 'bg-chart-4', 5: 'bg-chart-5' } as const;
```

## Dark mode + ThemeProvider contract

- `main.tsx` pre-mounts next-themes' `ThemeProvider` with `attribute="class"`,
  `enableSystem={false}`. Do NOT mount a second provider.
- The mode a first-time visitor sees comes from `--genesis-default-theme` in
  the `:root` block of `src/index.css`: `dark` (the template value, and the
  default when the property is absent) or `light`. A light-first app sets
  `--genesis-default-theme: light;`. A mode the visitor picked later wins. Do
  not call `setTheme` on mount to pick the first mode: the app renders once
  before the provider mounts, so that call is lost.
- Legacy apps (generated before template 2.3.4) that already mount their own
  `ThemeProvider` in the app tree keep working: the `ThemeGate` in `main.tsx`
  detects that provider and stays out of the way, so their theme config wins.
  Do not copy that pattern into new code.
- Dark mode = the `.dark` class on `<html>`; every token flips automatically.
  Never write per-component `dark:` color overrides for tokens - they already
  flip.
- Build toggles with `useTheme()` (from `next-themes`, or the
  `@/hooks/use-theme` shim which re-exports it):

```tsx
const { theme, setTheme } = useTheme();
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
```

- `color-scheme` is paired with the theme in `index.css` so native scrollbars
  and form controls match.

## Interface defaults (`src/styles/genesis-base.css`, read-only)

Ships the template's floor: focus-visible rings on controls that declare none,
`touch-action`/tap-highlight on interactive elements, heading
`scroll-margin-top` + `text-wrap`, a themed native `<select>`, thin scrollbars
in `--muted-foreground` inside the agent chat panel, and a reduced-motion
transition reset. Every selector is specificity 0, so any class you write wins.
Do not edit it and do not restate its rules in your components.

## Customizing a theme

Change the app's look by rewriting variable VALUES in `src/index.css` (both
`:root` and `.dark` blocks), keeping the variable names. Components need no
edits. Keep foreground/background pairs at readable contrast in both modes.

Theme tokens live only in the `:root` and `.dark` blocks inside `@layer base`
in `src/index.css`. Change their values there, never in a new rule. The Theme &
Brand panel reads and writes only those two blocks, so a token set anywhere
else locks the owner out of it. For an app the owner wants light only, write
the light values into both blocks.

## Fonts

The app uses the system font stack by default. The families below are
options: pick one when the look of the app or the user asks for a typeface.

`src/lib/genesis-fonts.ts` (read-only, imported by `main.tsx`) declares six
variable web fonts. A browser downloads a family only when a font token names
it, so a family that no token names costs nothing. The platform turns the web
fonts on per environment. Where they are off, a font token renders its
fallback stack, so end each token with one.

| Family name in CSS | Use for |
|---|---|
| `'Inter Variable'` | neutral interface text |
| `'Geist Variable'` | technical product interface |
| `'Space Grotesk Variable'` | bold display headings |
| `'Nunito Variable'` | rounded, friendly, playful |
| `'Fraunces Variable'` | editorial serif headings |
| `'JetBrains Mono Variable'` | code, data, terminals |

Set the tokens in the `:root` theme block of `src/index.css` (`.dark`
inherits them). Use one or two families per app:

```css
--font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
--font-display: 'Fraunces Variable', ui-serif, Georgia, serif;
--font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
```

`font-sans` (body text), `font-display` (headings) and `font-mono` read these
tokens. `font-display` falls back to `--font-sans` when the app sets no
`--font-display`. No other font package is installed, so an import of one
loads nothing or fails the build, and a family name outside this table renders
the fallback stack.

## Motion

`@/lib/genesis-motion` holds the motion helpers: `Reveal`, `Stagger` with
`StaggerItem`, `Presence`, `HoverLift`, `SavePulse` and `Collapse`. They use one
timing (a spring with no bounce, about 350 ms) and drop their movement when the person
asked for reduced motion, so a page needs no own `useReducedMotion` check.
`main.tsx` also wraps the app in `<MotionConfig reducedMotion="user">`, so
your own framer-motion animations drop their transform and layout movement
for that person too.

```tsx
<Stagger className="grid gap-4 sm:grid-cols-3">
  {items.map((item) => (
    <StaggerItem key={item.id}>
      <HoverLift>
        <Card>...</Card>
      </HoverLift>
    </StaggerItem>
  ))}
</Stagger>
```

`Presence` animates keyed children in and out: a list where rows are added
and removed, or one page or section keyed by its route (`mode="wait"`).
`SavePulse` plays a short pulse each time its `pulseKey` changes, for example
the id of the row that a save returned. `Collapse` opens and closes a section
by its height when `open` changes, for a disclosure or a group of rows under a
header button. Put padding on its children, not on `Collapse`.

```tsx
<button aria-expanded={open} onClick={() => setOpen((value) => !value)}>More</button>
<Collapse open={open}>
  {rows.map((row) => <Row key={row.id} row={row} />)}
</Collapse>
```

For a full page that uses these helpers together (the entrance order, the row
stagger, a skeleton, an error card and a collapsed group), read
`docs/examples/polished-list-page.md`.

## Editor theme bridge (do not touch)

`src/lib/theme-bridge.ts` (wired in `main.tsx`) listens for
`TASKADE_THEME_UPDATE` postMessages from the parent Taskade editor and injects
live variable overrides for `:root` and `.dark` (explicit dark values when the
editor sends them, else values derived from the light ones). It also reports
its version and the light or dark mode on screen, so the editor's theme panel
edits the palette the preview shows. It is why the variable names above are
load-bearing: the editor's theme panel writes them. Renaming or hardcoding
around them breaks live re-theming.
