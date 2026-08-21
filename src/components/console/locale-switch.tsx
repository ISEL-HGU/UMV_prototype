"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

const LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

export function LocaleSwitch() {
  const tc = useTranslations("common");
  const current = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label={tc("language")}
            className="text-console-bar-foreground/80 hover:text-console-bar-foreground hover:bg-white/10"
          >
            <Languages className="size-4" aria-hidden />
            {LABELS[current]}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => choose(locale)}
            disabled={locale === current}
          >
            {LABELS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
