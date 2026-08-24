'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom';
type Align = 'start' | 'center' | 'end';

/** The bubble's width, and the gap it keeps from the edge of the window. */
const WIDTH = 264;
const MARGIN = 8;

interface Props {
  /** One or two sentences. What this label means, or what to do with it. */
  text: string;
  /** Preferred side. Flipped automatically when that side has no room. */
  side?: Side;
  /** Preferred alignment. Adjusted automatically to stay inside the window. */
  align?: Align;
  className?: string;
}

interface Placement {
  top: number;
  left: number;
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
 * It opens on hover and on keyboard focus, and it is a real button rather than
 * a `title` attribute: `title` never appears on touch, cannot be styled, and
 * arrives too late to be read as part of the label.
 *
 * The bubble is rendered into `document.body` rather than beside the icon. This
 * app is built from panels that scroll independently, and a panel that scrolls
 * is a panel that clips: positioned normally, a hint in the sidebar was cut off
 * by the transcript beside it, and one in the right-hand panel was cut off by
 * the edge of the window. Nothing inside a clipping ancestor can escape it, so
 * the bubble leaves the ancestor entirely and is placed against the window.
 */
export function Hint({ text, side = 'bottom', align = 'start', className }: Props) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [mounted, setMounted] = useState(false);

  const anchor = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);

  // A portal needs a document, which the server render does not have.
  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const trigger = anchor.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const height = bubble.current?.offsetHeight ?? 0;
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);

    // Sideways: start from the requested alignment, then pull it back inside
    // the window. Clamping after choosing keeps the preference where there is
    // room, and stops the bubble leaving the screen where there is not.
    const preferred =
      align === 'end'
        ? rect.right - width
        : align === 'center'
          ? rect.left + rect.width / 2 - width / 2
          : rect.left;
    const left = Math.min(Math.max(preferred, MARGIN), window.innerWidth - width - MARGIN);

    // Vertically: the requested side unless it does not fit, then the other.
    // Below a label near the foot of the window, a bubble would otherwise open
    // into nothing.
    const below = rect.bottom + MARGIN;
    const above = rect.top - height - MARGIN;
    const fitsBelow = below + height <= window.innerHeight - MARGIN;
    const fitsAbove = above >= MARGIN;

    const top =
      side === 'top' ? (fitsAbove ? above : below) : fitsBelow ? below : fitsAbove ? above : below;

    setPlacement({ top, left });
  }, [align, side]);

  // Measured after the bubble exists but before the browser paints it, so it
  // never appears in the wrong place and then jumps.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!anchor.current?.contains(target) && !bubble.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function reposition() {
      place();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // Capture, because the scroll that moves the label belongs to a panel
    // rather than the window, and a scroll event on an inner element does not
    // bubble up to it.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, place]);

  return (
    <span className={['relative inline-flex align-middle', className ?? ''].join(' ')}>
      <button
        ref={anchor}
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

      {open && mounted
        ? createPortal(
            <span
              ref={bubble}
              role="tooltip"
              aria-hidden="true"
              style={{
                top: placement?.top ?? 0,
                left: placement?.left ?? 0,
                width: WIDTH,
                maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
                // Hidden until measured. One frame in the corner of the screen
                // is a flicker every reader would notice.
                visibility: placement ? 'visible' : 'hidden',
              }}
              className={[
                'pointer-events-none fixed z-[100] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 shadow-[0_6px_20px_rgba(31,39,51,0.14)]',
                // Every inherited text property is reset. These sit beside
                // headings that are uppercase and letter spaced, beside medium
                // weight labels, and inside coloured status lines, and a
                // tooltip has to read as running prose in all of them.
                'text-caption text-left leading-[1.5] font-normal normal-case tracking-normal text-[color:var(--color-ink-600)]',
              ].join(' ')}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
