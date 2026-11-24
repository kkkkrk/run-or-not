import type { RefreshButtonProps, StationNameplateProps, TrainRow, VerdictScreenProps } from "@/types/ui";

/*
 * U2 미리보기의 가짜 데이터 (plan.md U2 5)). 여기 있는 값은 전부 미리보기에서만 쓴다.
 *
 * 숫자는 design/v32.html의 그림(스크립트 3절 SCREENS · NEAR · FAR · MISSED, 4절 눌러지는 화면)과 같게 맞췄다.
 * 그래야 미리보기와 시안을 나란히 놓고 같은 글자끼리 비교할 수 있다.
 * 콜백(onSelect · onPress · onRefresh …)은 여기 없고, u2-verdict.tsx가 콘솔에 찍는 함수를 붙인다.
 * 호선 색(lineColor)은 결정.md 2절 「호선 색」 표의 값이다 — 카카오맵 노선도 색. U6(2026-11-20)에서 옛 공식 색을 바꿨다 (우이신설선은 그대로).
 */

export type Verdict = VerdictScreenProps["verdict"];
export type Station = Omit<StationNameplateProps, "onSelect">;
/** 「승강장까지」 줄의 값 — 콜백과 시트 열림만 뺀 것 */
export type Walk = { walkSec: number; runSec: number } & (
    | { source: "manual" }
    | { source: "location"; approximate: boolean }
);
export type Refresh = Pick<RefreshButtonProps, "elapsedSec" | "stale" | "refreshing">;
export type Trains = [TrainRow, ...TrainRow[]];

/** 판정 화면 한 장 */
export type ScreenCase = {
    id: string;        // 주소에 쓰는 이름 — /preview?screen=이 값
    name: string;      // 보드 제목
    note: string;      // 무엇을 보는 장인지
    small?: boolean;   // true면 375 × 667, 아니면 390 × 844
    station?: Station; // 없으면 건대입구
    verdict: Verdict;
    walk: Walk;
    trains: Trains;
    refresh: Refresh;
    pending?: boolean; // 대기 줄
};

/* ───────────────────────── 역 ───────────────────────── */

/** v32 그림의 역: 7호선 건대입구, 자양 방면을 고른 상태 */
export const KONKUK: Station = {
    stationName: "건대입구",
    lineName: "7호선",
    lineColor: "#727718",
    left: "어린이대공원",
    right: "자양",
    selected: "right",
};

/** 역명판만 따로 보는 줄. 왼쪽 · 오른쪽에 어느 방향을 둘지는 아직 안 정해서(결정.md 5절) 여기 배치는 보기용이다 */
export const NAMEPLATES: { name: string; note: string; station: Station }[] = [
    { name: "기본", note: "오른쪽(자양 방면)을 고름", station: KONKUK },
    { name: "왼쪽을 골랐을 때", note: "어린이대공원 방면", station: { ...KONKUK, selected: "left" } },
    {
        name: "긴 역명 (9자)",
        note: "7자 이상 → 가운데 14.5px · 양옆 12.5px",
        station: {
            stationName: "동대문역사문화공원",
            lineName: "2호선",
            lineColor: "#3CB44A",
            left: "을지로4가",
            right: "신당",
            selected: "right",
        },
    },
    {
        name: "긴 역명 + 긴 이웃 역",
        note: "8자 역명 옆에 6자 이웃 역",
        station: {
            stationName: "디지털미디어시티",
            lineName: "6호선",
            lineColor: "#B55E16",
            left: "월드컵경기장",
            right: "증산",
            selected: "left",
        },
    },
    {
        name: "이웃 역 이름이 아주 길 때",
        note: "칸에 안 들어가면 이웃 역 이름이 …으로 줄어듦 (가운데 역은 그대로)",
        station: {
            stationName: "신당",
            lineName: "2호선",
            lineColor: "#3CB44A",
            left: "동대문역사문화공원",
            right: "상왕십리",
            selected: "left",
        },
    },
    {
        name: "딱 7자",
        note: "줄어드는 경계",
        station: {
            stationName: "구로디지털단지",
            lineName: "2호선",
            lineColor: "#3CB44A",
            left: "신대방",
            right: "대림",
            selected: "right",
        },
    },
    {
        name: "끝 역 — 오른쪽이 없음",
        note: "빈칸 · 누를 수 없음 · 가운데 역은 가운데 그대로",
        station: {
            stationName: "오금",
            lineName: "3호선",
            lineColor: "#FF8939",
            left: "경찰병원",
            right: null,
            selected: "left",
        },
    },
    {
        name: "끝 역 — 왼쪽이 없음",
        note: "빈칸",
        station: {
            stationName: "장암",
            lineName: "7호선",
            lineColor: "#727718",
            left: null,
            right: "도봉산",
            selected: "right",
        },
    },
    {
        name: "우이신설선 배지",
        note: "같은 원에 「우이」 10px · 짙은 글자",
        station: {
            stationName: "성신여대입구",
            lineName: "우이신설선",
            lineColor: "#B0CE18",
            left: "보문",
            right: "정릉",
            selected: "right",
        },
    },
    {
        name: "우이신설선 + 긴 역명",
        note: "4.19민주묘지 — 8자라 한 단계 작게",
        station: {
            stationName: "4.19민주묘지",
            lineName: "우이신설선",
            lineColor: "#B0CE18",
            left: "가오리",
            right: "솔밭공원",
            selected: "left",
        },
    },
    {
        name: "9호선 배지",
        note: "노선색이 밝은 편(흰 숫자 대비 2.3 : 1) — 숫자는 결정.md대로 흰색",
        station: {
            stationName: "노량진",
            lineName: "9호선",
            lineColor: "#CEA43A",
            left: "노들",
            right: "샛강",
            selected: "right",
        },
    },
];

