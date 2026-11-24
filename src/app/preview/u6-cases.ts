import type {
    NearbyStationRow,
    NearbyStations,
    RecentStationRow,
    ScreenTone,
    SearchResultRow,
    StationRowBase,
    StationSearchResults,
} from "@/types/ui";
import type { Station } from "./u2-cases";

/*
 * U6 미리보기의 가짜 데이터와 가짜 검색 (plan.md U6 ② 7)). 여기 있는 것은 전부 미리보기에서만 쓴다.
 *
 * 역 · 최근 본 역 · 가까운 역은 design/v39.html 스크립트 6-1절(STATIONS · FD_RECENT · FD_NEAR)과 같게 맞췄다 —
 * 미리보기와 시안을 나란히 놓고 같은 글자끼리 비교하려고. 그래서 방면 이름도 그림 속 값(「자양 방면」)이다.
 * 실제 앱은 이웃 역 데이터의 이름을 쓴다 (결정.md 6절). 실제 검색 · 정렬 · 일치 범위 · 한글 조합 처리는 영준의 로직(L5)이 한다.
 * 콜백과 가짜 상태(검색어 · 고른 줄 · 「가까운 역」 상태)는 여기 없고 u6-search.tsx에 있다.
 */

/* ───────────────────────── 호선 색 · 역 ───────────────────────── */

/**
 * 호선 색 — 결정.md 2절 「호선 색」 표 (카카오맵 웹 노선도 색, 2026-11-20). 우이신설선만 공식 색 그대로다.
 * 미리보기 가짜 데이터에 쓰는 값이다. 앱의 색 표는 src/lib/line-color.ts 한 곳이고, 화면 컴포넌트는 색을 props로만 받는다
 */
export const LINE_COLOR: Record<string, string> = {
    "2호선": "#3CB44A",
    "3호선": "#FF8939",
    "4호선": "#09B5EA",
    "5호선": "#924BDD",
    "6호선": "#B55E16",
    "7호선": "#727718",
    "9호선": "#CEA43A",
    "우이신설선": "#B0CE18",
};

/** (역, 호선) 하나 → 줄의 공통 값. id는 가짜다 (실제는 "2718-1007" 같은 역사 ID + 호선) */
const station = (name: string, lineName: string): StationRowBase => ({
    stationId: `${name}-${lineName}`,
    stationName: name,
    lineName,
    lineColor: LINE_COLOR[lineName],
});

/**
 * 가짜 역 목록 — v39 STATIONS에서 역 목록에 없는 8호선 두 줄을 빼고, 우이신설선 배지를 볼 수 있게 네 줄을 더했다
 * (더한 줄에는 「공」이 없다 — 「공」으로 찾은 결과가 v39 그림의 13줄 그대로여야 해서).
 * 줄 하나 = 역 id 하나라 환승역은 호선마다 한 줄이다. 순서는 v39 그대로 (검색 결과는 이 순서를 지킨다)
 */
const STATIONS: StationRowBase[] = [
    "공릉 7호선", "공덕 5호선", "공덕 6호선", "공항시장 9호선", "김포공항 5호선", "김포공항 9호선", "올림픽공원 5호선", "올림픽공원 9호선",
    "효창공원앞 6호선", "어린이대공원 7호선", "동대문역사문화공원 2호선", "동대문역사문화공원 4호선", "동대문역사문화공원 5호선",
    "건대입구 2호선", "건대입구 7호선", "자양 7호선", "군자 5호선", "군자 7호선", "아차산 5호선", "광나루 5호선", "구의 2호선", "강변 2호선",
    "성수 2호선", "뚝섬 2호선", "왕십리 2호선", "왕십리 5호선", "태릉입구 6호선", "태릉입구 7호선", "노원 4호선", "노원 7호선", "상봉 7호선",
    "강남 2호선", "교대 2호선", "교대 3호선", "사당 2호선", "사당 4호선", "고속터미널 3호선", "고속터미널 7호선", "고속터미널 9호선",
    "잠실 2호선", "천호 5호선", "시청 2호선", "을지로입구 2호선", "신당 2호선", "신당 6호선", "동대입구 3호선", "약수 3호선", "약수 6호선",
    "서울역 4호선", "삼각지 4호선", "삼각지 6호선", "이태원 6호선", "합정 2호선", "합정 6호선", "홍대입구 2호선", "망원 6호선",
    "마포구청 6호선", "여의도 5호선", "여의도 9호선", "노량진 9호선", "신림 2호선",
    "성신여대입구 4호선", "성신여대입구 우이신설선", "북한산우이 우이신설선", "4.19민주묘지 우이신설선",
].map((text) => {
    const [name, lineName] = text.split(" ");
    return station(name, lineName);
});

