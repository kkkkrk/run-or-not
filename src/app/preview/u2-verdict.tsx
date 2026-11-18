"use client";

import { useState } from "react";
import type { PlatformTimeSheetProps, VerdictScreenProps } from "@/types/ui";
import { StationNameplate } from "@/ui/station/station-nameplate";
import { VerdictScreen } from "@/ui/station/verdict-screen";
import { VerdictTitle } from "@/ui/station/verdict-title";
import { BoardTitle, BOTTOM_NAV, FullLink, Group, log, PART_BASE, Phone, UnknownScreen, WRAP } from "./kit";
import {
    ALL_CASES,
    DEMO_CASE,
    DEMO_ID,
    KONKUK,
    MISSED_CASES,
    NAMEPLATES,
    ONE_TRAIN_CASES,
    SMALL_CASES,
    STATE_ROWS,
    TITLES,
    WALK_CASES,
    type ScreenCase,
    type Station,
    type Walk,
} from "./u2-cases";

/*
 * U2 미리보기 — 판정 화면 (plan.md U2 5)).
 *   눌러 보기 · 판정 화면 5종 × (방금 / 1분 전 정보 / 받는 중) · 「이번 열차」가 못 타는 줄일 때
 *   · 「승강장까지」 줄(위치 화살표 · 약) · 열차가 한 대뿐일 때 · 작은 화면 375 × 667
 *   · 역명판(긴 역명 · 끝 역 · 우이신설선) · 판정 글자 6종
 *
 * 이 파일이 "use client"인 까닭: 화면에 넘기는 콜백(누르면 콘솔에 찍기)과 「눌러 보기」의 가짜 상태(useState) 때문이다.
 * 가짜 데이터는 u2-cases.ts에, 가짜 상태와 콜백은 이 파일에만 있다. src/ui의 컴포넌트에는 상태가 없다.
 */

/* ───────────────────────── 가짜 콜백 · 가짜 props ───────────────────────── */

/** 이 묶음에서는 「승강장까지」 시트를 열지 않는다 (시트는 U3 묶음에서 눌러 본다). 닫힌 시트의 값만 채워 둔다 */
const closedSheet = (walk: Walk, where: string): PlatformTimeSheetProps => ({
    open: false,
    onOpenChange: (open) => log(where, `시트 onOpenChange(${open})`),
    walkSec: walk.walkSec,
    runSec: walk.runSec,
    canDecrease: true,
    canIncrease: true,
    onDecrease: () => log(where, "시트 onDecrease()"),
    onIncrease: () => log(where, "시트 onIncrease()"),
    onSelectChip: (sec) => log(where, `시트 onSelectChip(${sec})`),
    location: { status: "hidden" },
    onUseLocation: () => log(where, "시트 onUseLocation()"),
});

/** 가짜 데이터 한 장 → 판정 화면 props. 콜백은 전부 콘솔에 찍기만 한다 */
function toProps(c: ScreenCase): VerdictScreenProps {
    return {
        nameplate: { ...(c.station ?? KONKUK), onSelect: (side) => log(c.id, `역명판 onSelect("${side}")`) },
        verdict: c.verdict,
        card: {
            platformTime: { ...c.walk, sheetOpen: false, onPress: () => log(c.id, "「승강장까지」 줄 onPress()") },
            trains: c.trains,
            refresh: { ...c.refresh, spinOnceKey: 0, onRefresh: () => log(c.id, "새로고침 onRefresh()") },
            showPendingRow: c.pending ?? false,
        },
        sheet: closedSheet(c.walk, c.id),
        bottomNav: BOTTOM_NAV,
    };
}

/* ───────────────────────── 눌러 보기 (가짜 상태) ───────────────────────── */

/**
 * 눌러 보는 판정 화면의 가짜 상태. 실제 동작(다시 받기 · 5초 규칙 · ?dir 바꾸기 · 시트 열기)은 L3에서 영준이 짠다 —
 * 여기는 props가 바뀌면 화면이 어떻게 달라지는지만 보여 준다.
 *   역명판 양옆     → selected가 바뀐다
 *   새로고침 글자   → spinOnceKey가 1 커진다 (아이콘이 한 바퀴)
 *   「승강장까지」 줄 → sheetOpen이 뒤집힌다 (모양은 그대로이고 버튼의 aria-expanded만 바뀐다. 시트가 열리는 것은 U3 묶음의 눌러 보기에서)
 */
