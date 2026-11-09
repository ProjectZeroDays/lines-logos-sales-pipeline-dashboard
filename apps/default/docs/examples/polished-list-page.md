# Example: a polished list page

This page is a worked example of a calm, finished list or status page. It
follows the look of `status.taskade.com`, a Genesis app. It is one option, not
the required look: take the parts that fit the app and the user's request. Do
not copy the words or the field names: build your own page from the user's
data and names.

What it shows:

- **One narrow column with a fixed rhythm.** `max-w-2xl`, then `mt-8`,
  `space-y-6` and `mt-12` between the main blocks.
- **Thin, quiet surfaces.** Cards use `border-border/60` and `bg-card/40`. A
  section header is a `bg-muted/30` strip. Rows divide with
  `border-b last:border-b-0` and highlight with `hover:bg-muted/30`. Inside a
  `Stagger`, each `StaggerItem` wraps one row, so `last:` matches every row:
  put `divide-y divide-border/60` on the `Stagger` instead.
- **Two text tiers.** `text-foreground` for names and headings, and full
  `text-muted-foreground` for detail, labels and meta text. Text that a person
  must read never gets an alpha: an alpha of `/70` or lower on
  `text-muted-foreground` fails contrast. Use an alpha (`/60`, `/50`) only on icons, dividers and decoration.
  Meta text is `text-[11px]`. A group label is uppercase with
  `tracking-widest`.
- **A top-to-bottom entrance.** `Reveal` with `delay` 0, 0.05 and 0.15 for the
  header, the summary and the list, and the footer last. Rows enter with a
  `Stagger` of 40 ms (`step={0.04}`). A collapsed group opens with `Collapse`.
- **Every state designed.** A skeleton that has the shape of the page, a calm
  error card with a "Try again" button, and a "Last updated" line with a
  refresh button.
- **Status colors from roles that always mean the same thing.** Good is
  `text-primary` on `bg-primary/10`, bad is `text-destructive` on
  `bg-destructive/10`, and warn or idle is `text-muted-foreground` with a dot.
  The label says the state, so the color only supports it. Do not use a
  `chart-*` slot for status: a palette gives the chart slots no status meaning,
  so "green" can be amber or gray after a retheme. Never use a literal palette
  class (AGENTS.md rule 5).

The motion helpers come from `@/lib/genesis-motion` (`docs/02_theming.md`,
"Motion"). They honor reduced motion, so the page needs no own check.

