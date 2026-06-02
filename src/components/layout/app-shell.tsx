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

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
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
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
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
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
