"use client";

import { useEffect, useRef, useState } from "react";
import type { NearbyStations, RecentStationRow, StationSearchResults, StationSearchScreenProps } from "@/types/ui";
import { StationSearchScreen } from "@/ui/search/station-search-screen";
import { StationNameplate } from "@/ui/station/station-nameplate";
import { BoardTitle, BOTTOM_NAV, CONTROL, FullLink, Group, log, PART_BASE, Phone, UnknownScreen, WRAP } from "./kit";
import {
    BADGE_PLATES,
    BADGE_TONES,
    DEMO_ID,
    EXTRA_CASES,
    fakeSearch,
    LONG_CASES,
    NEAR,
    NEARBY_CHOICES,
    RECENT,
    RECENT_CHOICES,
    SMALL_CASES,
    U6_CASES,
    LOCATION_CASES,
    V39_CASES,
    type SearchCase,
} from "./u6-cases";

/*
 * U6 미리보기 — 역 찾기 화면의 모든 상태 + 역명판 배지 새 색 (plan.md U6 ② 7)).
 *
 * 이 파일이 "use client"인 까닭: 화면에 넘기는 콜백(누르면 콘솔에 찍기)과 「눌러 보기」의 가짜 상태(useState) 때문이다.
 * 가짜 데이터 · 가짜 검색은 u6-cases.ts에, 가짜 상태와 콜백은 이 파일에만 있다. src/ui의 컴포넌트에는 상태가 없다.
 */

/** 역 찾기 화면의 하단 캡슐: 「역 찾기」가 현재 탭 */
const NAV = { ...BOTTOM_NAV, active: "search" as const };

/* ───────────────────────── 화면 한 장 (눌러도 로그만) ───────────────────────── */

/** 가짜 데이터 한 장 → 화면 props. 콜백은 콘솔에 찍기만 해서, 글자를 쳐도 줄을 눌러도 모습은 그대로다 */
function toProps(c: SearchCase): StationSearchScreenProps {
    return {
        query: c.query,
        onQueryChange: (query) => log(c.id, `onQueryChange("${query}")`),
        onClearQuery: () => log(c.id, "onClearQuery()"),
        onComposingChange: (composing) => log(c.id, `onComposingChange(${composing})`),
        onArrowDown: () => log(c.id, "onArrowDown()"),
        onArrowUp: () => log(c.id, "onArrowUp()"),
        onEnter: () => log(c.id, "onEnter()"),
        results: c.results,
        onSelectStation: (stationId) => log(c.id, `onSelectStation("${stationId}")`),
        nearby: c.nearby,
        onFindNearby: () => log(c.id, "onFindNearby()"),
        recent: c.recent,
        onSelectRecent: (stationId, direction) => log(c.id, `onSelectRecent("${stationId}", "${direction}")`),
        bottomNav: NAV,
    };
}

/**
 * 키보드 자리 — 화면 컴포넌트가 그리는 것이 아니라 미리보기가 휴대폰 칸 위에 얹은 표시다 (v39 그림의 .kb와 같은 높이 300px 어림).
 * 「키보드 위에 몇 줄이 보이는가」를 그림과 견줄 때만 쓴다. 하단 캡슐은 키보드에 가려진다 (결정.md 6절)
 */
