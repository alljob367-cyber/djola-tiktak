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

const themes = [
  { name: 'default', label: 'Clair', icon: Sun, color: 'bg-white border border-gray-200' },
  { name: 'dark', label: 'Sombre', icon: Moon, color: 'bg-gray-900' },
  { name: 'emerald', label: 'Emeraude', icon: Palette, color: 'bg-emerald-100' },
  { name: 'ocean', label: 'Océan', icon: Palette, color: 'bg-blue-100' },
  { name: 'sunset', label: 'Coucher de soleil', icon: Palette, color: 'bg-orange-100' },
  { name: 'rose', label: 'Rose', icon: Palette, color: 'bg-pink-100' },
  { name: 'midnight', label: 'Minuit', icon: Moon, color: 'bg-indigo-900' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

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
