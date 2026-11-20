import Link from "next/link";
import type { ReactNode } from "react";
import type { BottomNavProps, BottomNavTab } from "@/types/ui";
import { bolt, home, sliders } from "./icons";

/** 탭 셋 — 왼쪽부터 역 찾기 · 판정 · 설정 (결정.md 1절, v32 bottomNav()) */
const TABS: { tab: BottomNavTab; name: string; icon: ReactNode }[] = [
    { tab: "search", name: "역 찾기", icon: home },
    { tab: "verdict", name: "판정", icon: bolt },
    { tab: "settings", name: "설정", icon: sliders },
];

/** 탭 한 칸: 아이콘(20px) 아래 2px 띄우고 이름(11px · 굵기 700 · 자간 −0.02em). 칸 높이는 캡슐 56 − 안쪽 여백 4 × 2 − 테두리 1 × 2 = 46px */
const TAB = "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-full";

/** 현재 탭 — 옅은 면 하나로만 표시한다. 흰 화면에서는 옅은 회색 면 + 짙은 글자, 색 화면에서는 흰색 16% 면 + 흰 글자 */
const CURRENT = "bg-on-surface text-on-ink in-data-[tone=white]:bg-fill in-data-[tone=white]:text-ink";
/** 갈 수 있는 다른 탭 — 흐린 글자 */
const IDLE = "text-on-faint in-data-[tone=white]:text-faint";
/**
 * 꺼진 탭(갈 곳 없음) — 흐린 글자보다 한 단계 더 흐리게.
 * 흰 화면: #CBD5E1 = 시트의 꺼진 − + 와 같은 색 (v32 CSS 10절 .pm:disabled).
 * 색 화면: 흰색 22% = 색 화면의 구분선 색. 흰 화면의 #CBD5E1과 바탕 대비가 비슷하다(약 1.5:1).
 * 꺼진 탭 그림은 결정.md에도 v32에도 없어서 이미 있는 두 값을 가져다 썼다 (2026-11-18 영준 확인)
 */
const OFF = "text-on-line in-data-[tone=white]:text-[#CBD5E1]";

/**
 * 하단 플로팅 캡슐 3탭 — 역 찾기 · 판정 · 설정 (결정.md 1절, v32 CSS 8절 .bottom-nav · .nav-item).
 * 주소 셋을 받아 링크로 그린다. 어느 탭이 현재인지(active)도 받는다 — 주소 표시줄을 읽지 않는다.
 *
 * 탭마다 모습은 셋 가운데 하나다.
 *   현재 탭           옅은 면. 주소가 있으면 링크이고(aria-current="page"), 없으면 글자만 — 어느 쪽이든 모습은 같다 (2026-11-18 영준 확인)
 *   갈 수 있는 탭      흐린 글자 링크
 *   꺼진 탭(주소 null) 더 흐린 글자. 링크가 아니라서 눌러도 아무 일도 없고 Tab으로도 멈추지 않는다.
 *                     화면 낭독기에는 「판정 · 링크 · 사용할 수 없음」으로 전해진다 (role="link" + aria-disabled)
 * 주소가 null일 수 있는 것은 판정 탭뿐이다 (아직 본 역이 없을 때 — ui.ts BottomNavProps).
 *
 * 현재 탭도 링크라서 누르면 받은 주소로 간다. 그 주소가 지금 주소와 같으면 아무 일도 없다(새로 불러오지 않고 화면의 값도 그대로다).
 * 다르면 — 예: 지금은 /station/…?dir=down인데 받은 주소에 ?dir가 없으면 — 그 주소로 옮겨 가서 방면이 바뀐다.
 * 그래서 현재 탭의 주소는 지금 화면의 주소 그대로 넘겨야 한다 (주소를 만드는 쪽 = 페이지가 맞춘다).
 *
 * 색은 화면 틀의 data-tone을 본다 (역명판과 같은 약속): 색 화면(기본)은 검정 20% 바탕 + 흰 글자,
 * 흰 화면(in-data-[tone=white]:…)은 흰색 88% 바탕 + 짙은 글자. 바탕이 살짝 비치고 뒤로 지나가는 내용은 흐려진다(blur 16px).
 *
 * 이 컴포넌트는 캡슐 모양만 그린다. 화면 바닥에 띄우는 것(바닥에서 12px · 좌우 16px)은 화면 틀이 한다 (screen-frame.tsx).
 * 틀 밖에 둘 때는 조상 어딘가에 data-tone이 있어야 색이 맞는다 — 흰 화면이면 data-tone="white".
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: h-14 = 56px, p-1 = 4px, gap-0.5 = 2px.
 */
export function BottomNav({ active, searchHref, verdictHref, settingsHref }: BottomNavProps) {
    const hrefs: Record<BottomNavTab, string | null> = {
        search: searchHref,
        verdict: verdictHref,
        settings: settingsHref,
    };

    return (
        <nav
            aria-label="하단 메뉴"
            className="grid h-14 grid-cols-3 rounded-full border border-on-capsule-line bg-on-capsule p-1 leading-body shadow-[0_8px_24px_rgb(15_23_42/0.12)] backdrop-blur-lg in-data-[tone=white]:border-capsule-line in-data-[tone=white]:bg-capsule"
        >
            {TABS.map(({ tab, name, icon }) => {
                const href = hrefs[tab];
                const current = tab === active;
                const content = (
                    <>
                        {icon}
                        <span className="text-nav">{name}</span>
                    </>
                );

                if (href === null) {
                    return (
                        <span
                            key={tab}
                            role="link"
                            aria-disabled="true"
                            aria-current={current ? "page" : undefined}
                            className={`${TAB} ${current ? CURRENT : OFF}`}
                        >
                            {content}
                        </span>
                    );
                }

                return (
                    <Link
                        key={tab}
                        href={href}
                        aria-current={current ? "page" : undefined}
                        className={`${TAB} ${current ? CURRENT : IDLE}`}
                    >
                        {content}
                    </Link>
                );
            })}
        </nav>
    );
}