/* ───────────────────────── 가짜 검색 (눌러 보기) ───────────────────────── */

/** 검색어에서 공백과 덜 친 낱자(ㄱ · ㅏ)를 뺀다 — 「공ㄷ」을 치는 순간에는 「공」으로 찾는다 */
const tidy = (query: string) => query.replace(/[\sㄱ-ㅎㅏ-ㅣ]/g, "");

/** 이름에 q가 들어 있는 역을 줄로. 앞 글자가 맞는 역 먼저, 그다음 가운데 글자가 맞는 역 (목록 순서 유지 — v39 searchStations) */
function findRows(q: string): SearchResultRow[] {
    const hits = STATIONS.flatMap((s) => {
        const at = s.stationName.indexOf(q);
        return at < 0 ? [] : [{ ...s, matchStart: at, matchLength: q.length }];
    });
    return [...hits.filter((row) => row.matchStart === 0), ...hits.filter((row) => row.matchStart > 0)];
}

/** 가짜 검색의 결과 — 고른 줄 번호(activeIndex)는 가짜 상태가 따로 들고 있다가 얹는다 */
export type Found = { status: "idle" } | { status: "list"; rows: SearchResultRow[] } | { status: "none" };

/**
 * 가짜 검색. 검색어가 비면(공백 · 낱자뿐이어도) 처음 화면, 맞는 역이 없으면 결과 없음.
 * 한글 조합 중에 0줄이 되면 마지막 글자를 빼고 한 번 더 찾는다 — 「공덕」을 치는 중의 「공더」에서 목록이 비었다가 다시 채워지지 않게.
 * 지금 station-search.tsx에 있는 처리를 그대로 흉내 낸 것이고, 실제 규칙은 L5에서 영준이 정한다
 */
export function fakeSearch(query: string, composing: boolean): Found {
    const q = tidy(query);
    if (q === "") return { status: "idle" };

    let rows = findRows(q);
    if (rows.length === 0 && composing) {
        const shorter = q.slice(0, -1);
        if (shorter === "") return { status: "idle" };
        rows = findRows(shorter);
    }
    return rows.length > 0 ? { status: "list", rows } : { status: "none" };
}

/* ───────────────────────── 최근 본 역 · 가까운 역 ───────────────────────── */

/** v39 FD_RECENT — (역 · 호선 · 방면). 방면(up · down)은 가짜다: 왼쪽 · 오른쪽을 정하는 것은 역 화면의 일 */
export const RECENT: RecentStationRow[] = [
    { ...station("건대입구", "7호선"), direction: "down", directionName: "자양" },
    { ...station("공릉", "7호선"), direction: "down", directionName: "태릉입구" },
    { ...station("강남", "2호선"), direction: "up", directionName: "교대" },
    { ...station("시청", "2호선"), direction: "down", directionName: "을지로입구" },
];

/** v39 FD_NEAR — (역 · 호선 · 거리 m). 환승역은 호선마다 한 줄 */
export const NEAR: NearbyStationRow[] = [
    { ...station("건대입구", "7호선"), distanceM: 320 },
    { ...station("건대입구", "2호선"), distanceM: 320 },
    { ...station("어린이대공원", "7호선"), distanceM: 780 },
];