```tsx
import { useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, RefreshCw } from '@/lib/icons';
import { Collapse, Reveal, Stagger, StaggerItem } from '@/lib/genesis-motion';
import { cn } from '@/lib/utils';

/**
 * Reference page: a calm list page (the look of status.taskade.com, a Genesis app).
 * Copy the structure, not the words. The polish comes from five habits:
 * 1. One narrow column (`max-w-2xl`) with a fixed rhythm: `mt-8`, `space-y-6`, `mt-12`.
 * 2. Tonal surfaces: `bg-card/40` cards with `border-border/60`, a `bg-muted/30` header strip,
 *    rows split by `border-b last:border-b-0`, and `hover:bg-muted/30`.
 * 3. Two text tiers: `text-foreground` > full `text-muted-foreground`. Alpha only on decoration.
 * 4. A top-to-bottom entrance: header, verdict, list (`delay` 0, 0.05, 0.15), footer last.
 * 5. Every state designed: a skeleton shaped like the list, an error card with retry,
 *    and a "Last updated" line with a refresh button.
 * Atmosphere stays a hint here (a 3% wash): a data tool reads as calm, not as a poster.
 * Status colors come from theme roles that always mean the same thing (`primary` = good,
 * `destructive` = bad, `muted-foreground` = warn or idle), never from `chart-*` slots or
 * literal palette classes, so a retheme and dark mode keep them right.
 */

type Tone = 'good' | 'warn' | 'bad' | 'idle';

const TONE: Record<Tone, { dot: string; text: string; label: string }> = {
  good: { dot: 'bg-primary', text: 'bg-primary/10 text-primary', label: 'On track' },
  warn: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'At risk' },
  bad: { dot: 'bg-destructive', text: 'bg-destructive/10 text-destructive', label: 'Blocked' },
  idle: { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', label: 'Not started' },
};

export interface ListRow {
  id: string;
  name: string;
  detail?: string;
  tone: Tone;
  secondary?: boolean;
}

interface PolishedListPageProps {
  title: string;
  verdict: string;
  rows: ListRow[];
  loading: boolean;
  error: string | null;
  updatedAt: Date;
  onRefresh: () => void;
}

export function PolishedListPage(props: PolishedListPageProps) {
  const { title, verdict, rows, loading, error, updatedAt, onRefresh } = props;
  const primary = rows.filter((row) => row.secondary !== true);
  const secondary = rows.filter((row) => row.secondary === true);

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent"
      />
      <div className="relative mx-auto max-w-2xl px-5 py-8 md:py-12">
        <Reveal>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
        </Reveal>

        <main className="mt-8 space-y-6">
          {loading ? (
            <ListSkeleton />
          ) : error != null ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="mb-2 text-sm font-medium text-destructive">Could not load the list</p>
              <p className="mb-4 text-xs text-muted-foreground">{error}</p>
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-xs font-medium transition-colors hover:bg-muted/40 active:scale-[0.98]"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          ) : (
            <>
              <Reveal delay={0.05}>
                <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-[15px] font-semibold text-primary-foreground shadow-[0_12px_40px_-16px_hsl(var(--primary)/0.6)]">
                  {verdict}
                </div>
              </Reveal>
              <Reveal delay={0.15}>
                <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
                  <h2 className="border-b border-border/60 bg-muted/30 px-5 py-3.5 text-sm font-semibold text-foreground">
                    Items
                  </h2>
                  <Stagger step={0.04} className="divide-y divide-border/60">
                    {primary.map((row) => (
                      <StaggerItem key={row.id}>
                        <Row row={row} />
                      </StaggerItem>
                    ))}
                  </Stagger>
                  {secondary.length > 0 && <Group label="More" rows={secondary} />}
                </section>
              </Reveal>
            </>
          )}
        </main>

        <Reveal delay={0.4} className="mt-12 flex items-center justify-center gap-2 pb-8">
          <p className="text-[11px] tabular-nums text-muted-foreground">
            Last updated {updatedAt.toLocaleTimeString()}
          </p>
          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-muted/40 disabled:opacity-40"
          >
            <RefreshCw
              className={cn('h-3 w-3 text-muted-foreground/60', loading && 'animate-spin')}
            />
          </button>
        </Reveal>
      </div>
    </div>
  );
}

function Row({ row }: { row: ListRow }) {
  const tone = TONE[row.tone];
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5 transition-colors duration-200 last:border-b-0 hover:bg-muted/30">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <span className={cn('h-2.5 w-2.5 rounded-full', tone.dot)} />
          {row.tone === 'good' && (
            <span
              className={cn(
                'absolute h-2.5 w-2.5 rounded-full opacity-40 motion-safe:animate-ping',
                tone.dot,
              )}
            />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
          {row.detail != null && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{row.detail}</p>
          )}
        </div>
      </div>
      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', tone.text)}>
        {tone.label}
      </span>
    </div>
  );
}

function Group({ label, rows }: { label: string; rows: ListRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border/60">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between bg-muted/20 px-5 py-3 transition-colors hover:bg-muted/40"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
          {label}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-300',
            open && 'rotate-180',
          )}
        />
      </button>
      <Collapse open={open}>
        {rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </Collapse>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 rounded-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border/40">
        <div className="border-b border-border/40 px-5 py-3.5">
          <Skeleton className="h-4 w-28" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-b border-border/20 px-5 py-3.5 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
```
