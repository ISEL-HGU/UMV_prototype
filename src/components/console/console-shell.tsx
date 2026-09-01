"use client";

import {
  Bug,
  CircleHelp,
  Clock,
  LayoutDashboard,
  Monitor,
  Search,
  Settings,
  Shuffle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState, useTransition, type ComponentType } from "react";

import { LocaleSwitch } from "@/components/console/locale-switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavId =
  | "overview"
  | "malware"
  | "integrity"
  | "logInspection"
  | "settings"
  | "updates"
  | "overrides";

const NAV: { id: NavId; icon: ComponentType<{ className?: string }> }[] = [
  { id: "overview", icon: LayoutDashboard },
  { id: "malware", icon: Bug },
  { id: "integrity", icon: Monitor },
  { id: "logInspection", icon: Search },
  { id: "settings", icon: Settings },
  { id: "updates", icon: Clock },
  { id: "overrides", icon: Shuffle },
];

type TabId =
  | "general"
  | "smartProtection"
  | "advanced"
  | "quarantined"
  | "events";

const TABS: TabId[] = [
  "general",
  "smartProtection",
  "advanced",
  "quarantined",
  "events",
];

/**
 * 콘솔 외곽. 네비게이션과 탭은 프로토타입 단계라 활성 표시만 바꾸고,
 * Events 화면만 실제 내용을 렌더링한다.
 */
export function ConsoleShell({
  computerName,
  children,
}: {
  computerName: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("console");
  const tc = useTranslations("common");
  const [nav, setNav] = useState<NavId>("malware");
  const [tab, setTab] = useState<TabId>("events");
  const [, startTransition] = useTransition();

  const showEvents = nav === "malware" && tab === "events";

  return (
    <div className="flex h-dvh flex-col">
      <header className="bg-console-bar text-console-bar-foreground flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Image
            src="/umv_zyon_logo.png"
            alt=""
            width={16}
            height={16}
            className="size-4 shrink-0"
          />
          <span>
            {t("computer")}: {computerName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <LocaleSwitch />
          <Button
            variant="ghost"
            size="sm"
            className="text-console-bar-foreground/80 hover:text-console-bar-foreground hover:bg-white/10"
          >
            <CircleHelp className="size-4" aria-hidden />
            {tc("help")}
          </Button>
        </div>
      </header>
      <div className="bg-console-accent h-1 shrink-0" />

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t("nav.malware")}
          className="bg-console-sidebar w-56 shrink-0 overflow-y-auto border-r py-3"
        >
          {NAV.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={nav === id ? "page" : undefined}
              onClick={() => startTransition(() => setNav(id))}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm",
                "hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                nav === id && "bg-background font-semibold",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  nav === id
                    ? "text-severity-malware"
                    : "text-muted-foreground",
                )}
                aria-hidden
              />
              {t(`nav.${id}`)}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 pb-4">
          <div
            role="tablist"
            aria-label={t("tabs.events")}
            className="flex gap-6 border-b pt-3"
          >
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => startTransition(() => setTab(id))}
                className={cn(
                  "border-b-[3px] border-transparent px-0.5 pt-1.5 pb-2 text-sm",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  tab === id && "border-foreground font-bold",
                )}
              >
                {t(`tabs.${id}`)}
              </button>
            ))}
          </div>

          {showEvents ? (
            children
          ) : (
            <p className="text-muted-foreground py-16 text-sm">
              {t("placeholder")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