/** 긴 이름: 9자 역명 · 8자 역명 + 6자 방면 · 2자 역명 + 9자 방면 · 우이신설선 배지 */
const LONG_RECENT: RecentStationRow[] = [
    { ...station("동대문역사문화공원", "2호선"), direction: "up", directionName: "을지로4가" },
    { ...station("디지털미디어시티", "6호선"), direction: "up", directionName: "월드컵경기장" },
    { ...station("신당", "2호선"), direction: "up", directionName: "동대문역사문화공원" },
    { ...station("시청", "2호선"), direction: "down", directionName: "을지로입구" },
    { ...station("4.19민주묘지", "우이신설선"), direction: "down", directionName: "솔밭공원" },
];

/** 긴 이름 + 거리: km로 넘어간 값(1.2km)과 딱 떨어지는 값(2.0km) */
const LONG_NEAR: NearbyStationRow[] = [
    { ...station("동대문역사문화공원", "4호선"), distanceM: 990 },
    { ...station("성신여대입구", "우이신설선"), distanceM: 1240 },
    { ...station("구로디지털단지", "2호선"), distanceM: 2000 },
];

/** 「대」로 찾은 긴 이름들 — 앞 글자가 맞는 역(대림)이 먼저. 오른쪽 끝 글자가 가장 긴 「우이신설선」도 있다 */
const LONG_RESULT: SearchResultRow[] = [
    "대림 2호선", "대림 7호선", "동대문역사문화공원 2호선", "동대문역사문화공원 4호선", "동대문역사문화공원 5호선",
    "성신여대입구 우이신설선", "성신여대입구 4호선", "어린이대공원 7호선", "서울대입구 2호선",
].map((text) => {
    const [name, lineName] = text.split(" ");
    return { ...station(name, lineName), matchStart: name.indexOf("대"), matchLength: 1 };
});

/* ───────────────────────── 화면 한 장 ───────────────────────── */

/** 역 찾기 화면 한 장 — 콜백만 뺀 props. 눌러도 콘솔에 로그만 찍히고 모습은 그대로다 (눌러 보기는 따로 있다) */
export type SearchCase = {
    id: string;          // 주소에 쓰는 이름 — /preview?screen=이 값
    name: string;        // 보드 제목
    note: string;        // 무엇을 보는 장인지
    small?: boolean;     // true면 375 × 667, 아니면 390 × 844
    keyboard?: boolean;  // true면 미리보기가 그림 위에 키보드 자리(300px)를 얹는다 — 화면 컴포넌트가 그리는 것이 아니다
    query: string;
    results: StationSearchResults;
    nearby: NearbyStations;
    recent: RecentStationRow[] | null;
};

const IDLE: StationSearchResults = { status: "idle" };
const GONG = findRows("공"); // v39 그림과 같은 13줄

