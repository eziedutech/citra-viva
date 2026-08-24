'use client';

import { useEffect, useRef, useState } from 'react';

type Side = 'top' | 'bottom';
type Align = 'start' | 'center' | 'end';

interface Props {
  /** One or two sentences. What this label means, or what to do with it. */
  text: string;
  /** Which way the bubble opens. Use `top` inside a bar pinned to the bottom. */
  side?: Side;
  /**
   * Where the bubble sits relative to the icon. `end` near a right margin,
   * `center` inside a narrow column such as the sidebar, where a bubble hung
   * from either edge of a small icon leaves the column entirely.
   */
  align?: Align;
  className?: string;
}

/**
 * The small (i) beside a label.
 *
 * Every heading and every field in this interface names something that carries
 * a rule behind it: what a severity actually measures, why a quote is verified,
 * why a gap is only recorded after a chance to clarify. Those rules are the
 * product. Hiding them in documentation nobody opens wastes them, and printing
 * them all on the page buries the manuscript the student came to work on.
 *
 * So it opens on hover and on keyboard focus, and it is a real button rather
 * than a `title` attribute: `title` never appears on touch, cannot be styled,
 * and arrives too late to be read as part of the label.
 */
export function Hint({ text, side = 'bottom', align = 'start', className }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);

  // Tapping opens it on touch, where there is no hover. That leaves it open,
  // so a tap anywhere else and the Escape key both have to close it.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span ref={wrap} className={['relative inline-flex align-middle', className ?? ''].join(' ')}>
      <button
        type="button"
        // The hint itself is the accessible name. A generic "more information"
        // would make every one of these identical to a screen reader, and the
        // text is already the shortest true description of the control.
        aria-label={text}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
        className="flex h-[18px] w-[18px] items-center justify-center rounded-[var(--radius-chip)] text-[color:var(--color-ink-400)] transition-colors duration-150 hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-primary-700)]"
      >
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="9.25" />
          <path d="M12 11.25v5" />
          <path d="M12 7.75h.01" />
        </svg>
      </button>

      {open ? (
        <span
          role="tooltip"
          aria-hidden="true"
          className={[
            'pointer-events-none absolute z-50 w-[264px] max-w-[calc(100vw-2rem)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 shadow-[0_6px_20px_rgba(31,39,51,0.14)]',
            // Every inherited text style is reset. These sit beside headings
            // that are uppercase and letter spaced, beside medium weight
            // labels, and inside coloured status lines, and a tooltip has to
            // read as running prose in all of them.
            'text-caption text-left leading-[1.5] font-normal normal-case tracking-normal text-[color:var(--color-ink-600)]',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0',
          ].join(' ')}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
