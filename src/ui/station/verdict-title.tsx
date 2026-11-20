import type { ReactNode } from "react";
import type { VerdictKind, VerdictTitleProps } from "@/types/ui";

/** 판정 글자 6종 (결정.md 4절). 「탈 열차가 아직 안 보여요」만 두 줄이고 크기는 다른 판정 글자와 같다 */
const TITLE: Record<VerdictKind, ReactNode> = {
    walk: "걸어도 돼요",
    slow: "천천히 걸어요",
    run: "지금 뛰어요!",
    tight: "빨리 뛰어봐요!",
    "keep-walking": (
        <>
            탈 열차가
            <br />
            아직 안 보여요
        </>
    ),
    empty: "열차가 없어요",
};

/**
 * 판정 글자 — 역명판 아래 가장 큰 글자 (결정.md 4절, v32 CSS 5절 .verdict · .title).
 * 글자 크기 · 굵기 · 자간 · 줄 높이는 text-verdict 토큰 하나에 들어 있다 (높이 844 화면에서 48.5px). 여백은 좌우 18px · 위 6px.
 * 화면 틀(세로 flex) 안에 놓인다: mt-auto가 아래 캐릭터 무대의 mb-auto와 짝이 되어, 둘이 한 덩어리로 세로 가운데에 온다.
 * 판정 글자는 색 화면(상태색 · 회색)에만 나오므로 글자는 늘 흰색이다.
 * aria-live: 시간이 지나 판정이 바뀌면(걸어도 돼요 → 지금 뛰어요!) 화면 낭독기가 바뀐 글자를 읽어 준다.
 */
export function VerdictTitle({ verdict }: VerdictTitleProps) {
    return (
        <h1 aria-live="polite" className="mt-auto flex-none px-4.5 pt-1.5 text-center text-verdict text-on-ink">
            {TITLE[verdict]}
        </h1>
    );
}