function useDemo() {
    const [selected, setSelected] = useState<Station["selected"]>("right");
    const [spinOnceKey, setSpinOnceKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [stale, setStale] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);

    const base = toProps(DEMO_CASE);
    const props: VerdictScreenProps = {
        ...base,
        nameplate: {
            ...base.nameplate,
            selected,
            onSelect: (side) => {
                log(DEMO_ID, `역명판 onSelect("${side}")`);
                setSelected(side);
            },
        },
        card: {
            ...base.card,
            platformTime: {
                ...base.card.platformTime,
                sheetOpen,
                onPress: () => {
                    log(DEMO_ID, "「승강장까지」 줄 onPress()");
                    setSheetOpen((open) => !open);
                },
            },
            refresh: {
                elapsedSec: stale ? 64 : 3,
                stale,
                refreshing,
                spinOnceKey,
                onRefresh: () => {
                    log(DEMO_ID, "새로고침 onRefresh()");
                    setSpinOnceKey((key) => key + 1);
                },
            },
        },
    };

    return {
        props,
        selected,
        spinOnceKey,
        sheetOpen,
        refreshing,
        stale,
        toggleRefreshing: () => setRefreshing((on) => !on),
        toggleStale: () => setStale((on) => !on),
        spinOnce: () => setSpinOnceKey((key) => key + 1),
    };
}

const TOGGLE =
    "h-8 cursor-pointer rounded-full border border-line bg-surface px-3 text-12 font-bold text-sub aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white";

/** 눌러 보기 보드: 휴대폰 칸 + 그 아래 「받는 중」 · 「1분 전 정보」를 켜고 끄는 버튼 */
function DemoBoard() {
    const demo = useDemo();

    return (
        <section className="w-97.5 flex-none">
            <BoardTitle name={DEMO_CASE.name} note={DEMO_CASE.note} />
            <Phone small={false}>
                <VerdictScreen {...demo.props} />
            </Phone>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <button type="button" className={TOGGLE} aria-pressed={demo.refreshing} onClick={demo.toggleRefreshing}>
                    받는 중 (refreshing)
                </button>
                <button type="button" className={TOGGLE} aria-pressed={demo.stale} onClick={demo.toggleStale}>
                    1분 전 정보 (stale)
                </button>
                <button type="button" className={TOGGLE} onClick={demo.spinOnce}>
                    한 바퀴만 (spinOnceKey + 1)
                </button>
                <p className="w-full text-12 font-semibold text-sub">
                    selected = {demo.selected} · spinOnceKey = {demo.spinOnceKey} · sheetOpen = {String(demo.sheetOpen)}
                </p>
            </div>
            <FullLink id={DEMO_ID} />
        </section>
    );
}

/** 눌러 보기를 한 장만 크게: 휴대폰 칸도 조절 버튼도 없이 화면만 */
function DemoFull() {
    const demo = useDemo();
    return <VerdictScreen {...demo.props} />;
}

/* ───────────────────────── 보드 ───────────────────────── */

/** 보드 = 제목 + 한 줄 설명 + 휴대폰 칸 + 「이 화면만 크게 보기」 */
function Board({ c }: { c: ScreenCase }) {
    return (
        <section className={`flex-none ${c.small ? "w-93.75" : "w-97.5"}`}>
            <BoardTitle name={c.name} note={c.note} />
            <Phone small={c.small ?? false}>
                <VerdictScreen {...toProps(c)} />
            </Phone>
            <FullLink id={c.id} />
        </section>
    );
}

/* ───────────────────────── 역명판 · 판정 글자만 따로 ───────────────────────── */

/** 역명판은 화면 틀의 data-tone을 보고 색을 고른다. 틀이 없으니 바탕색과 data-tone을 여기서 직접 준다 */
const PLATE_BG = {
    run: "bg-run",
    deadend: "bg-deadend",
    white: "bg-canvas shadow-[0_0_0_1px_var(--color-line)]",
};