/* ───────────────────────── 승강장까지 · 새로고침 ───────────────────────── */

/** 가까운 역: 걸으면 3분20초 · 뛰면 1분50초 (v32 NEAR) */
const NEAR: Walk = { walkSec: 200, runSec: 110, source: "manual" };
/** 먼 역: 걸으면 9분10초 · 뛰면 5분 (v32 FAR) */
const FAR: Walk = { walkSec: 550, runSec: 300, source: "manual" };

export const REFRESH = {
    fresh: { elapsedSec: 3, stale: false, refreshing: false },  // 방금
    ten: { elapsedSec: 10, stale: false, refreshing: false },   // 10초 전 (v32 그림의 기본)
    stale: { elapsedSec: 64, stale: true, refreshing: false },  // 1분 전 정보 (굵게)
    busy: { elapsedSec: 20, stale: false, refreshing: true },   // 20초 전 + 받는 중(아이콘이 돈다)
} satisfies Record<string, Refresh>;

/* ───────────────────────── 판정 화면 5종 ───────────────────────── */

/** 못 타는 「이번 열차」: 0분50초 · 뛰어도 1분 부족 (v32 MISSED) */
const MISSED: TrainRow = { kind: "miss", remainingSec: 50, shortBySec: 60 };

type Base = Pick<ScreenCase, "verdict" | "walk" | "trains" | "pending"> & { title: string };

/** 판정마다 기본 그림 한 장 (v32 「판정 상태」 묶음) */
const BASE: Record<Verdict, Base> = {
    slow: {
        title: "천천히 걸어요",
        verdict: "slow",
        walk: NEAR,
        trains: [
            { kind: "slow", remainingSec: 520, isTarget: true },
            { kind: "slow", remainingSec: 850, isTarget: false },
        ],
    },
    walk: {
        title: "걸어도 돼요",
        verdict: "walk",
        walk: NEAR,
        trains: [
            { kind: "walk", remainingSec: 310, isTarget: true },
            { kind: "slow", remainingSec: 690, isTarget: false },
        ],
    },
    run: {
        title: "지금 뛰어요!",
        verdict: "run",
        walk: NEAR,
        trains: [
            { kind: "run", remainingSec: 150, isTarget: true },
            { kind: "slow", remainingSec: 520, isTarget: false },
        ],
    },
    tight: {
        title: "빨리 뛰어봐요!",
        verdict: "tight",
        walk: NEAR,
        trains: [
            { kind: "tight", remainingSec: 110, isTarget: true },
            { kind: "slow", remainingSec: 440, isTarget: false },
        ],
    },
    "keep-walking": {
        title: "탈 열차가 아직 안 보여요",
        verdict: "keep-walking",
        walk: FAR,
        trains: [
            { kind: "miss", remainingSec: 70, shortBySec: 230 },
            { kind: "miss", remainingSec: 200, shortBySec: 100 },
        ],
        pending: true,
    },
};

const VERDICTS: Verdict[] = ["slow", "walk", "run", "tight", "keep-walking"];

const STATES: { key: "fresh" | "stale" | "busy"; name: string; note: string }[] = [
    { key: "fresh", name: "방금", note: "받은 지 3초" },
    { key: "stale", name: "1분 전 정보", note: "받은 지 64초 · 굵게 · 다른 줄에는 안 붙음" },
    { key: "busy", name: "받는 중", note: "받은 지 20초 · 아이콘이 0.7초에 한 바퀴" },
];

