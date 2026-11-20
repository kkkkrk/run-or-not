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
 * 「승강장까지」 시트가 붙는 화면(판정 화면 · 열차가 없어요)의 카드 자리 — 시트가 열려 있는 동안에는 카드를 숨긴다.
 *
 * 왜: 시트는 열차 카드를 덮어야 하는데(결정.md 1절) 시트 높이는 300px로 정해져 있다(v32). 카드가 224px(= 300 − 하단 캡슐 자리 76)보다 높으면
 * 위쪽이 시트 위로 남는다 — 줄이 셋인 카드(탈 열차가 아직 안 보여요: 못 타는 두 줄 + 대기 줄, 261px)에서 「승강장까지」 줄이 37px 보였다.
 * 시트를 카드에 맞춰 키우지 않은 까닭: 시트가 열려 있어도 판정은 1초마다 다시 계산돼서, 줄이 셋이 되는 순간 시트 높이가 혼자 튄다
 * (± 를 누르고 있는 손가락 밑에서도). 시트는 늘 같은 높이로 두고 뒤의 카드를 숨기면 아무것도 움직이지 않는다.
 * 줄이 둘 이하인 카드는 원래 시트에 다 가려져 있어서 달라지는 게 없다.
 *
 * 어떻게 숨기나: 투명하게만 한다 (opacity 0). visibility나 display로 숨기지 않는다 — 시트를 연 「승강장까지」 줄이 이 카드 안에 있어서,
 * 그렇게 숨기면 그 버튼에 있던 포커스가 풀려 버리고 시트를 닫았을 때 돌아갈 자리를 잃는다 (움직임을 줄이는 설정에서 실제로 겪음).
 * 투명한 카드는 눌리지 않는다: 시트가 열려 있는 동안은 시트의 바깥 층이 화면 전체를 덮고 있다.
 *
 * 언제 숨나: 시트가 다 올라오는 때(0.26초)에 맞춰서 — 0.14초 뒤부터 0.12초 동안 흐려진다. 그 전에 숨기면 시트가 올라오는 동안
 * 카드 자리가 비어 보인다. 닫힐 때는 바로 보인다 (시트가 내려가며 카드가 드러난다). 움직임을 줄이는 설정이면 시트처럼 바로 바뀐다.
 */
export const cardAreaUnderSheet = (sheetOpen: boolean) =>
    sheetOpen
        ? `${CARD_AREA} opacity-0 transition-opacity delay-140 duration-120 ease-linear motion-reduce:transition-none`
        : CARD_AREA;

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
