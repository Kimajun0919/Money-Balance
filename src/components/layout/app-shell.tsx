"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calculator,
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
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/onboarding", label: "온보딩", icon: Calculator },
  { href: "/assets", label: "자산 등록", icon: WalletCards },
  { href: "/snapshots", label: "스냅샷", icon: History },
  { href: "/reports", label: "리포트", icon: FileText },
  { href: "/target-portfolio", label: "목표 포트폴리오", icon: PieChart },
  { href: "/rebalance", label: "리밸런싱", icon: ListChecks },
  { href: "/rebalancing", label: "자동 리밸런싱", icon: RefreshCw },
  { href: "/rebalancing/rules", label: "자동 규칙", icon: Settings },
  { href: "/trading", label: "거래 보조", icon: ShieldCheck },
  { href: "/rebalance/history", label: "이력", icon: History },
  { href: "/trends", label: "추이", icon: LineChart },
  { href: "/notifications", label: "알림", icon: Bell },
  { href: "/settings/notifications", label: "알림 설정", icon: Settings },
  { href: "/settings/data-sources", label: "데이터", icon: Settings },
  { href: "/import/assets", label: "가져오기", icon: Upload },
  { href: "/import/history", label: "가져오기 이력", icon: History },
  { href: "/connections/broker", label: "증권사", icon: Plug },
  { href: "/connections/logs", label: "연동 로그", icon: History }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeHref = navItems
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

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
            className="flex gap-2 overflow-x-auto pb-1 md:min-h-0 md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto md:overflow-x-hidden md:pb-0 md:pr-1"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition md:w-full ${
                    active
                      ? "border-mint bg-mint text-white"
                      : "border-line bg-white text-neutral-700 hover:border-mint hover:text-mint"
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                </Link>
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