/** v39 「역 찾기」 묶음의 화면 1 ~ 10 — 번호 · 순서 · 상태가 그림과 같다 */
export const V39_CASES: SearchCase[] = [
    {
        id: "search-home",
        name: "1. 처음 화면",
        note: "「가까운 역」 자리에 「내 위치로 찾기」 · 최근 본 역은 한 줄",
        query: "",
        results: IDLE,
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-near",
        name: "2. 위치를 허용한 뒤",
        note: "같은 자리가 목록으로 · 이름 + 거리만",
        query: "",
        results: IDLE,
        nearby: { status: "list", rows: NEAR },
        recent: RECENT,
    },
    {
        id: "search-first",
        name: "3. 처음 연 사람",
        note: "recent가 0줄 → 제목 · 목록 대신 안내 한 줄",
        query: "",
        results: IDLE,
        nearby: { status: "idle" },
        recent: [],
    },
    {
        id: "search-typing",
        name: "4. 입력 중",
        note: "테두리 1px 짙게 · 지우기 버튼 · 고른 줄 표시 없음 · 키보드 위 8줄",
        keyboard: true,
        query: "공",
        results: { status: "list", rows: GONG.slice(0, 8), activeIndex: null },
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-arrows",
        name: "5. PC에서 ↑↓로 고를 때",
        note: "activeIndex 1 (↓ 두 번) · 4px 안쪽 둥근 면",
        query: "공",
        results: { status: "list", rows: GONG.slice(0, 10), activeIndex: 1 },
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-results",
        name: "6. 결과 — 키보드를 내린 뒤",
        note: "환승역은 호선마다 한 줄 · 13줄이 캡슐 밑으로 스크롤",
        query: "공",
        results: { status: "list", rows: GONG, activeIndex: null },
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-none",
        name: "7. 결과 없음",
        note: "카드 안 한 줄 · 받침이 없어 「와」",
        keyboard: true,
        query: "홍데",
        results: { status: "none" },
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-locating",
        name: "8. 내 위치 확인 중",
        note: "누른 줄이 그 자리에서 바뀜 · 꺾쇠 없음 · 눌리지 않음",
        query: "",
        results: IDLE,
        nearby: { status: "locating" },
        recent: RECENT,
    },
    {
        id: "search-denied",
        name: "9. 위치를 거부했을 때",
        note: "묶음이 빠지고 안내는 최근 본 역 아래",
        query: "",
        results: IDLE,
        nearby: { status: "denied" },
        recent: RECENT,
    },
    {
        id: "search-far",
        name: "10. 가까이에 역이 없을 때",
        note: "radiusM 2000 → 「2km 안에 …」 (2km는 제안 값)",
        query: "",
        results: IDLE,
        nearby: { status: "none", radiusM: 2000 },
        recent: RECENT,
    },
];

/** v39에 그림이 없는 상태 — 타입에는 있는 것들 */
export const EXTRA_CASES: SearchCase[] = [
    {
        id: "search-no-nearby",
        name: "묶음 없음",
        note: "nearby hidden → 안내도 없이 최근 본 역만 (위치를 붙이기 전, L5 동안의 모습)",
        query: "",
        results: IDLE,
        nearby: { status: "hidden" },
        recent: RECENT,
    },
    {
        id: "search-restoring",
        name: "복원 전",
        note: "recent null → 제목 · 줄 · 안내 없이 자리를 비움 (저장값을 읽기 전의 한순간)",
        query: "",
        results: IDLE,
        nearby: { status: "hidden" },
        recent: null,
    },
    {
        id: "search-none-batchim",
        name: "결과 없음 — 받침이 있을 때",
        note: "「강남구」가 아니라 「강낭」 → 「과」",
        query: "강낭",
        results: { status: "none" },
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-none-digit",
        name: "결과 없음 — 숫자로 끝날 때",
        note: "「종로6」 → 읽는 소리(육)대로 「과」 · 앞뒤 공백은 떼고 씀",
        query: " 종로6 ",
        results: { status: "none" },
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-none-long",
        name: "결과 없음 — 긴 검색어",
        note: "띄어쓰기 없는 28자를 붙여 넣었을 때 → 검색어 쪽만 …으로 줄고 한 줄 그대로 (U6 검토 2번)",
        query: "동대문역사문화공원역4번출구앞에서만나기로했는데요",
        results: { status: "none" },
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-far-other",
        name: "가까이에 없음 — 다른 거리",
        note: "radiusM 1500 → 「1.5km 안에 …」 (기준 거리는 로직이 정함)",
        query: "",
        results: IDLE,
        nearby: { status: "none", radiusM: 1500 },
        recent: RECENT,
    },
];

/** 긴 역 이름 — 이름 쪽만 …으로 줄고 오른쪽 끝 값은 그대로인지 */
export const LONG_CASES: SearchCase[] = [
    {
        id: "search-long-home",
        name: "긴 이름 — 가까운 역 · 최근 본 역",
        note: "9자 역명 · 9자 방면 · 「우이」 배지(11px) · 990m / 1.2km / 2.0km",
        query: "",
        results: IDLE,
        nearby: { status: "list", rows: LONG_NEAR },
        recent: LONG_RECENT,
    },
    {
        id: "search-long-results",
        name: "긴 이름 — 결과",
        note: "「대」 · 가운데 글자 일치 · 오른쪽 끝이 가장 긴 「우이신설선」",
        query: "대",
        results: { status: "list", rows: LONG_RESULT, activeIndex: null },
        nearby: { status: "idle" },
        recent: RECENT,
    },
];

