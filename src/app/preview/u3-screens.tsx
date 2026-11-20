"use client";

import { useState, type ReactNode } from "react";
import type { EmptyScreenProps, PlatformTimeRowProps, PlatformTimeSheetProps, VerdictScreenProps } from "@/types/ui";
import { EmptyScreen, LoadFailedScreen, OfflineScreen, StalledScreen } from "@/ui/station/dead-end-screens";
import { LoadingScreen } from "@/ui/station/loading-screen";
import { PlatformTimeAskScreen } from "@/ui/station/platform-time-ask-screen";
import { VerdictScreen } from "@/ui/station/verdict-screen";
import { BoardTitle, BOTTOM_NAV, CONTROL, FullLink, Group, log, Phone, UnknownScreen, WRAP } from "./kit";
import { KONKUK, type Station } from "./u2-cases";
import {
    ASK_CASES,
    DEAD_END_CASES,
    EMPTY_CASES,
    fakeDecrease,
    fakeIncrease,
    fakeJudge,
    fakeRunSec,
    LOADING_CASES,
    SHEET_CASES,
    U3_CASES,
    WALK_MAX,
    WALK_MIN,
    type SheetCase,
    type U3Case,
} from "./u3-cases";

/*
 * U3 미리보기 — 「승강장까지」 시트 · 「승강장까지 몇 분?」 · 막다른 화면 4종 · 로딩 (plan.md U3 5)).
 *
 * 이 파일이 "use client"인 까닭: 화면에 넘기는 콜백(누르면 콘솔에 찍기)과 시트의 가짜 상태(useState) 때문이다.
 * 가짜 데이터 · 가짜 계산은 u3-cases.ts에, 가짜 상태와 콜백은 이 파일에만 있다. src/ui의 컴포넌트에는 상태가 없다.
 */

/** 역명판: 누르면 콘솔에 찍기만 한다 (고른 칸은 안 바뀐다) */
const nameplateOf = (station: Station, where: string) => ({
    ...station,
    onSelect: (side: Station["selected"]) => log(where, `역명판 onSelect("${side}")`),
});

/* ───────────────────────── 시트가 붙는 화면 (가짜 상태) ───────────────────────── */

/** 지금 「승강장까지」 값. distanceM이 있으면 내 위치로 계산한 값이다 */
type Value = { walkSec: number; runSec: number; distanceM: number | null };

const initialValue = (c: SheetCase): Value => ({
    walkSec: c.walkSec,
    runSec: c.runSec ?? fakeRunSec(c.walkSec),
    distanceM: c.distanceM ?? null,
});

/**
 * 시트의 가짜 상태. 실제로는 L3에서 영준이 짠다 — 여기는 props가 바뀌면 화면이 어떻게 달라지는지만 보여 준다.
 *   「승강장까지」 줄        → open이 true
 *   완료 · Esc · 시트 바깥  → onOpenChange(false) → open이 false
 *   − · + · 칩             → walkSec가 바뀐다. 내 위치로 계산한 값이었으면 직접 고른 값으로 바뀐다
 * 값이 바뀌면 가짜 판정(u3-cases.ts fakeJudge)이 다시 돌아서 뒤의 판정 글자 · 색 · 캐릭터 · 카드가 같이 바뀐다.
 */
