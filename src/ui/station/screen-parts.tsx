import { Character } from "@/ui/character/character";

/*
 * 역 화면들이 같이 쓰는 자리와 조각 — 판정 화면 · 막다른 화면 4종 · 「승강장까지 몇 분?」 · 로딩 (v32 screen()).
 * 어느 화면이든 화면 틀 안에서 세로 순서가 같다: 판정 글자 자리 → 캐릭터 무대 → 카드 자리.
 * 그 세 자리의 크기 · 여백을 여기 한 곳에만 적어서, 화면이 바뀌어도(로딩 → 판정) 내용이 위아래로 밀리지 않게 한다.
 *
 * 컴포넌트가 아니라 클래스 글자와 「그림 조각」이다 (props 타입은 ui.ts에 있는 것만 쓰고, children을 받는 컴포넌트는 틀 둘뿐이라서).
 * 크기 클래스의 숫자 × 4 = 시안의 px.
 */

/**
 * 판정 글자 자리 (v32 CSS 5절 .verdict): 좌우 18px · 위 6px · 가운데 맞춤.
 * mt-auto가 아래 캐릭터 무대의 mb-auto와 짝이 되어, 둘이 한 덩어리로 남는 높이의 가운데에 온다.
 * 판정 화면의 VerdictTitle은 <h1>에 같은 값을 직접 갖고 있다 (verdict-title.tsx)
 */
export const TITLE_AREA = "mt-auto flex-none px-4.5 pt-1.5 text-center";

/**
 * 캐릭터 무대 (v32 CSS 6절 .stage): 높이는 화면 높이의 24%(120 ~ 215px)이고 캐릭터는 그 높이에 맞춰 커진다. 바닥에 붙여 세운다.
 * 캐릭터가 없는 화면(로딩)도 이 자리는 비워 둔다
 */
export const STAGE =
    "relative mb-auto flex h-[clamp(120px,24cqh,215px)] flex-none items-end justify-center overflow-hidden";

/**
 * 카드 자리 (v32 CSS 7절 .cardwrap): 좌우 · 위 16px, 안의 것끼리 7 ~ 10px 띄운다.
 * 아래 76px(pb-19)는 하단 캡슐이 떠 있을 자리다 (캡슐 56px + 바닥 12px + 틈 8px).
 * 화면이 낮아 다 안 들어가면 이 자리만 따로 스크롤된다 — 카드가 캡슐 밑으로 지나가게 여백을 스크롤되는 안쪽에 둔다. 스크롤 막대는 숨긴다
 */
export const CARD_AREA =
    "scrollbar-none flex min-h-0 flex-initial flex-col gap-[clamp(7px,1.2cqh,10px)] overflow-y-auto px-4 pt-4 pb-19 *:shrink-0 [&::-webkit-scrollbar]:hidden";

/**
 * 서 있는 캐릭터가 선 무대 — 판정이 없는 화면(막다른 화면 4종 · 「승강장까지 몇 분?」)이 같이 쓴다 (결정.md 3절).
 * 색은 캐릭터가 화면 틀에서 알아서 읽는다: 회색 화면에서는 흰 사람, 흰 화면에서는 회색 사람
 */
export const standingStage = (
    <div className={STAGE}>
        <Character pose="stand" />
    </div>
);

/** 빠른 선택 칩의 값(초) — 3 · 5 · 7 · 10분. 「승강장까지」 시트와 「승강장까지 몇 분?」 화면이 같이 쓴다 (결정.md 1절) */
const CHIP_SECONDS = [180, 300, 420, 600];

/** 칩 네 개를 한 줄에 같은 폭으로, 사이 6px (v32 CSS 10절 .chips) */
export const CHIP_ROW = "grid grid-cols-4 gap-1.5";

/**
 * 칩 네 개 (v32 CSS 10절 .chip): 높이 46px · 모서리 12px · 옅은 면 + 짙은 글자 14.5px. 고른 칩은 검정 면 + 흰 글자.
 * 누르면 그 칩의 초를 onSelect로 알리기만 한다.
 *
 * pressedSec — 검정으로 칠할 칩의 초.
 *   숫자: 그 값과 같은 칩을 칠한다 (같은 칩이 없으면 아무것도 안 칠한다)
 *   null: 아무것도 안 칠한다 (지금 값이 내 위치로 계산한 값일 때)
 *   안 넘김: 「고른 칩」이라는 개념이 없는 곳 — 「승강장까지 몇 분?」 화면. aria-pressed도 붙이지 않는다
 */
export const timeChips = (onSelect: (sec: number) => void, pressedSec?: number | null) =>
    CHIP_SECONDS.map((sec) => (
        <button
            key={sec}
            type="button"
            aria-pressed={pressedSec === undefined ? undefined : pressedSec === sec}
            onClick={() => onSelect(sec)}
            className="flex h-11.5 cursor-pointer items-center justify-center rounded-[12px] bg-fill text-14.5 font-bold tracking-normal text-ink aria-pressed:bg-ink aria-pressed:text-white"
        >
            {`${sec / 60}분`}
        </button>
    ));