const keyboardPlace = (
    <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-30 grid h-75 place-items-center bg-[#D3D7DE] text-center text-12 font-semibold text-sub"
    >
        키보드 자리 (어림 300px)
        <br />
        브라우저가 그려요 — 미리보기가 얹은 표시
    </div>
);

function Board({ c }: { c: SearchCase }) {
    return (
        <section className={`flex-none ${c.small ? "w-93.75" : "w-97.5"}`}>
            <BoardTitle name={c.name} note={c.note} />
            <Phone small={c.small ?? false}>
                <StationSearchScreen {...toProps(c)} />
                {c.keyboard && keyboardPlace}
            </Phone>
            <FullLink id={c.id} />
        </section>
    );
}

const boards = (cases: SearchCase[]) => (
    <div className={WRAP}>
        {cases.map((c) => (
            <Board key={c.id} c={c} />
        ))}
    </div>
);

/* ───────────────────────── 눌러 보기 (가짜 상태) ───────────────────────── */

/** 「내 위치로 찾기」를 누른 뒤 목록이 뜨기까지 (v39 눌러 보는 폰과 같은 1.2초) */
const LOCATING_MS = 1200;

/**
 * 역 찾기의 가짜 상태. 실제로는 L5 · L6에서 영준이 짠다(검색 · 한글 조합 · 최근 본 역 · 위치) — 여기는 props가 바뀌면 화면이 어떻게 달라지는지만 보여 준다.
 *   글자 입력 · 지우기      → 검색어가 바뀌고 고른 줄이 풀린다(null)
 *   한글 조합 시작 · 끝     → 조합 중에는 0줄이 돼도 마지막 글자를 빼고 찾는다 (u6-cases.ts fakeSearch)
 *   ↓ · ↑                 → 고른 줄이 null → 0 → 1 … 로 움직이고 양 끝에서 멈춘다
 *   Enter · 결과 줄 누르기  → 고른 줄(없으면 첫 줄)의 역으로 간다고 아래 한 줄에 적는다
 *   「내 위치로 찾기」      → 확인 중 → 1.2초 뒤 목록
 * 「가까운 역」 상태와 최근 본 역은 휴대폰 아래 버튼으로도 바꿀 수 있다 (거부 · 가까이에 없음 · 0줄 · 복원 전 …).
 */
function useSearchDemo() {
    const [query, setQuery] = useState("");
    const [composing, setComposing] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [nearby, setNearby] = useState<NearbyStations>({ status: "idle" });
    const [recent, setRecent] = useState<RecentStationRow[] | null>(RECENT);
    const [last, setLast] = useState("");
    const timer = useRef<number | undefined>(undefined);

    // 화면을 떠날 때 「확인 중 → 목록」 타이머가 남지 않게
    useEffect(() => () => window.clearTimeout(timer.current), []);

    const found = fakeSearch(query, composing);
    const rows = found.status === "list" ? found.rows : [];
    const results: StationSearchResults = found.status === "list" ? { ...found, activeIndex } : found;

    const say = (what: string) => {
        log(DEMO_ID, what);
        setLast(what);
    };

    /** 역 하나로 가기: 최근 본 역에 같은 역이 있으면 그 방면으로, 없으면 방면을 모른다 (v39 눌러 보는 폰의 go) */
    const go = (stationId: string, how: string) => {
        const seen = recent?.find((row) => row.stationId === stationId);
        say(`${how} → ${stationId} · ${seen ? `전에 본 ${seen.directionName} 방면으로 바로` : "전에 본 방면 없음"}`);
    };

    const changeNearby = (next: NearbyStations) => {
        window.clearTimeout(timer.current);
        setNearby(next);
    };

    const screen: StationSearchScreenProps = {
        query,
        onQueryChange: (next) => {
            log(DEMO_ID, `onQueryChange("${next}")`);
            setQuery(next);
            setActiveIndex(null);
        },
        onClearQuery: () => {
            say("onClearQuery()");
            setQuery("");
            setActiveIndex(null);
        },
        onComposingChange: (next) => {
            log(DEMO_ID, `onComposingChange(${next})`);
            setComposing(next);
        },
        onArrowDown: () => {
            say("onArrowDown()");
            if (rows.length > 0) setActiveIndex((index) => (index === null ? 0 : Math.min(rows.length - 1, index + 1)));
        },
        onArrowUp: () => {
            say("onArrowUp()");
            if (rows.length > 0) setActiveIndex((index) => (index === null ? 0 : Math.max(0, index - 1)));
        },
        onEnter: () => {
            if (rows.length === 0) return say("onEnter() → 0줄이라 아무 일도 없음");
            go(rows[Math.min(activeIndex ?? 0, rows.length - 1)].stationId, "onEnter()");
        },
        results,
        onSelectStation: (stationId) => go(stationId, "onSelectStation()"),
        nearby,
        onFindNearby: () => {
            say("onFindNearby() → 확인 중 → 1.2초 뒤 목록");
            changeNearby({ status: "locating" });
            timer.current = window.setTimeout(() => setNearby({ status: "list", rows: NEAR }), LOCATING_MS);
        },
        recent,
        onSelectRecent: (stationId, direction) => say(`onSelectRecent("${stationId}", "${direction}") → 그 방면 판정으로 바로`),
        bottomNav: NAV,
    };

    return {
        // 페이지가 그리는 모양 그대로: 화면 컴포넌트 하나
        view: <StationSearchScreen {...screen} />,
        last,
        nearby,
        recent,
        changeNearby,
        setRecent,
        reset: () => {
            changeNearby({ status: "idle" });
            setQuery("");
            setComposing(false);
            setActiveIndex(null);
            setRecent(RECENT);
            setLast("");
        },
    };
}

/** 눌러 보기 보드: 휴대폰 칸 + 그 아래 마지막 콜백 한 줄과 상태를 바꾸는 버튼 */
function DemoBoard() {
    const demo = useSearchDemo();

    return (
        <section className="w-97.5 flex-none">
            <BoardTitle name="역 찾기 — 눌러 보기" note="「공」 · 「건대」 · 「홍데」를 쳐 보세요 · ↑↓ · Enter · 내 위치로 찾기 · 줄 누르기" />
            <Phone small={false}>{demo.view}</Phone>

            <div className="mt-3.5 flex items-center gap-2.5">
                <button type="button" className={`flex-none ${CONTROL}`} onClick={demo.reset}>
                    처음으로
                </button>
                <p className="min-w-0 text-12 font-semibold text-sub">{demo.last || "누르면 여기에 마지막 콜백이 적혀요"}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="가까운 역 상태">
                <span className="w-full text-12 font-bold text-ink">가까운 역 (nearby)</span>
                {NEARBY_CHOICES.map(({ label, value }) => (
                    <button
                        key={label}
                        type="button"
                        className={CONTROL}
                        aria-pressed={demo.nearby.status === value.status}
                        onClick={() => demo.changeNearby(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="최근 본 역">
                <span className="w-full text-12 font-bold text-ink">최근 본 역 (recent)</span>
                {RECENT_CHOICES.map(({ label, value }) => (
                    <button
                        key={label}
                        type="button"
                        className={CONTROL}
                        aria-pressed={(demo.recent?.length ?? -1) === (value?.length ?? -1)}
                        onClick={() => demo.setRecent(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <FullLink id={DEMO_ID} />
        </section>
    );
}

/** 눌러 보기를 한 장만 크게: 휴대폰 칸도 조절 버튼도 없이 화면만 */
function DemoFull() {
    return useSearchDemo().view;
}

/* ───────────────────────── 역명판 배지 새 색 ───────────────────────── */

/** 역명판은 화면 틀의 data-tone을 보고 색을 고른다. 틀이 없으니 바탕색과 data-tone을 여기서 직접 준다 */
function BadgeStrip({ tone, name, bg }: { tone: string; name: string; bg: string }) {
    return (
        <section className="w-97.5 flex-none">
            <BoardTitle name={name} note="" />
            <div data-tone={tone} className={`rounded-[18px] pb-3 ${PART_BASE} ${bg}`}>
                {BADGE_PLATES.map((station) => (
                    <StationNameplate
                        key={station.lineName}
                        {...station}
                        onSelect={(side) => log(`역명판 배지 · ${name}`, `onSelect("${side}")`)}
                    />
                ))}
            </div>
        </section>
    );
}

/* ───────────────────────── 묶음 ───────────────────────── */

export function U6SearchPreview() {
    return (
        <section className="px-5 pb-20 break-keep" aria-labelledby="u6-title">
            <h2 id="u6-title" className="text-wordmark">
                U6 · 역 찾기 화면 · 호선 배지 새 색
            </h2>
            <p className="mt-1.5 max-w-245 text-13 font-semibold text-sub">
                시안 design/v39.html의 「역 찾기」 묶음과 나란히 놓고 봐요 (화면 번호가 같아요). 줄 · 버튼을 누르거나 글자를
                치면 브라우저 콘솔에 「[미리보기 …]」 로그가 찍혀요. 맨 앞 「눌러 보기」만 가짜 상태가 붙어 있어서 실제로
                바뀌고, 나머지 장은 props가 고정이라 눌러도 모습이 그대로예요. 호선 색은 결정.md 2절 「호선 색」 표의 값을
                가짜 데이터에 직접 적은 것이에요 (앱의 색 표는 src/lib/line-color.ts).
            </p>

            <Group
                title="눌러 보기"
                note="검색창에 글자를 치면 묶음 둘이 결과 카드로 바뀌어요. 포커스는 검색창에 남고 ↑↓로 줄을 골라요 (처음에는 고른 줄 표시가 없어요). Enter는 고른 줄, 없으면 첫 줄. × 를 누르면 지워지고 포커스가 검색창으로 돌아와요. 「내 위치로 찾기」는 확인 중을 거쳐 1.2초 뒤 목록이 돼요. 검색 규칙 · 조합 처리 · 위치는 전부 가짜예요 (실제는 L5 · L6)."
            >
                <DemoBoard />
            </Group>

            <Group
                title="v39 「역 찾기」 화면 1 ~ 10"
                note="그림과 같은 번호 · 같은 데이터예요. 줄 높이 56px · 묶음 제목 · 카드 안 한 줄 · 입력 중 테두리(1px 그대로 색만 짙게)를 견줘요. 돋보기 · 배지 · 묶음 제목 · 안내 한 줄 · 카드 안 글자는 모두 왼쪽에서 31px에서 시작해요. 4 · 7의 회색 칸은 미리보기가 얹은 키보드 자리예요 (그림의 키보드와 같은 300px)."
            >
                {boards(V39_CASES)}
            </Group>

            <Group
                title="그림에 없는 상태"
                note="타입에는 있지만 v39에 그림이 없는 것들이에요. 묶음 없음은 L5 동안의 실제 모습이고(위치는 L6에서 붙음), 복원 전은 저장된 최근 본 역을 읽기 전의 한순간이에요."
            >
                {boards(EXTRA_CASES)}
            </Group>

            <Group
                title="긴 역 이름"
                note="이름이 길면 이름 쪽만 …으로 줄고 오른쪽 끝 값(방면 · 거리 · 호선)은 그대로예요. 390 폭에서는 가장 긴 이름(9자)도 다 들어가요. 우이신설선 배지는 26px 원에 「우이」 11px이에요 (역명판 배지는 24px 원에 10px)."
            >
                {boards(LONG_CASES)}
            </Group>

            <Group
                title="작은 화면 375 × 667"
                note="앞의 두 장은 v39 「작은 화면」 묶음의 그림이에요. 뒤의 두 장은 375 폭에서 가장 긴 줄이 깨지지 않는지 봐요."
            >
                {boards(SMALL_CASES)}
            </Group>

            <Group
                title="위치를 못 쓸 때 (U7)"
                note="시안 v40에서 고른 모습이에요 (결정.md 6절). 위치를 못 찾으면(시간 초과 · 사용 불가) 「내 위치로 찾기」 줄을 남기고 카드 아래에 한 줄 — 줄을 다시 누를 수 있어요. 미지원이면 거부와 같은 모양에 문구만 달라요. 처음 연 사람과 겹치면 안내 두 줄이 차례로 놓여요. L5 동안은 「가까운 역」이 묶음 없음이라 실제로는 나오지 않아요 (L6에서 붙음)."
            >
                {boards(LOCATION_CASES)}
            </Group>

            <Group
                title="역명판 배지 새 색"
                note="카카오맵 노선도 색 + 흰 숫자 (결정.md 2절). 역 목록에 있는 2 ~ 7 · 9호선과 우이신설선을 상태색 다섯 · 막다른 회색 · 흰 화면 위에 놓았어요. 색 화면에서는 배지 둘레에 흰 테두리가 있어요. 위 U2 · U3 묶음의 역명판도 같은 색으로 바꿨어요 (가짜 데이터의 값)."
            >
                <div className={WRAP}>
                    {BADGE_TONES.map(({ tone, name, bg }) => (
                        <BadgeStrip key={tone} tone={tone} name={name} bg={bg} />
                    ))}
                    <BadgeStrip tone="white" name="흰 화면 (판정 전 · 역 찾기와 같은 바탕)" bg="bg-canvas shadow-[0_0_0_1px_var(--color-line)]" />
                </div>
            </Group>
        </section>
    );
}

/** 한 장만 브라우저 가득 — 페이지가 화면 컴포넌트를 쓰는 모습 그대로 (/preview?screen=이름) */
export function U6FullScreen({ id }: { id: string }) {
    if (id === DEMO_ID) return <DemoFull />;

    const found = U6_CASES.find((c) => c.id === id);
    if (!found) return <UnknownScreen id={id} />;
    return <StationSearchScreen {...toProps(found)} />;
}
