"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calculator,
  ChevronDown,
  CircleHelp,
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
    items: [
      {
        href: "/dashboard",
        label: "대시보드",
        icon: LayoutDashboard,
        description:
          "자산, 배당, 리밸런싱 상태를 한 화면에서 요약해 보는 시작 화면입니다."
      }
    ]
  },
  {
    label: "포트폴리오",
    icon: WalletCards,
    items: [
      {
        href: "/onboarding",
        label: "온보딩",
        icon: Calculator,
        description:
          "초기 자산군, 투자 목표, 위험 기준을 설정하는 안내 화면입니다."
      },
      {
        href: "/assets",
        label: "자산 등록",
        icon: WalletCards,
        description: "보유 자산과 계좌, 배당 정보를 등록하고 수정합니다."
      },
      {
        href: "/target-portfolio",
        label: "목표 포트폴리오",
        icon: PieChart,
        description:
          "자산군별 목표 비중을 설정해 리밸런싱 기준으로 사용합니다."
      }
    ]
  },
  {
    label: "기록/분석",
    icon: FileText,
    items: [
      {
        href: "/snapshots",
        label: "스냅샷",
        icon: History,
        description:
          "월별 자산 상태를 저장하고 과거 시점의 포트폴리오를 비교합니다."
      },
      {
        href: "/reports",
        label: "리포트",
        icon: FileText,
        description:
          "월간 배당, 자산 변화, 목표 대비 차이를 리포트로 확인합니다."
      },
      {
        href: "/trends",
        label: "추이",
        icon: LineChart,
        description:
          "자산군 비중과 배당 흐름 변화를 시간 흐름에 따라 확인합니다."
      }
    ]
  },
  {
    label: "리밸런싱",
    icon: RefreshCw,
    items: [
      {
        href: "/rebalance",
        label: "수동 리밸런싱",
        icon: ListChecks,
        description:
          "현재 보유 비중과 목표 비중의 차이를 기준으로 직접 조정안을 계산합니다."
      },
      {
        href: "/rebalance/history",
        label: "수동 이력",
        icon: History,
        description:
          "수동 리밸런싱으로 계산하거나 저장한 조정 기록을 확인합니다."
      },
      {
        href: "/rebalancing",
        label: "자동 대시보드",
        icon: RefreshCw,
        description:
          "자동 리밸런싱 규칙, 드리프트, 실행 후보를 종합해서 확인합니다."
      },
      {
        href: "/rebalancing/settings",
        label: "자동 설정",
        icon: Settings,
        description:
          "자동 리밸런싱의 실행 주기, 임계값, 승인 방식을 설정합니다."
      },
      {
        href: "/rebalancing/rules",
        label: "자동 규칙",
        icon: Settings,
        description:
          "자산군별 드리프트 허용치와 자동 계획 생성 규칙을 관리합니다."
      },
      {
        href: "/rebalancing/history",
        label: "자동 이력",
        icon: History,
        description: "자동 리밸런싱 계획과 실행 결과의 과거 기록을 확인합니다."
      },
      {
        href: "/rebalancing/audit",
        label: "감사 로그",
        icon: FileText,
        description: "자동 리밸런싱 판단, 승인, 실행 이벤트를 추적합니다."
      }
    ]
  },
  {
    label: "거래",
    icon: ShieldCheck,
    items: [
      {
        href: "/trading",
        label: "거래 보조",
        icon: ShieldCheck,
        description:
          "개인용 주문 후보를 검토하고 안전 게이트를 통과한 거래만 진행하도록 돕습니다."
      }
    ]
  },
  {
    label: "데이터/연동",
    icon: Database,
    items: [
      {
        href: "/settings/data-sources",
        label: "데이터 설정",
        icon: Database,
        description: "가격, 배당, 외부 데이터 원천과 동기화 방식을 설정합니다."
      },
      {
        href: "/import/assets",
        label: "자산 가져오기",
        icon: Upload,
        description: "외부 파일이나 기존 데이터를 이용해 자산 목록을 가져옵니다."
      },
      {
        href: "/import/csv",
        label: "CSV 가져오기",
        icon: Upload,
        description: "CSV 파일로 자산, 거래, 배당 데이터를 일괄 등록합니다."
      },
      {
        href: "/import/history",
        label: "가져오기 이력",
        icon: History,
        description: "가져오기 작업의 결과, 오류, 처리 내역을 확인합니다."
      },
      {
        href: "/connections/broker",
        label: "증권사 연결",
        icon: Plug,
        description: "증권사 연동 계정을 등록하고 연결 상태를 관리합니다."
      },
      {
        href: "/connections/broker/sync",
        label: "잔고 동기화",
        icon: RefreshCw,
        description: "연결된 증권사 계좌의 보유 잔고를 앱 데이터와 맞춥니다."
      },
      {
        href: "/connections/logs",
        label: "연동 로그",
        icon: History,
        description: "외부 연동과 동기화 요청의 처리 상태와 오류를 확인합니다."
      }
    ]
  },
  {
    label: "알림",
    icon: Bell,
    items: [
      {
        href: "/notifications",
        label: "알림 목록",
        icon: Bell,
        description:
          "드리프트, 배당, 동기화 등 확인이 필요한 알림을 모아 봅니다."
      },
      {
        href: "/settings/notifications",
        label: "알림 설정",
        icon: Settings,
        description: "알림 종류, 기준, 수신 여부를 조정합니다."
      }
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
  const [activeHelpHref, setActiveHelpHref] = useState<string | null>(null);

  useEffect(() => {
    if (!activeGroupLabel) return;
    setOpenGroups((current) =>
      current.includes(activeGroupLabel)
        ? current
        : [...current, activeGroupLabel]
    );
  }, [activeGroupLabel]);

  useEffect(() => {
    setActiveHelpHref(null);
  }, [pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  }

  function toggleHelp(href: string) {
    setActiveHelpHref((current) => (current === href ? null : href));
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
                        const helpOpen = activeHelpHref === item.href;
                        const helpId = `nav-help-${
                          item.href.slice(1).replace(/\//g, "-") || "home"
                        }`;
                        return (
                          <div key={item.href}>
                            <div
                              className={`flex h-9 shrink-0 items-center rounded-md border text-sm font-medium transition md:w-full ${
                                active
                                  ? "border-mint bg-mint text-white"
                                  : "border-transparent bg-white text-neutral-700 hover:border-mint hover:text-mint"
                              }`}
                            >
                              <Link
                                href={item.href}
                                className="flex min-w-0 flex-1 items-center gap-2 px-3"
                              >
                                <Icon size={16} aria-hidden="true" />
                                <span className="truncate">{item.label}</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => toggleHelp(item.href)}
                                aria-expanded={helpOpen}
                                aria-controls={helpId}
                                aria-label={`${item.label} 도움말`}
                                className={`mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                                  active
                                    ? "text-white hover:bg-white/15"
                                    : "text-neutral-400 hover:bg-neutral-100 hover:text-mint"
                                }`}
                              >
                                <CircleHelp size={15} aria-hidden="true" />
                              </button>
                            </div>
                            {helpOpen ? (
                              <p
                                id={helpId}
                                className="mt-1 rounded-md border border-line bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-600"
                              >
                                {item.description}
                              </p>
                            ) : null}
                          </div>
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
