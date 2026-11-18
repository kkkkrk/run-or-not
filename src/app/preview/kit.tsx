import Link from "next/link";
import type { ReactNode } from "react";
import type { BottomNavProps } from "@/types/ui";

/*
 * 미리보기 묶음들이 같이 쓰는 틀 — 휴대폰 칸 · 보드 제목 · 묶음 제목 · 콘솔 로그 (U2 미리보기에 있던 것을 U3에서 여기로 옮겼다).
 * 화면 컴포넌트(src/ui)가 아니라 미리보기 페이지의 꾸밈이다. 여기 있는 것은 전부 미리보기에서만 쓴다.
 */

/** 콜백이 불렸다는 것을 콘솔에 남긴다 (plan.md U2 확인 「누르면 콘솔에 콜백 로그」) */
export const log = (where: string, what: string) => console.log(`[미리보기 ${where}] ${what}`);

/**
 * 하단 캡슐에 넘기는 값. 주소는 미리보기 안에서 돈다 — 탭을 누르면 그 탭의 화면 한 장만 크게 보기로 간다
 * (역 찾기 자리 · 눌러 보는 판정 화면 · 눌러 보는 설정 화면). 그래서 한 장만 크게 볼 때는 캡슐로 세 화면을 오갈 수 있다.
 * 실제 주소(/ · /station/… · /settings)는 페이지가 넘긴다
 */
export const BOTTOM_NAV: BottomNavProps = {
    active: "verdict",
    searchHref: "/preview?screen=search",
    verdictHref: "/preview?screen=demo",
    settingsHref: "/preview?screen=settings",
};

/**
 * 휴대폰 크기 칸 (390 × 844, 작은 화면은 375 × 667 — v32의 .phone).
 * 화면 틀은 원래 브라우저 화면 높이(100dvh)를 쓴다. 여러 장을 한 페이지에 늘어놓으려고
 * 이 칸 안에서만 틀(<main>)의 높이를 칸 높이로 덮어쓴다 ([&>main]:h-full!).
 * 글자 · 캐릭터 크기(cqh)는 틀의 높이를 따르므로 그 크기 휴대폰에서 보는 것과 같다.
 *
 * contain-layout: 설정 시트는 화면 틀 밖에서 position: fixed로 「화면 전체」에 깔린다 (src/ui/settings/setting-sheet.tsx).
 * 이 칸이 그 화면이 되게 한다 — layout 가두기를 건 상자는 안쪽 fixed의 기준이 된다. 없으면 설정 시트가 전부 브라우저 창 바닥에 붙는다.
 * (크기 클래스의 숫자 × 4 = px: w-97.5 h-211 = 390 × 844, w-93.75 h-166.75 = 375 × 667)
 */
export function Phone({ small, children }: { small: boolean; children: ReactNode }) {
    return (
        <div
            className={`relative flex-none overflow-hidden contain-layout shadow-[0_0_0_1px_rgb(15_23_42/0.12),0_10px_28px_rgb(15_23_42/0.12)] [&>main]:h-full! ${
                small ? "h-166.75 w-93.75 rounded-[26px]" : "h-211 w-97.5 rounded-[30px]"
            }`}
        >
            {children}
        </div>
    );
}

export function BoardTitle({ name, note }: { name: string; note: string }) {
    return (
        <h4 className="mb-2 text-14 font-extrabold">
            {name}
            {note && <small className="block text-12 font-semibold text-sub">{note}</small>}
        </h4>
    );
}

/**
 * 이 화면 하나만 실제 페이지처럼 브라우저 가득 띄운다 — DevTools 390 · 375 폭과 PC 폭에서 볼 때.
 * 글자는 작게 두고 누르는 영역만 위아래 14px · 좌우 8px 넓혀 44px를 넘긴다 (::after)
 */
export function FullLink({ id }: { id: string }) {
    return (
        <Link
            href={`/preview?screen=${id}`}
            className="relative mt-2 inline-block text-12 font-bold text-sub underline underline-offset-[3px] after:absolute after:-inset-x-2 after:-inset-y-3.5"
        >
            이 화면만 크게 보기 (?screen={id})
        </Link>
    );
}

export function Group({ title, note, children }: { title: string; note: string; children: ReactNode }) {
    return (
        <section className="mt-11">
            <h3 className="text-16 font-extrabold">{title}</h3>
            <p className="mt-0.5 mb-4 max-w-245 text-13 font-semibold text-sub">{note}</p>
            {children}
        </section>
    );
}

/** 보드를 옆으로 늘어놓고, 자리가 모자라면 다음 줄로 */
export const WRAP = "flex flex-wrap items-start gap-x-6 gap-y-9";

/** 화면 틀 없이 부품만 놓는 칸에 주는 글자 기본값 — 화면 틀이 주는 것과 같다 (15px · 줄 높이 1.4 · 자간 −0.015em) */
export const PART_BASE = "text-15 leading-body tracking-body break-keep";

/**
 * 미리보기 조절 버튼 (처음으로 · 상태 켜고 끄기). 보이는 높이는 32px이고 누르는 영역만 위아래 6px씩 넓혀 44px (::after).
 * 켜진 상태(aria-pressed)는 검정 면
 */
export const CONTROL =
    "relative h-8 cursor-pointer rounded-full border border-line bg-surface px-3 text-12 font-bold text-sub after:absolute after:inset-x-0 after:-inset-y-1.5 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white";

/** 주소의 ?screen= 이름이 틀렸을 때 */
export function UnknownScreen({ id }: { id: string }) {
    return (
        <div className="p-5 text-15 text-ink">
            <p className="font-bold">「{id}」라는 미리보기 화면이 없어요.</p>
            <Link href="/preview" className="mt-2 inline-block underline underline-offset-[3px]">
                미리보기로 돌아가기
            </Link>
        </div>
    );
}