/** 판정 화면 5종 × (방금 / 1분 전 정보 / 받는 중). 한 줄이 판정 하나다 */
export const STATE_ROWS: { title: string; cases: ScreenCase[] }[] = VERDICTS.map((verdict) => {
    const { title, ...base } = BASE[verdict];
    return {
        title,
        cases: STATES.map((state) => ({
            ...base,
            id: `${verdict}-${state.key}`,
            name: `${title} · ${state.name}`,
            note: state.note,
            refresh: REFRESH[state.key],
        })),
    };
});

/* ───────────────────────── 그 밖의 경우 ───────────────────────── */

/** 「이번 열차」가 못 타는 줄일 때 — 새로고침 글자 자리와 그 줄 높이 (결정.md 4절) */
export const MISSED_CASES: ScreenCase[] = [
    {
        id: "missed-run",
        name: "놓친 열차가 있을 때",
        note: "못 타는 줄은 흐리게(새로고침 글자는 그대로) · 판정은 그다음 열차 · 첫 줄만 12px쯤 높음",
        verdict: "run",
        walk: NEAR,
        trains: [MISSED, { kind: "run", remainingSec: 160, isTarget: true }],
        refresh: REFRESH.ten,
    },
    {
        id: "missed-run-stale",
        name: "놓친 열차 + 1분 전 정보",
        note: "「이번 열차」가 못 타는 줄이어도 같은 자리",
        verdict: "run",
        walk: NEAR,
        trains: [MISSED, { kind: "run", remainingSec: 160, isTarget: true }],
        refresh: REFRESH.stale,
    },
    {
        id: "missed-slow",
        name: "천천히 걸어요 + 놓친 열차",
        note: "이번은 놓치고 다음은 넉넉할 때",
        verdict: "slow",
        walk: NEAR,
        trains: [MISSED, { kind: "slow", remainingSec: 520, isTarget: true }],
        refresh: REFRESH.ten,
    },
];

/** 내 위치로 계산한 값: 승강장까지 150m → 걸으면 3분 · 뛰면 2분 (v32 「내 위치로 계산 중」) */
const BY_LOCATION: Walk = { walkSec: 180, runSec: 120, source: "location", approximate: false };
/** 어림값: 420m → 396초 · 228초. 10초 단위로 반올림해 6분40초 · 3분50초로 보인다 (v32 「위치가 부정확할 때」) */
const APPROXIMATE: Walk = { walkSec: 396, runSec: 228, source: "location", approximate: true };
/** 어림값 + 걸어서 10분 넘음 → 숫자가 길어져 「승강장까지」 글자가 먼저 줄어드는지 */
const APPROXIMATE_FAR: Walk = { walkSec: 800, runSec: 430, source: "location", approximate: true };

/** 「승강장까지」 줄의 세 모습 — 직접 고른 값은 위 판정 화면들이 보여 준다 */
export const WALK_CASES: ScreenCase[] = [
    {
        id: "location",
        name: "내 위치로 계산 중",
        note: "「승강장까지」 앞에 위치 화살표 11px",
        verdict: "run",
        walk: BY_LOCATION,
        trains: [
            { kind: "run", remainingSec: 150, isTarget: true },
            { kind: "slow", remainingSec: 520, isTarget: false },
        ],
        refresh: REFRESH.ten,
    },
    {
        id: "approximate",
        name: "어림값",
        note: "숫자 앞에 「약」 · 간격 14 → 10px, 5 → 3px",
        verdict: "walk",
        walk: APPROXIMATE,
        trains: [
            { kind: "miss", remainingSec: 150, shortBySec: 78 },
            { kind: "walk", remainingSec: 520, isTarget: true },
        ],
        refresh: REFRESH.ten,
    },
    {
        id: "approximate-far",
        name: "어림값 + 걸어서 10분 넘음",
        note: "숫자는 그대로, 넘치면 「승강장까지」가 먼저 줄어듦",
        verdict: "run",
        walk: APPROXIMATE_FAR,
        trains: [
            { kind: "miss", remainingSec: 150, shortBySec: 280 },
            { kind: "run", remainingSec: 520, isTarget: true },
        ],
        refresh: REFRESH.ten,
    },
];

