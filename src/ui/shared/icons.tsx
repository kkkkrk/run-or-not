/*
 * 시안 아이콘 — design/v32.html 스크립트 1절의 I에서 그림(path)과 크기 · 굵기를 그대로 옮긴 것.
 * 화면을 만든 U에서 쓰는 것만 있다 (U2: 꺾쇠 · 새로고침 · 위치 화살표, U3: − + · 다시 시도 · 열차 그림).
 * 나머지(검색 · 하단 캡슐 …)는 그 화면을 만드는 U에서 더한다.
 *
 * props가 없어서 컴포넌트가 아니라 「그림 조각」이다. {chevronLeft}처럼 중괄호로 그대로 넣는다.
 * 색은 글자색(currentColor)을 따르고, 옆 글자가 뜻을 말하므로 화면 낭독기에는 읽히지 않게 한다 (aria-hidden).
 * display: block — 글자 줄 안에 놓이면 아래에 빈틈이 생겨서, 어디에 넣어도 그림 크기 그대로 자리를 차지하게 한다.
 */

/** 역명판 왼쪽 칸의 ‹ (14px) */
export const chevronLeft = (
    <svg
        className="block flex-none"
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M15 5l-7 7 7 7" />
    </svg>
);

/** 역명판 오른쪽 칸의 › · 「승강장까지」 줄 끝의 › (14px) */
export const chevronRight = (
    <svg
        className="block flex-none"
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M9 5l7 7-7 7" />
    </svg>
);

/** 새로고침 글자 버튼의 ↻ (12px) */
export const refreshArrow = (
    <svg
        className="block flex-none"
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
    </svg>
);

/**
 * 위치 화살표 — 내 위치로 계산 중이라는 표시. 쓰는 곳마다 크기가 달라서 크기를 받는다.
 * 「승강장까지」 앞은 11px (결정.md 1절). 시트 버튼 13 · 확인 중 한 줄 14 · 승강장까지 몇 분? 버튼 16은 U3 · U7에서 쓴다
 */
export const locationArrow = (size: number) => (
    <svg
        className="block flex-none"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M3 11L21 3l-8 18-2-8-8-2z" />
    </svg>
);

/** 시트의 − (18px) */
export const minus = (
    <svg
        className="block flex-none"
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        aria-hidden="true"
    >
        <path d="M5 12h14" />
    </svg>
);

/** 시트의 + (18px) */
export const plus = (
    <svg
        className="block flex-none"
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        aria-hidden="true"
    >
        <path d="M12 5v14M5 12h14" />
    </svg>
);

/** 막다른 화면의 흰 면 버튼 「다시 시도」 · 「다시 받기」 앞의 ↻ (15px) */
export const retry = (
    <svg
        className="block flex-none"
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
    </svg>
);

/** 「열차가 없어요」 카드의 열차 그림 (26px) */
export const trainOff = (
    <svg
        className="block flex-none"
        width={26}
        height={26}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <rect x={4} y={3} width={16} height={15} rx={3} />
        <path d="M4 11h16M8 15h.01M16 15h.01M7 18l-2 3M17 18l2 3" />
    </svg>
);
