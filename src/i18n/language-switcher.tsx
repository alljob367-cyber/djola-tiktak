'use client';

// ============================================================
// LanguageSwitcher — sélecteur de langue (drapeaux)
// Compact : convient header landing, sidebar dashboard, page publique
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { LANGS, LOCALES } from './index';
import { useI18n } from './provider';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = LOCALES[lang];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
      >
        {compact ? (
          <Languages className="size-4 text-muted-foreground" />
        ) : (
          <span aria-hidden>{current.flag}</span>
        )}
        {!compact && <span>{current.nativeName}</span>}
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 min-w-[170px] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {LANGS.map((code) => {
            const meta = LOCALES[code];
            const active = code === lang;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setLang(code); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted'
                }`}
              >
                <span aria-hidden className="text-base">{meta.flag}</span>
                <span className="flex-1">{meta.nativeName}</span>
                {active && <Check className="size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