/** 작은 화면 375 × 667 — 앞의 두 장은 v39 「작은 화면」 묶음의 그림 */
export const SMALL_CASES: SearchCase[] = [
    {
        id: "search-home-small",
        name: "처음 화면 — 375 × 667",
        note: "최근 본 역 4줄까지 캡슐 위에 보임",
        small: true,
        query: "",
        results: IDLE,
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-typing-small",
        name: "입력 중 — 375 × 667",
        note: "키보드 위에 남는 줄",
        small: true,
        keyboard: true,
        query: "공",
        results: { status: "list", rows: GONG.slice(0, 8), activeIndex: null },
        nearby: { status: "idle" },
        recent: RECENT,
    },
    {
        id: "search-long-home-small",
        name: "긴 이름 — 375 폭",
        note: "가장 긴 줄: 「동대문역사문화공원」 · 「시청」 + 「을지로입구 방면」",
        small: true,
        query: "",
        results: IDLE,
        nearby: { status: "list", rows: LONG_NEAR },
        recent: LONG_RECENT,
    },
    {
        id: "search-long-results-small",
        name: "긴 이름 결과 — 375 폭",
        note: "「동대문역사문화공원」 + 「2호선」 · 「성신여대입구」 + 「우이신설선」",
        small: true,
        query: "대",
        results: { status: "list", rows: LONG_RESULT, activeIndex: null },
        nearby: { status: "idle" },
        recent: RECENT,
    },
];

/**
 * 위치를 못 쓸 때 (U7 — 결정.md 6절 「가까운 역」 · 「최근 본 역」, 시안 v40의 1-A · 2-A · 3-A).
 * 못 찾음은 줄을 남기고 카드 아래 한 줄, 미지원은 거부와 같은 모양에 문구만, 처음 연 사람과 겹치면 안내 두 줄을 차례로
 */
export const LOCATION_CASES: SearchCase[] = [
    {
        id: "search-failed",
        name: "위치를 못 찾았을 때",
        note: "nearby failed (시간 초과 · 사용 불가) → 「내 위치로 찾기」 줄 그대로 + 카드 아래 10px에 한 줄 (v40 2-A)",
        query: "",
        results: IDLE,
        nearby: { status: "failed" },
        recent: RECENT,
    },
    {
        id: "search-unsupported",
        name: "위치를 쓸 수 없는 브라우저",
        note: "nearby unsupported → 거부와 같은 모양, 문구만 다름 (v40 3-A)",
        query: "",
        results: IDLE,
        nearby: { status: "unsupported" },
        recent: RECENT,
    },
    {
        id: "search-first-denied",
        name: "처음 연 사람 + 위치 거부",
        note: "recent 0줄 + nearby denied → 안내 두 줄을 차례로 (v40 1-A)",
        query: "",
        results: IDLE,
        nearby: { status: "denied" },
        recent: [],
    },
    {
        id: "search-first-unsupported",
        name: "처음 연 사람 + 미지원",
        note: "거부와 같은 차례 — 아랫줄만 미지원 안내",
        query: "",
        results: IDLE,
        nearby: { status: "unsupported" },
        recent: [],
    },
    {
        id: "search-first-failed",
        name: "처음 연 사람 + 못 찾음",
        note: "줄 + 못 찾음 한 줄, 그 아래 「역을 한 번 보면…」",
        query: "",
        results: IDLE,
        nearby: { status: "failed" },
        recent: [],
    },
    {
        id: "search-failed-small",
        name: "못 찾았을 때 — 375 × 667",
        note: "한 줄이 더해져도 최근 본 역 4줄이 캡슐 위에 보이는지",
        small: true,
        query: "",
        results: IDLE,
        nearby: { status: "failed" },
        recent: RECENT,
    },
];

