'use client';

/** The logo's own proportions, so a height is all a caller ever passes. */
const RATIO = 460 / 215;

interface Props {
  /** Rendered height in pixels. Width follows from the artwork. */
  height?: number;
  className?: string;
}

/**
 * The CITRA Viva wordmark.
 *
 * A plain image rather than the optimizer: it is one small file that appears on
 * every page and never changes, so there is nothing to optimize and one less
 * moving part between the container and a header that renders.
 *
 * It carries the product name as its alt text, which is why nothing beside it
 * repeats the name in type. A logo and its own name side by side reads as a
 * placeholder that was never finished.
 */
export function Wordmark({ height = 22, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/citra-viva-logo.png"
      alt="CITRA Viva"
      width={Math.round(height * RATIO)}
      height={height}
      className={className}
      style={{ height, width: 'auto' }}
    />
  );
}
