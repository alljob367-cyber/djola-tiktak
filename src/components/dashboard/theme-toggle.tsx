'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

const THEME_DEFS = [
  { name: 'default', icon: Sun, color: 'bg-white border border-gray-200' },
  { name: 'dark', icon: Moon, color: 'bg-gray-900' },
  { name: 'emerald', icon: Palette, color: 'bg-emerald-100' },
  { name: 'ocean', icon: Palette, color: 'bg-blue-100' },
  { name: 'sunset', icon: Palette, color: 'bg-orange-100' },
  { name: 'rose', icon: Palette, color: 'bg-pink-100' },
  { name: 'midnight', icon: Moon, color: 'bg-indigo-900' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const themes = THEME_DEFS.map((d) => ({ ...d, label: t.dashboard.themes[d.name === 'default' ? 'light' : (d.name as 'dark' | 'emerald' | 'ocean' | 'sunset' | 'rose' | 'midnight')] }));
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- détection de montage standard
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
        <Sun size={18} />
      </Button>
    );
  }

  const currentTheme = themes.find((t) => t.name === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <CurrentIcon size={18} />
          <span className="sr-only">Changer le thème</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <p className="text-xs font-medium text-muted-foreground px-2 pb-2">Thème</p>
        <div className="grid grid-cols-1 gap-1">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.name;
            return (
              <button
                key={t.name}
                onClick={() => setTheme(t.name)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <div className={cn('h-5 w-5 rounded-full border', t.color, isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