function useSheetDemo(c: SheetCase) {
    const [open, setOpen] = useState(c.open);
    const [value, setValue] = useState(() => initialValue(c));
    const { walkSec, runSec, distanceM } = value;
    const byLocation = distanceM !== null;

    /** ± · 칩을 누르면 직접 고른 값이 된다 (뛰면은 가짜 계산) */
    const choose = (sec: number) => setValue({ walkSec: sec, runSec: fakeRunSec(sec), distanceM: null });

    const row = {
        walkSec,
        runSec,
        sheetOpen: open,
        onPress: () => {
            log(c.id, "「승강장까지」 줄 onPress()");
            setOpen(true);
        },
    };
    // 내 위치로 계산한 값이면 「승강장까지」 앞에 위치 화살표가 붙는다
    const platformTime: PlatformTimeRowProps = byLocation
        ? { ...row, source: "location", approximate: false }
        : { ...row, source: "manual" };

    const sheet: PlatformTimeSheetProps = {
        open,
        onOpenChange: (next) => {
            log(c.id, `시트 onOpenChange(${next})`);
            setOpen(next);
        },
        walkSec,
        runSec,
        canDecrease: walkSec > WALK_MIN,
        canIncrease: walkSec < WALK_MAX,
        onDecrease: () => {
            log(c.id, "시트 onDecrease()");
            choose(fakeDecrease(walkSec));
        },
        onIncrease: () => {
            log(c.id, "시트 onIncrease()");
            choose(fakeIncrease(walkSec));
        },
        onSelectChip: (sec) => {
            log(c.id, `시트 onSelectChip(${sec})`);
            choose(sec);
        },
        location: distanceM === null ? { status: "hidden" } : { status: "active", distanceM, failed: false },
        onUseLocation: () => log(c.id, "시트 onUseLocation()"),
    };

    const nameplate = nameplateOf(c.station ?? KONKUK, c.id);

    let screen: ReactNode;
    if (c.screen === "empty") {
        const props: EmptyScreenProps = { nameplate, platformTime, sheet, bottomNav: BOTTOM_NAV };
        screen = <EmptyScreen {...props} />;
    } else {
        const judged = fakeJudge(walkSec, runSec);
        const props: VerdictScreenProps = {
            nameplate,
            verdict: judged.verdict,
            card: {
                platformTime,
                trains: judged.trains,
                refresh: {
                    elapsedSec: 10,
                    stale: false,
                    refreshing: false,
                    spinOnceKey: 0,
                    onRefresh: () => log(c.id, "새로고침 onRefresh()"),
                },
                showPendingRow: judged.pending,
            },
            sheet,
            bottomNav: BOTTOM_NAV,
        };
        screen = <VerdictScreen {...props} />;
    }

    return {
        screen,
        open,
        walkSec,
        runSec,
        byLocation,
        reset: () => {
            setOpen(c.open);
            setValue(initialValue(c));
        },
    };
}

/** 시트가 붙는 화면의 보드: 휴대폰 칸 + 그 아래 지금 props 값과 「처음으로」 */
function SheetBoard({ c }: { c: SheetCase }) {
    const demo = useSheetDemo(c);

    return (
        <section className={`flex-none ${c.small ? "w-93.75" : "w-97.5"}`}>
            <BoardTitle name={c.name} note={c.note} />
            <Phone small={c.small ?? false}>{demo.screen}</Phone>
            <div className="mt-3.5 flex items-center gap-2.5">
                <button type="button" className={CONTROL} onClick={demo.reset}>
                    처음으로
                </button>
                <p className="text-12 font-semibold text-sub">
                    open = {String(demo.open)} · walkSec = {demo.walkSec} · runSec = {demo.runSec}
                    {demo.byLocation && " · 내 위치"}
                </p>
            </div>
            <FullLink id={c.id} />
        </section>
    );
}

/** 시트가 붙는 화면을 한 장만 크게: 휴대폰 칸도 조절 버튼도 없이 화면만 */
function SheetFull({ c }: { c: SheetCase }) {
    return useSheetDemo(c).screen;
}

/* ───────────────────────── 상태가 없는 화면 ───────────────────────── */

/** 가짜 데이터 한 장 → 화면. 콜백은 전부 콘솔에 찍기만 한다 */
function StaticScreen({ c }: { c: Exclude<U3Case, SheetCase> }) {
    switch (c.kind) {
        case "ask":
            return (
                <PlatformTimeAskScreen
                    nameplate={nameplateOf(c.station ?? KONKUK, c.id)}
                    onSelectChip={(sec) => log(c.id, `onSelectChip(${sec})`)}
                    location={c.location}
                    onUseLocation={() => log(c.id, "onUseLocation()")}
                    bottomNav={BOTTOM_NAV}
                />
            );
        case "failed":
            return (
                <LoadFailedScreen
                    nameplate={nameplateOf(c.station ?? KONKUK, c.id)}
                    statusCode={c.statusCode}
                    onRetry={() => log(c.id, "onRetry()")}
                    bottomNav={BOTTOM_NAV}
                />
            );
        case "offline":
            return <OfflineScreen nameplate={nameplateOf(c.station ?? KONKUK, c.id)} bottomNav={BOTTOM_NAV} />;
        case "stalled":
            return (
                <StalledScreen
                    nameplate={nameplateOf(c.station ?? KONKUK, c.id)}
                    refreshing={c.refreshing}
                    onRefresh={() => log(c.id, "onRefresh()")}
                    bottomNav={BOTTOM_NAV}
                />
            );
        case "loading":
            return (
                <LoadingScreen
                    nameplate={c.station === null ? null : nameplateOf(c.station, c.id)}
                    locationStep={null}
                    bottomNav={BOTTOM_NAV}
                />
            );
    }
}

