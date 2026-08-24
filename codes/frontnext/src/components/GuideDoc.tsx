'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import type { Dictionary } from '@/lib/i18n';

const CITRA_URL = 'https://citra.eziedutech.dev';
const REPO_URL = 'https://github.com/eziedutech/citra-viva';
const TERMS_URL = 'https://cloud.google.com/terms/';

interface Props {
  dict: Dictionary;
}

/**
 * The guide, as a document with its contents down the side.
 *
 * Vertical tabs rather than one long page: a person arriving with a specific
 * question ("can it hear me", "why was my finding dropped") should reach the
 * answer without reading past six sections they did not ask about, and a person
 * reading it through still gets the order the sections are written in.
 *
 * The selected section is written to the address bar, so a section can be sent
 * to someone. It is read back on arrival, which is what makes that link work.
 */
export function GuideDoc({ dict }: Props) {
  const sections = dict.guide.sections;
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const wanted = window.location.hash.replace('#', '');
    if (sections.some((section) => section.id === wanted)) setActive(wanted);
  }, [sections]);

  function select(id: string) {
    setActive(id);
    // replaceState rather than a hash assignment: setting the hash scrolls the
    // page to whatever it matches, and here the panel is already in view.
    window.history.replaceState(null, '', `#${id}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = sections.findIndex((section) => section.id === active);
    const last = sections.length - 1;

    const next =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? Math.min(index + 1, last)
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? Math.max(index - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;

    if (next < 0 || next === index) return;
    event.preventDefault();
    select(sections[next].id);
    tabs.current[next]?.focus();
  }

  const current = sections.find((section) => section.id === active) ?? sections[0];
  if (!current) return null;

  // Three sections end in somewhere else, and the destination is the point of
  // the section rather than a decoration on it: the parent product, the terms
  // that actually govern what happens to a manuscript, and the source. Kept as
  // a lookup so a section carrying no link renders nothing extra.
  const outbound: Record<string, { href: string; label: string }> = {
    what: { href: CITRA_URL, label: dict.landing.familyLink },
    privacy: { href: TERMS_URL, label: dict.guide.termsLink },
    tech: { href: REPO_URL, label: dict.guide.repoLink },
  };
  const link = outbound[current.id];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-10">
      <header className="mb-8 max-w-[68ch]">
        <h1 className="text-display mb-3">{dict.guide.heading}</h1>
        <p className="text-body-lg text-[color:var(--color-ink-600)]">{dict.guide.lede}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={dict.guide.contents}
          onKeyDown={onKeyDown}
          className="h-max border-t border-[color:var(--color-line)] lg:sticky lg:top-20"
        >
          <p className="text-micro px-1 py-3 tracking-[0.06em] text-[color:var(--color-ink-400)] uppercase">
            {dict.guide.contents}
          </p>

          {sections.map((section, index) => {
            const selected = section.id === active;
            return (
              <button
                key={section.id}
                ref={(element) => {
                  tabs.current[index] = element;
                }}
                role="tab"
                type="button"
                id={`tab-${section.id}`}
                aria-selected={selected}
                aria-controls={`panel-${section.id}`}
                // Only the selected tab is in the tab order. Arrow keys move
                // between them, which is how a tablist is expected to behave
                // and what stops eight stops appearing in a page's tab order.
                tabIndex={selected ? 0 : -1}
                onClick={() => select(section.id)}
                className={[
                  'text-body-sm flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors duration-150',
                  selected
                    ? 'border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-050)] font-medium text-[color:var(--color-primary-700)]'
                    : 'border-transparent text-[color:var(--color-ink-600)] hover:bg-[color:var(--color-hover)]',
                ].join(' ')}
              >
                <span className="text-micro w-5 shrink-0 tabular-nums text-[color:var(--color-ink-400)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {section.title}
              </button>
            );
          })}
        </div>

        <article
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          tabIndex={0}
          className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 lg:p-8"
        >
          <h2 className="text-h1 mb-3">{current.title}</h2>
          <p className="text-body-lg mb-8 max-w-[66ch] text-[color:var(--color-ink-600)]">
            {current.lead}
          </p>

          <dl className="space-y-6">
            {current.points.map((point) => (
              <div
                key={point.title}
                className="border-t border-[color:var(--color-line)] pt-5 first:border-t-0 first:pt-0"
              >
                <dt className="text-h3 mb-2">{point.title}</dt>
                <dd className="text-body max-w-[70ch] text-[color:var(--color-ink-600)]">
                  {point.body}
                </dd>
              </div>
            ))}
          </dl>

          {link ? (
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm mt-8 inline-flex items-center gap-[6px] text-[color:var(--color-primary-700)] underline underline-offset-2"
            >
              {link.label}
              <Icon name="external" size={15} />
            </a>
          ) : null}
        </article>
      </div>
    </div>
  );
}