/** 열차가 한 대만 올 때 — 줄 수와 대기 줄 이름 (결정.md 1절 · 4절, 2026-11-15) */
export const ONE_TRAIN_CASES: ScreenCase[] = [
    {
        id: "one-train",
        name: "열차가 한 대뿐",
        note: "열차 줄 1개",
        verdict: "walk",
        walk: NEAR,
        trains: [{ kind: "walk", remainingSec: 310, isTarget: true }],
        refresh: REFRESH.fresh,
    },
    {
        id: "keep-one",
        name: "탈 열차가 아직 안 보여요 + 한 대뿐",
        note: "못 타는 줄이 하나면 대기 줄 이름은 「다음 열차」",
        verdict: "keep-walking",
        walk: FAR,
        trains: [{ kind: "miss", remainingSec: 70, shortBySec: 230 }],
        refresh: REFRESH.fresh,
        pending: true,
    },
];

/** 작은 화면 375 × 667 — 가장 빡빡한 경우들 (v32 「작은 화면」 묶음) */
export const SMALL_CASES: ScreenCase[] = [
    {
        ...BASE["keep-walking"],
        id: "small-keep-stale",
        name: "탈 열차가 아직 안 보여요 + 1분 전 정보",
        note: "줄이 가장 많고 새로고침 글자가 가장 긴 카드 — 스크롤 없이 들어가는지",
        small: true,
        refresh: REFRESH.stale,
    },
    {
        id: "small-missed-run-stale",
        name: "놓친 열차 + 1분 전 정보",
        note: "「뛰어도 1분 부족」과 새로고침 글자가 안 겹치는지",
        small: true,
        verdict: "run",
        walk: NEAR,
        trains: [MISSED, { kind: "run", remainingSec: 160, isTarget: true }],
        refresh: REFRESH.stale,
    },
    {
        id: "small-approximate",
        name: "어림값",
        note: "「약」이 붙어도 「승강장까지」 줄이 한 줄인지",
        small: true,
        verdict: "walk",
        walk: APPROXIMATE,
        trains: [
            { kind: "miss", remainingSec: 150, shortBySec: 78 },
            { kind: "walk", remainingSec: 520, isTarget: true },
        ],
        refresh: REFRESH.ten,
    },
    {
        id: "small-approximate-far",
        name: "어림값 + 걸어서 10분 넘음",
        note: "숫자는 그대로 두고 「승강장까지」가 줄어드는지",
        small: true,
        verdict: "run",
        walk: APPROXIMATE_FAR,
        trains: [
            { kind: "miss", remainingSec: 150, shortBySec: 280 },
            { kind: "run", remainingSec: 520, isTarget: true },
        ],
        refresh: REFRESH.ten,
    },
    {
        ...BASE.tight,
        id: "small-tight-long-name",
        name: "긴 역명 + 빨리 뛰어봐요!",
        note: "판정 대상 시간 글자가 38px로 줄어드는 높이 · 9자 역명",
        small: true,
        station: {
            stationName: "동대문역사문화공원",
            lineName: "2호선",
            lineColor: "#3CB44A",
            left: "을지로4가",
            right: "신당",
            selected: "right",
        },
        refresh: REFRESH.fresh,
    },
];

/** 눌러 보는 화면의 바탕 (상태는 u2-verdict.tsx의 가짜 상태가 덮어쓴다) */
export const DEMO_ID = "demo";
export const DEMO_CASE: ScreenCase = {
    ...BASE.run,
    id: DEMO_ID,
    name: "눌러 보기",
    note: "역명판 양옆 · 새로고침 글자 · 「승강장까지」 줄",
    refresh: REFRESH.fresh,
};

/** 주소(?screen=…)로 한 장만 크게 볼 때 찾는 목록 */
export const ALL_CASES: ScreenCase[] = [
    ...STATE_ROWS.flatMap((row) => row.cases),
    ...MISSED_CASES,
    ...WALK_CASES,
    ...ONE_TRAIN_CASES,
    ...SMALL_CASES,
];

/** 판정 글자 6종 — 「열차가 없어요」는 화면 전체가 U3이라 글자만 본다 */
export const TITLES: { verdict: Verdict | "empty"; name: string; bg: string }[] = [
    { verdict: "slow", name: "slow · 파랑", bg: "bg-slow" },
    { verdict: "walk", name: "walk · 초록", bg: "bg-walk" },
    { verdict: "run", name: "run · 빨강", bg: "bg-run" },
    { verdict: "tight", name: "tight · 진홍", bg: "bg-tight" },
    { verdict: "keep-walking", name: "keep-walking · 보라 · 두 줄", bg: "bg-miss" },
    { verdict: "empty", name: "empty · 회색 (화면 전체는 U3)", bg: "bg-deadend" },
];