/** 보드 = 제목 + 한 줄 설명 + 휴대폰 칸 + 「이 화면만 크게 보기」 */
function Board({ c }: { c: U3Case }) {
    if (c.kind === "sheet") return <SheetBoard c={c} />;

    return (
        <section className={`flex-none ${c.small ? "w-93.75" : "w-97.5"}`}>
            <BoardTitle name={c.name} note={c.note} />
            <Phone small={c.small ?? false}>
                <StaticScreen c={c} />
            </Phone>
            <FullLink id={c.id} />
        </section>
    );
}

const boards = (cases: U3Case[]) => (
    <div className={WRAP}>
        {cases.map((c) => (
            <Board key={c.id} c={c} />
        ))}
    </div>
);

/* ───────────────────────── 묶음 ───────────────────────── */

export function U3ScreensPreview() {
    return (
        <section className="px-5 pb-20 break-keep" aria-labelledby="u3-title">
            <h2 id="u3-title" className="text-wordmark">
                U3 · 시트 · 판정 전 · 막다른 화면 · 로딩
            </h2>
            <p className="mt-1.5 max-w-245 text-13 font-semibold text-sub">
                시안 design/v32.html의 「승강장까지」 · 판정 전 · 막다른 화면 묶음과 나란히 놓고 봐요. 버튼을 누르면
                브라우저 콘솔에 「[미리보기 …]」 로그가 찍혀요. 시트가 올라오는 움직임 · 스켈레톤의 띠 · 「다시 받는
                중」 아이콘은 「동작 줄이기」가 켜져 있으면 멈춰 있어요 (DevTools → Rendering → prefers-reduced-motion:
                no-preference로 봐요).
            </p>

            <Group
                title="「승강장까지」 시트"
                note="전부 눌러 볼 수 있어요. 「승강장까지」 줄을 누르면 올라오고, 완료 · Esc · 시트 바깥(위쪽 화면)을 누르면 내려가요. − · + · 칩을 누르면 뒤의 판정 글자 · 색 · 캐릭터가 바로 바뀌어요 (가짜 계산 — 실제는 L3). 열리면 포커스가 시트로 들어가고 Tab은 시트 안에서만 돌아요 — 키보드로 목록을 넘기다 열린 예시에 들어가면 Esc로 닫고 지나가요. 「내 위치로 계산하기」 줄은 U7에서 채워요."
            >
                {boards(SHEET_CASES)}
            </Group>

            <Group
                title="「승강장까지 몇 분?」"
                note="도보 시간이 아직 없을 때의 흰 화면. 제목 아래 설명 줄 없이 칩만. 캐릭터는 서 있는 자세(흰 화면이라 회색). 칩을 누르면 콘솔에 onSelectChip(초)가 찍혀요. 검정 버튼 「내 위치로 계산하기」와 안내 한 줄은 U7에서 채워요."
            >
                {boards(ASK_CASES)}
            </Group>

            <Group
                title="막다른 화면 — 열차가 없어요"
                note="회색. 카드 맨 위 「승강장까지」 줄은 그대로(누르면 시트). 반대 방면 보기는 역명판의 반대쪽 칸을 누른 것과 같아요 — 콘솔에 역명판 onSelect가 찍혀요. 끝 역이라 반대쪽이 없으면 버튼을 숨겨요."
            >
                {boards(EMPTY_CASES)}
            </Group>

            <Group
                title="막다른 화면 — 불러오기 실패 · 오프라인 · 판정 멈춤"
                note="회색 + 서 있는 캐릭터. 문구는 결정.md 4절 그대로예요. 「다른 역 찾기」는 역 찾기 주소(/)로 가는 링크예요."
            >
                {boards(DEAD_END_CASES)}
            </Group>

            <Group
                title="로딩"
                note="흰 화면 + 판정 글자 자리 · 열차 카드 스켈레톤, 캐릭터 없음. 자리 크기가 판정 화면과 같아서 진짜 화면이 들어와도 밀리지 않아요."
            >
                {boards(LOADING_CASES)}
            </Group>
        </section>
    );
}

/** 한 장만 브라우저 가득 — 페이지가 화면 컴포넌트를 쓰는 모습 그대로 (/preview?screen=이름) */
export function U3FullScreen({ id }: { id: string }) {
    const found = U3_CASES.find((c) => c.id === id);
    if (!found) return <UnknownScreen id={id} />;
    // key: 다른 시트 예시로 옮겨 가면 새로 만들어서 그 예시의 처음 값 · 처음 시트 상태로 시작한다 (없으면 앞 예시에서 바꾼 값이 남는다)
    return found.kind === "sheet" ? <SheetFull key={found.id} c={found} /> : <StaticScreen c={found} />;
}