/** 눌러 보기 — 주소 이름이 search라서 하단 캡슐의 「역 찾기」 탭이 여기로 온다 (kit.tsx BOTTOM_NAV) */
export const DEMO_ID = "search";

/** 눌러 보기에서 고를 수 있는 「가까운 역」 상태 — 타입의 여덟 가지 전부 */
export const NEARBY_CHOICES: { label: string; value: NearbyStations }[] = [
    { label: "허용 전", value: { status: "idle" } },
    { label: "확인 중", value: { status: "locating" } },
    { label: "목록", value: { status: "list", rows: NEAR } },
    { label: "가까이에 없음", value: { status: "none", radiusM: 2000 } },
    { label: "거부", value: { status: "denied" } },
    { label: "못 찾음", value: { status: "failed" } },
    { label: "미지원", value: { status: "unsupported" } },
    { label: "묶음 없음", value: { status: "hidden" } },
];

/** 눌러 보기에서 고를 수 있는 최근 본 역 */
export const RECENT_CHOICES: { label: string; value: RecentStationRow[] | null }[] = [
    { label: "4줄", value: RECENT },
    { label: "0줄", value: [] },
    { label: "복원 전", value: null },
];

/** 주소(?screen=…)로 한 장만 크게 볼 때 찾는 목록 */
export const U6_CASES: SearchCase[] = [...V39_CASES, ...EXTRA_CASES, ...LONG_CASES, ...SMALL_CASES, ...LOCATION_CASES];

/** 주소의 이름이 U6 화면인지 — page.tsx가 어느 묶음에서 찾을지 정할 때 쓴다 */
export const isU6Screen = (id: string) => id === DEMO_ID || U6_CASES.some((c) => c.id === id);

/* ───────────────────────── 역명판 배지 새 색 ───────────────────────── */

/** 역 목록에 있는 여덟 노선의 역명판 — 2 ~ 7 · 9호선과 우이신설선 (1 · 8호선은 역 목록에 없다, 결정.md 2절) */
export const BADGE_PLATES: Station[] = [
    { stationName: "강남", lineName: "2호선", lineColor: LINE_COLOR["2호선"], left: "역삼", right: "교대", selected: "right" },
    { stationName: "교대", lineName: "3호선", lineColor: LINE_COLOR["3호선"], left: "고속터미널", right: "남부터미널", selected: "right" },
    { stationName: "사당", lineName: "4호선", lineColor: LINE_COLOR["4호선"], left: "이수", right: "남태령", selected: "right" },
    { stationName: "공덕", lineName: "5호선", lineColor: LINE_COLOR["5호선"], left: "애오개", right: "마포", selected: "right" },
    { stationName: "합정", lineName: "6호선", lineColor: LINE_COLOR["6호선"], left: "망원", right: "상수", selected: "right" },
    { stationName: "건대입구", lineName: "7호선", lineColor: LINE_COLOR["7호선"], left: "어린이대공원", right: "자양", selected: "right" },
    { stationName: "노량진", lineName: "9호선", lineColor: LINE_COLOR["9호선"], left: "노들", right: "샛강", selected: "right" },
    { stationName: "성신여대입구", lineName: "우이신설선", lineColor: LINE_COLOR["우이신설선"], left: "보문", right: "정릉", selected: "right" },
];

/** 배지가 놓이는 바탕 — 상태색 다섯 + 막다른 회색 (결정.md 2절) */
export const BADGE_TONES: { tone: Exclude<ScreenTone, "white">; name: string; bg: string }[] = [
    { tone: "walk", name: "걸어도 돼요 · 초록", bg: "bg-walk" },
    { tone: "slow", name: "천천히 걸어요 · 파랑", bg: "bg-slow" },
    { tone: "run", name: "지금 뛰어요! · 빨강", bg: "bg-run" },
    { tone: "tight", name: "빨리 뛰어봐요! · 진홍", bg: "bg-tight" },
    { tone: "miss", name: "탈 열차가 아직 안 보여요 · 보라", bg: "bg-miss" },
    { tone: "deadend", name: "막다른 화면 · 회색", bg: "bg-deadend" },
];
