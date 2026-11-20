import type { ScreenFrameProps, ScreenTone } from "@/types/ui";
import { StationNameplate } from "@/ui/station/station-nameplate";
import { BottomNav } from "./bottom-nav";

/**
 * 화면 바탕색 (결정.md 2절) — 판정 화면은 화면 전체가 상태색 하나(플랫), 막다른 화면은 회색, 판정 전 · 설정 · 역 찾기는 흰 화면.
 * 색을 --screen-bg 변수에 담아서 바탕에도 칠하고, 안쪽의 캐릭터도 같은 값을 읽게 한다 (뒤쪽 팔다리 색에 섞는다 — character.module.css).
 * Tailwind가 클래스를 찾을 수 있게 완성된 글자로 적는다.
 */
const TONE: Record<ScreenTone, string> = {
    walk: "[--screen-bg:var(--color-walk)]",
    slow: "[--screen-bg:var(--color-slow)]",
    run: "[--screen-bg:var(--color-run)]",
    tight: "[--screen-bg:var(--color-tight)]",
    miss: "[--screen-bg:var(--color-miss)]",
    deadend: "[--screen-bg:var(--color-deadend)]",
    white: "[--screen-bg:var(--color-canvas)]",
};

/**
 * 화면 틀 — 화면 전체 바탕색 + 맨 위 역명판 + 맨 아래 하단 캡슐. 모든 화면 컴포넌트가 이 안에 내용을 넣는다
 * (결정.md 1절 · 2절, v32 CSS 3절 .screen · 8절 .bottom-nav). 페이지는 이 틀을 직접 쓰지 않는다.
 *
 * 안쪽 내용이 기대도 되는 것
 *   - 세로 flex: 위에서부터 역명판 → children 순서로 쌓인다
 *   - 높이는 브라우저 화면 높이(100dvh)로 고정이고 넘치는 것은 잘린다. 스크롤은 안쪽(열차 카드 자리)이 따로 한다
 *     자르는 방식은 overflow: clip — 틀 자체는 어떤 식으로도 스크롤되지 않는다. hidden은 눈에는 잘려 보여도 브라우저가 스크롤할 수는 있어서,
 *     닫힌 시트(틀 바닥 아래에 내려가 있다)로 포커스가 갈 때 화면이 통째로 밀려 올라간다 (U3에서 실제로 겪음: 시트가 올라오는 도중에 Tab).
 *     clip을 모르는 옛 브라우저(사파리 15 이하)는 hidden으로 남는다
 *   - @container-size: 글자 · 캐릭터 크기가 「화면 높이의 몇 %」(cqh)로 정해져 있어서, 이 틀이 그 기준이 된다
 *   - relative: 시트 · 하단 캡슐이 이 틀을 기준으로 바닥에 붙는다
 *   - data-tone: 역명판 · 캐릭터 · 하단 캡슐이 흰 화면인지 색 화면인지 이 값으로 안다
 *   - 글자: 15px · 줄 높이 1.4 · 자간 −0.015em · 낱말 단위 줄바꿈. 색 화면이면 흰색, 흰 화면이면 짙은 색
 *   - antialiased: 시안(v32)이 문서 전체에 걸어 둔 글자 다듬기. 맥 브라우저에서 색 위 흰 글자가 시안보다 두껍게 번져 보이지 않게 한다
 *     (휴대폰에서는 원래 이 방식이라 달라지는 게 없다)
 *
 * 하단 캡슐: 틀의 바닥에서 12px · 좌우 16px 띄워 놓는다 (높이 56px). 내용 위에 떠 있어서(z-10) 내용은 그 밑으로 지나간다.
 * 그 자리만큼은 화면마다 내용 아래쪽 여백으로 비워 둔다 — 역 화면 76px(station/screen-parts.tsx CARD_AREA), 설정 80px.
 * 시트(z-20)와 시트의 바깥 층(z-15)은 캡슐보다 위라서, 시트가 열리면 캡슐을 덮는다.
 * 문서 순서는 내용 다음이라 Tab은 역명판 → 내용 → 캡슐 순으로 간다.
 *
 * PC에서는 layout.tsx가 가운데 600px 칸 + 좌우 회색을 이미 만들어 주므로, 틀은 그 칸을 가득 채우기만 한다.
 */
export function ScreenFrame({ tone, nameplate, bottomNav, children }: ScreenFrameProps) {
    return (
        <main
            data-tone={tone}
            className={`@container-size relative flex h-dvh flex-col overflow-hidden bg-(--screen-bg) text-15 leading-body tracking-body break-keep antialiased supports-[overflow:clip]:overflow-clip ${
                tone === "white" ? "text-ink" : "text-on-ink"
            } ${TONE[tone]}`}
        >
            {nameplate && <StationNameplate {...nameplate} />}
            {children}
            {/* inset-x-4 bottom-3 = 좌우 16px · 바닥에서 12px (v32 .bottom-nav의 자리 값). 캡슐 모양은 BottomNav가 그린다 */}
            <div className="absolute inset-x-4 bottom-3 z-10">
                <BottomNav {...bottomNav} />
            </div>
        </main>
    );
}
