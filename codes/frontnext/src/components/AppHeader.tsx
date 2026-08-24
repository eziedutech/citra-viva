"use client";

import Link from "next/link";

import { AccountButton } from "@/components/AccountButton";
import { Icon } from "@/components/Icon";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import type { Dictionary, Locale } from "@/lib/i18n";

interface Props {
  dict: Dictionary;
  locale: Locale;
  /** Which page is showing, so its own link is marked rather than offered. */
  current: "defense" | "claims";
}

/**
 * The one bar across the top of every page.
 *
 * It was previously assembled inside each page's own column, which put the
 * brand at a different horizontal position on every route and left the account
 * control floating in the middle of the reading measure. A full width bar fixes
 * both, and pinning it means a student two thousand words into a manuscript can
 * still see whose account the draft is going into.
 */
export function AppHeader({ dict, locale, current }: Props) {
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "text-caption flex h-14 items-center border-b-2 px-1 transition-colors duration-150",
        active
          ? "border-[color:var(--color-primary-500)] text-[color:var(--color-ink-900)]"
          : "border-transparent text-[color:var(--color-ink-600)] hover:text-[color:var(--color-ink-900)]",
      ].join(" ")}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center gap-8 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-[color:var(--color-primary-700)]"
        >
          <Icon name="shield" size={20} />
          <span className="text-body-sm font-medium tracking-[-0.01em]">
            {dict.app.name}
          </span>
        </Link>

        <nav aria-label={dict.nav.label} className="flex items-center gap-6">
          {tab("/", dict.nav.defense, current === "defense")}
          {tab("/klaim", dict.nav.claims, current === "claims")}
        </nav>

        <span className="ml-auto flex items-center gap-3">
          <AccountButton dict={dict} />
          <LocaleSwitch locale={locale} dict={dict} />
        </span>
      </div>
    </header>
  );
}
