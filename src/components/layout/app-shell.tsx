"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calculator,
  ChevronDown,
  Database,
  FileText,
  History,
  LayoutDashboard,
  LineChart,
  ListChecks,
  PieChart,
  Plug,
  RefreshCw,
  Settings,
  ShieldCheck,
  Upload,
  WalletCards
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const navGroups = [
  {
    label: "개요",
    icon: LayoutDashboard,
    items: [{ href: "/dashboard", label: "대시보드", icon: LayoutDashboard }]
  },
  {
    label: "포트폴리오",
    icon: WalletCards,
    items: [
      { href: "/onboarding", label: "온보딩", icon: Calculator },
      { href: "/assets", label: "자산 등록", icon: WalletCards },
      { href: "/target-portfolio", label: "목표 포트폴리오", icon: PieChart }
    ]
  },
  {
    label: "기록/분석",
    icon: FileText,
    items: [
      { href: "/snapshots", label: "스냅샷", icon: History },
      { href: "/reports", label: "리포트", icon: FileText },
      { href: "/trends", label: "추이", icon: LineChart }
    ]
  },
  {
    label: "리밸런싱",
    icon: RefreshCw,
    items: [
      { href: "/rebalance", label: "수동 리밸런싱", icon: ListChecks },
      { href: "/rebalance/history", label: "수동 이력", icon: History },
      { href: "/rebalancing", label: "자동 대시보드", icon: RefreshCw },
      { href: "/rebalancing/settings", label: "자동 설정", icon: Settings },
      { href: "/rebalancing/rules", label: "자동 규칙", icon: Settings },
      { href: "/rebalancing/history", label: "자동 이력", icon: History },
      { href: "/rebalancing/audit", label: "감사 로그", icon: FileText }
    ]
  },
  {
    label: "거래",
    icon: ShieldCheck,
    items: [{ href: "/trading", label: "거래 보조", icon: ShieldCheck }]
  },
  {
    label: "데이터/연동",
    icon: Database,
    items: [
      { href: "/settings/data-sources", label: "데이터 설정", icon: Database },
      { href: "/import/assets", label: "자산 가져오기", icon: Upload },
      { href: "/import/csv", label: "CSV 가져오기", icon: Upload },
      { href: "/import/history", label: "가져오기 이력", icon: History },
      { href: "/connections/broker", label: "증권사 연결", icon: Plug },
      { href: "/connections/broker/sync", label: "잔고 동기화", icon: RefreshCw },
      { href: "/connections/logs", label: "연동 로그", icon: History }
    ]
  },
  {
    label: "알림",
    icon: Bell,
    items: [
      { href: "/notifications", label: "알림 목록", icon: Bell },
      { href: "/settings/notifications", label: "알림 설정", icon: Settings }
    ]
  }
];

const navItems = navGroups.flatMap((group) => group.items);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeHref = navItems
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const activeGroupLabel = navGroups.find((group) =>
    group.items.some((item) => item.href === activeHref)
  )?.label;
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    activeGroupLabel ? [activeGroupLabel] : ["개요"]
  );

  useEffect(() => {
    if (!activeGroupLabel) return;
    setOpenGroups((current) =>
      current.includes(activeGroupLabel)
        ? current
        : [...current, activeGroupLabel]
    );
  }, [activeGroupLabel]);

  function toggleGroup(label: string) {
    setOpenGroups((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-white/90 backdrop-blur md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex h-full flex-col gap-4 px-4 py-4">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-mint text-white">
              <BarChart3 size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-bold text-ink">
                Yield Balance
              </span>
              <span className="block text-sm text-neutral-500">
                자산군 기준 인컴 포트폴리오 계산
              </span>
            </span>
          </Link>

          <nav
            aria-label="주요 메뉴"
            className="flex gap-3 overflow-x-auto pb-1 md:min-h-0 md:flex-1 md:flex-col md:gap-4 md:overflow-y-auto md:overflow-x-hidden md:pb-0 md:pr-1"
          >
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              const groupActive = group.items.some(
                (item) => activeHref === item.href
              );
              const open = openGroups.includes(group.label);
              return (
                <section key={group.label} className="min-w-56 shrink-0 md:min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={open}
                    className={`mb-2 flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-bold transition ${
                      groupActive
                        ? "bg-teal-50 text-mint"
                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                    }`}
                  >
                    <GroupIcon size={15} aria-hidden="true" />
                    <span className="flex-1">{group.label}</span>
                    <ChevronDown
                      size={15}
                      aria-hidden="true"
                      className={`transition ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open ? (
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = activeHref === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition md:w-full ${
                              active
                                ? "border-mint bg-mint text-white"
                                : "border-transparent bg-white text-neutral-700 hover:border-mint hover:text-mint"
                            }`}
                          >
                            <Icon size={16} aria-hidden="true" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
