/**
 * Inline SVG icons, Lucide geometry.
 *
 * One set, never mixed with another. Inline rather than an icon font, so each
 * icon inherits `currentColor`, can be given an accessible name, and cannot
 * arrive as a box glyph when a font fails to load.
 *
 * Emoji are not used anywhere in this interface. They render differently on
 * every platform, cannot be recoloured, and read poorly to a screen reader.
 *
 * Stroke width is 1.5 so an icon never looks heavier than the text beside it,
 * which matters when the heaviest type in the system is 600.
 */

export type IconName =
  | 'check'
  | 'lock'
  | 'dot'
  | 'cpu'
  | 'quote'
  | 'alert'
  | 'send'
  | 'file'
  | 'shield'
  | 'history'
  | 'book'
  | 'mic'
  | 'square'
  | 'speaker'
  | 'plus'
  | 'external'
  | 'help'
  | 'chevronUp'
  | 'chevronDown';

const PATHS: Record<IconName, React.ReactNode> = {
  check: <polyline points="20 6 9 17 4 12" />,
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  dot: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </>
  ),
  // The marker for AI contribution. A processor, deliberately not a sparkle:
  // the sparkle has become the generic decoration for anything machine made.
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  quote: (
    <>
      <path d="M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M6 9c0-3 1.5-4.5 4-5" />
      <path d="M16 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M16 9c0-3 1.5-4.5 4-5" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  send: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1 1 0 0 1 1.6 0C14.6 3.8 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <path d="M12 18v4M8 22h8" />
    </>
  ),
  // Stop, not pause. Both recording and playback here end rather than suspend,
  // and a pause glyph would promise a resume that does not exist.
  square: <rect x="6" y="6" width="12" height="12" rx="1" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevronUp: <polyline points="18 15 12 9 6 15" />,
  chevronDown: <polyline points="6 9 12 15 18 9" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.7-2.6 2.7" />
      <path d="M12 17h.01" />
    </>
  ),
  external: (
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </>
  ),
  speaker: (
    <>
      <path d="M11 4 6 9H3v6h3l5 5Z" />
      <path d="M16 8.5a4.5 4.5 0 0 1 0 7" />
      <path d="M19 5.5a8.5 8.5 0 0 1 0 13" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /** Give a label to an icon that carries meaning on its own. Decorative icons
   *  stay unlabelled and are hidden from assistive technology. */
  label?: string;
}

export function Icon({ name, size = 18, className, label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