function NameplateStrip({
    name,
    note,
    station,
    tone = "run",
    narrow = false,
}: {
    name: string;
    note: string;
    station: Station;
    tone?: keyof typeof PLATE_BG;
    narrow?: boolean;
}) {
    return (
        <section className={`flex-none ${narrow ? "w-93.75" : "w-97.5"}`}>
            <BoardTitle name={name} note={note} />
            <div data-tone={tone} className={`rounded-[18px] pb-3 ${PART_BASE} ${PLATE_BG[tone]}`}>
                <StationNameplate {...station} onSelect={(side) => log(`역명판 · ${name}`, `onSelect("${side}")`)} />
            </div>
        </section>
    );
}

/* ───────────────────────── 묶음 ───────────────────────── */

export function U2VerdictPreview() {
    // 375 폭에서 다시 볼 것: 가운데든 양옆이든 7자 이상인 이름이 있는 역명판
    const longNames = NAMEPLATES.filter(({ station }) =>
        [station.stationName, station.left, station.right].some((name) => name !== null && name.length >= 7),
    );
    const [basic] = NAMEPLATES;
    const ui = NAMEPLATES.find(({ station }) => station.lineName === "우이신설선") ?? basic;

    return (
        <section className="px-5 pb-20 break-keep" aria-labelledby="u2-title">
            <h2 id="u2-title" className="text-wordmark">
                U2 · 판정 화면
            </h2>
            <p className="mt-1.5 max-w-245 text-13 font-semibold text-sub">
                시안 design/v32.html과 나란히 놓고 봐요. 휴대폰 칸은 390 × 844, 작은 화면은 375 × 667이에요. 버튼을
                누르면 브라우저 콘솔에 「[미리보기 …]」 로그가 찍혀요. 하단 캡슐의 탭을 누르면 그 탭의 화면 한 장만
                크게 보기로 가요. 「이 화면만 크게 보기」는 실제 페이지처럼 한 장만 띄워요 (DevTools 390 · 375 폭, PC
                폭 확인용).
            </p>

            <Group
                title="눌러 보기"
                note="역명판 양옆을 누르면 고른 칸이 바뀌고, 새로고침 글자를 누르면 아이콘이 한 바퀴 돌아요 (spinOnceKey가 1 커짐). 아래 버튼으로 「받는 중」 · 「1분 전 정보」를 켜고 꺼요. 다시 받기 · 5초 규칙 같은 실제 동작은 L3에서 붙어요."
            >
                <DemoBoard />
            </Group>

            <Group
                title="판정 화면 5종 × 새로고침 글자 3가지"
                note="한 줄이 판정 하나예요. 왼쪽부터 방금 · 1분 전 정보(굵게) · 받는 중(아이콘이 돎). 색 · 판정 글자 · 캐릭터 자세 · 카드 간격 · 아이콘 크기(판정 대상 42px, 나머지 28px)를 시안과 비교해요."
            >
                <div className="flex flex-col gap-9">
                    {STATE_ROWS.map((row) => (
                        <div key={row.title} className="flex items-start gap-6 overflow-x-auto pb-1">
                            {row.cases.map((c) => (
                                <Board key={c.id} c={c} />
                            ))}
                        </div>
                    ))}
                </div>
            </Group>

            <Group
                title="「이번 열차」가 못 타는 줄일 때"
                note="새로고침 글자는 그 줄 오른쪽 끝 그대로이고 흐려지지 않아요. 그 줄만 12px쯤 높아져요 (71.5 → 83.9px — 못 타요 아이콘 36.4px이 새로고침 글자 아래로 내려가서)."
            >
                <div className={WRAP}>
                    {MISSED_CASES.map((c) => (
                        <Board key={c.id} c={c} />
                    ))}
                </div>
            </Group>

            <Group
                title="「승강장까지」 줄"
                note="줄 전체가 버튼이고 끝에 ›. 내 위치로 계산 중이면 앞에 위치 화살표, 어림값이면 숫자 앞에 「약」. 숫자는 10초 단위로 반올림해요 (396초 → 6분40초)."
            >
                <div className={WRAP}>
                    {WALK_CASES.map((c) => (
                        <Board key={c.id} c={c} />
                    ))}
                </div>
            </Group>

            <Group
                title="열차가 한 대뿐일 때"
                note="열차 줄은 받은 만큼 그려요. 대기 줄 이름은 순서대로 — 못 타는 줄이 하나면 「다음 열차」, 둘이면 「그다음 열차」."
            >
                <div className={WRAP}>
                    {ONE_TRAIN_CASES.map((c) => (
                        <Board key={c.id} c={c} />
                    ))}
                </div>
            </Group>

            <Group
                title="작은 화면 375 × 667"
                note="가장 빡빡한 경우들이에요. 「뛰어도 N 부족」과 새로고침 글자가 겹치지 않는지, 카드가 스크롤 없이 들어가는지, 「약」이 붙은 줄이 한 줄인지 봐요."
            >
                <div className={WRAP}>
                    {SMALL_CASES.map((c) => (
                        <Board key={c.id} c={c} />
                    ))}
                </div>
            </Group>

            <Group
                title="역명판"
                note="한 판 3칸. 고른 방면은 어두운 면 + 흰 글자. 가운데 역명이 7자 이상이면 한 단계 작게. 끝 역의 없는 쪽은 빈칸(누를 수 없음). 배지는 호선 숫자, 우이신설선만 「우이」. 양옆을 누르면 콘솔에 onSelect 로그가 찍혀요."
            >
                <div className={WRAP}>
                    {NAMEPLATES.map(({ name, note, station }) => (
                        <NameplateStrip key={name} name={name} note={note} station={station} />
                    ))}
                </div>

                <h4 className="mt-7 mb-3 text-14 font-extrabold">375 폭에서 긴 이름</h4>
                <div className={WRAP}>
                    {longNames.map(({ name, note, station }) => (
                        <NameplateStrip key={name} name={name} note={note} station={station} narrow />
                    ))}
                </div>

                <h4 className="mt-7 mb-3 text-14 font-extrabold">
                    다른 바탕 — 화면 틀의 tone에 따라 색이 바뀜
                    <small className="block text-12 font-semibold text-sub">
                        이 바탕을 쓰는 화면 전체(막다른 화면 · 판정 전 화면)는 아래 U3 묶음에 있어요
                    </small>
                </h4>
                <div className={WRAP}>
                    <NameplateStrip name="막다른 회색 (deadend)" note="색 화면과 같은 모양" station={basic.station} tone="deadend" />
                    <NameplateStrip name="흰 화면 (white)" note="흰 판 + 짙은 글자 · 배지 테두리 없음" station={basic.station} tone="white" />
                    <NameplateStrip name="흰 화면 + 우이신설선" note="짙은 글자 「우이」" station={ui.station} tone="white" />
                </div>
            </Group>

            <Group
                title="판정 글자 6종"
                note="전부 같은 크기예요 (높이 844 화면에서 48.5px · 굵기 900 · 자간 −0.045em). 「탈 열차가 아직 안 보여요」만 두 줄. 「열차가 없어요」 화면 전체는 U3."
            >
                <div className={WRAP}>
                    {TITLES.map(({ verdict, name, bg }) => (
                        <section key={verdict} className="w-97.5 flex-none">
                            <BoardTitle name={name} note="" />
                            {/* 글자 크기가 「화면 높이의 5.75%」라서, 높이 844짜리 칸을 만들고 위쪽 150px만 보이게 잘랐다 */}
                            <div className={`h-37.5 overflow-hidden rounded-[18px] ${PART_BASE} ${bg}`}>
                                <div className="@container-size h-211 pt-3.5">
                                    <VerdictTitle verdict={verdict} />
                                </div>
                            </div>
                        </section>
                    ))}
                </div>
            </Group>
        </section>
    );
}

/** 한 장만 브라우저 가득 — 페이지가 화면 컴포넌트를 쓰는 모습 그대로 (/preview?screen=이름) */
export function U2FullScreen({ id }: { id: string }) {
    if (id === DEMO_ID) return <DemoFull />;

    const found = ALL_CASES.find((c) => c.id === id);
    if (!found) return <UnknownScreen id={id} />;
    return <VerdictScreen {...toProps(found)} />;
}
