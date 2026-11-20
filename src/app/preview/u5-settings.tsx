"use client";

import { useState, type ReactNode } from "react";
import type { ScreenTone, SettingKey, SettingSheetProps, SettingsScreenProps } from "@/types/ui";
import { SettingsScreen } from "@/ui/settings/settings-screen";
import { BottomNav } from "@/ui/shared/bottom-nav";
import { ScreenFrame } from "@/ui/shared/screen-frame";
import { BoardTitle, BOTTOM_NAV, CONTROL, FullLink, Group, log, PART_BASE, Phone, UnknownScreen, WRAP } from "./kit";
import { U2FullScreen } from "./u2-verdict";
import { U3FullScreen } from "./u3-screens";
import {
    DEFAULTS,
    fakeCanDecrease,
    fakeCanIncrease,
    fakeCanReset,
    fakeItem,
    fakeNudge,
    fakeStepValue,
    NAV_COLOR_CASES,
    NAV_OFF_CASES,
    NAV_WHITE_CASES,
    SEARCH_PLACE_ID,
    SETTING_SHEET_CASES,
    SETTINGS_CASES,
    U5_CASES,
    type NavCase,
    type SettingsCase,
} from "./u5-cases";

/*
 * U5 미리보기 — 하단 캡슐 3탭 · 설정 화면 · 설정 시트 · 캡슐을 붙인 화면들 (plan.md U5 4)).
 *
 * 이 파일이 "use client"인 까닭: 화면에 넘기는 콜백(누르면 콘솔에 찍기)과 설정의 가짜 상태(useState) 때문이다.
 * 가짜 데이터 · 가짜 계산은 u5-cases.ts에, 가짜 상태와 콜백은 이 파일에만 있다. src/ui의 컴포넌트에는 상태가 없다.
 */

/* ───────────────────────── 설정 화면 + 설정 시트 (가짜 상태) ───────────────────────── */

/**
 * 설정의 가짜 상태. 실제로는 L4에서 영준이 짠다(스토어 · 범위 · 어느 단계 사이인지 계산) — 여기는 props가 바뀌면 화면이 어떻게 달라지는지만 보여 준다.
 *   단계 버튼              → 그 항목의 값이 단계 값이 된다
 *   이름 줄(끝에 ›)        → 그 항목의 시트가 열린다
 *   시트의 − · +           → 값이 한 칸 움직인다 (뒤 화면의 단계 버튼 · 「직접 · 값」도 같이 바뀐다)
 *   완료 · Esc · 시트 바깥  → onOpenChange(false) → 시트가 닫힌다
 *   처음 값으로            → 네 값이 전부 「보통」으로
 * 어느 항목의 시트인지(sheetKey)는 닫힌 뒤에도 그대로 둔다 — 그래야 내려가는 동안 같은 내용이 보인다.
 * 시트의 값은 화면 props의 sheet로 넘긴다 (설정 화면이 시트까지 그린다).
 */
function useSettingsDemo(c: SettingsCase) {
    const [values, setValues] = useState(c.values);
    const [sheetKey, setSheetKey] = useState<SettingKey>(c.open ?? "walk");
    const [open, setOpen] = useState(c.open !== null);

    const change = (key: SettingKey, value: number) => setValues((before) => ({ ...before, [key]: value }));

    const value = values[sheetKey];
    const sheet: SettingSheetProps = {
        open,
        onOpenChange: (next) => {
            log(c.id, `시트 onOpenChange(${next})`);
            setOpen(next);
        },
        settingKey: sheetKey,
        item: fakeItem(sheetKey, value),
        canDecrease: fakeCanDecrease(sheetKey, value),
        canIncrease: fakeCanIncrease(sheetKey, value),
        onDecrease: () => {
            log(c.id, "시트 onDecrease()");
            change(sheetKey, fakeNudge(sheetKey, value, -1));
        },
        onIncrease: () => {
            log(c.id, "시트 onIncrease()");
            change(sheetKey, fakeNudge(sheetKey, value, 1));
        },
    };

    const screen: SettingsScreenProps = {
        items: {
            walk: fakeItem("walk", values.walk),
            run: fakeItem("run", values.run),
            station: fakeItem("station", values.station),
            margin: fakeItem("margin", values.margin),
        },
        onSelectStep: (key, step) => {
            log(c.id, `onSelectStep("${key}", ${step})`);
            change(key, fakeStepValue(key, step));
        },
        onOpenSheet: (key) => {
            log(c.id, `onOpenSheet("${key}")`);
            setSheetKey(key);
            setOpen(true);
        },
        canReset: fakeCanReset(values),
        onReset: () => {
            log(c.id, "onReset()");
            setValues(DEFAULTS);
        },
        sheet,
        bottomNav: { ...BOTTOM_NAV, active: "settings" },
    };

    return {
        // 페이지가 그리는 모양 그대로: 화면 컴포넌트 하나
        view: <SettingsScreen {...screen} />,
        values,
        open,
        sheetKey,
        reset: () => {
            setValues(c.values);
            setSheetKey(c.open ?? "walk");
            setOpen(c.open !== null);
        },
    };
}

/** 설정 보드: 휴대폰 칸 + 그 아래 지금 값과 「처음으로」(미리보기를 처음 상태로 — 화면 안의 「처음 값으로」와는 다른 버튼) */
function SettingsBoard({ c }: { c: SettingsCase }) {
    const demo = useSettingsDemo(c);
    const { walk, run, station, margin } = demo.values;

    return (
        <section className={`flex-none ${c.small ? "w-93.75" : "w-97.5"}`}>
            <BoardTitle name={c.name} note={c.note} />
            <Phone small={c.small ?? false}>{demo.view}</Phone>
            <div className="mt-3.5 flex items-center gap-2.5">
                <button type="button" className={`flex-none ${CONTROL}`} onClick={demo.reset}>
                    처음으로
                </button>
                <p className="text-12 font-semibold text-sub">
                    걷기 {walk} · 뛰기 {run} · 역 안 {station}초 · 여유 {margin}초 · 시트 ={" "}
                    {demo.open ? demo.sheetKey : "닫힘"}
                </p>
            </div>
            <FullLink id={c.id} />
        </section>
    );
}

/** 설정을 한 장만 크게: 휴대폰 칸도 조절 버튼도 없이 화면만 */
function SettingsFull({ c }: { c: SettingsCase }) {
    return useSettingsDemo(c).view;
}

const settingsBoards = (cases: SettingsCase[]) => (
    <div className={WRAP}>
        {cases.map((c) => (
            <SettingsBoard key={c.id} c={c} />
        ))}
    </div>
);

/* ───────────────────────── 하단 캡슐만 따로 ───────────────────────── */

/** 캡슐은 화면 틀의 data-tone을 보고 색을 고른다. 틀이 없으니 바탕색과 data-tone을 여기서 직접 준다 */
const STRIP_BG: Record<ScreenTone, string> = {
    walk: "bg-walk",
    slow: "bg-slow",
    run: "bg-run",
    tight: "bg-tight",
    miss: "bg-miss",
    deadend: "bg-deadend",
    white: "bg-canvas shadow-[0_0_0_1px_var(--color-line)]",
};

/** 캡슐 한 줄: 화면 맨 아래 88px만 잘라 온 모양 — 좌우 16px · 바닥에서 12px은 화면 틀이 캡슐을 띄우는 자리 값과 같다 */
function NavStrip({ c }: { c: NavCase }) {
    return (
        <section className="w-97.5 flex-none">
            <BoardTitle name={c.name} note={c.note} />
            <div data-tone={c.tone} className={`rounded-[18px] px-4 pt-5 pb-3 ${PART_BASE} ${STRIP_BG[c.tone]}`}>
                <BottomNav {...c.nav} />
            </div>
        </section>
    );
}

const navStrips = (cases: NavCase[]) => (
    <div className={WRAP}>
        {cases.map((c) => (
            <NavStrip key={c.name} c={c} />
        ))}
    </div>
);

/* ───────────────────────── 캡슐을 붙인 화면 ───────────────────────── */

/**
 * 역 찾기 자리 — 역 찾기 화면은 U6에서 만든다. 지금은 흰 화면 틀에 캡슐(역 찾기가 현재 탭)만 붙은 모습이다.
 * 가운데 점선 칸은 화면 컴포넌트가 아니라 미리보기가 얹은 표시다
 */
function SearchPlace() {
    return (
        <ScreenFrame tone="white" nameplate={null} bottomNav={{ ...BOTTOM_NAV, active: "search" }}>
            <p className="m-auto rounded-[20px] border border-dashed border-ink/25 px-6 py-7 text-center text-13 font-semibold text-sub">
                역 찾기 화면 자리
                <br />
                검색창 · 결과 목록은 U6에서 만들어요
            </p>
        </ScreenFrame>
    );
}

/** 다른 묶음(U2 · U3)의 화면 한 장을 그대로 가져와 캡슐이 붙은 모습을 본다 */
const ATTACHED: { id: string; name: string; note: string; screen: ReactNode }[] = [
    {
        id: "run-fresh",
        name: "판정 화면",
        note: "색 화면 · 판정이 현재 탭 · 카드 아래 76px 자리에 캡슐",
        screen: <U2FullScreen id="run-fresh" />,
    },
    {
        id: "sheet-open",
        name: "「승강장까지」 시트가 열렸을 때",
        note: "시트가 열차 카드와 캡슐을 덮음 (완료로 닫으면 캡슐이 다시 보임)",
        screen: <U3FullScreen id="sheet-open" />,
    },
    {
        id: "empty",
        name: "막다른 화면 (열차가 없어요)",
        note: "회색 화면의 캡슐",
        screen: <U3FullScreen id="empty" />,
    },
    {
        id: "ask",
        name: "판정 전 화면 (승강장까지 몇 분?)",
        note: "흰 화면의 캡슐 · 판정이 현재 탭",
        screen: <U3FullScreen id="ask" />,
    },
    {
        id: SEARCH_PLACE_ID,
        name: "역 찾기 자리",
        note: "화면은 U6 · 지금은 흰 화면 틀 + 캡슐(역 찾기가 현재 탭)만",
        screen: <SearchPlace />,
    },
];

/* ───────────────────────── 묶음 ───────────────────────── */

export function U5SettingsPreview() {
    return (
        <section className="px-5 pb-20 break-keep" aria-labelledby="u5-title">
            <h2 id="u5-title" className="text-wordmark">
                U5 · 하단 캡슐 · 설정 화면 · 설정 시트
            </h2>
            <p className="mt-1.5 max-w-245 text-13 font-semibold text-sub">
                시안 design/v32.html의 「설정」 묶음과 나란히 놓고 봐요. 버튼을 누르면 브라우저 콘솔에 「[미리보기 …]」 로그가
                찍혀요. 캡슐의 탭을 누르면 그 탭의 화면 한 장만 크게 보기로 가요 (거기서는 캡슐로 역 찾기 자리 · 판정 ·
                설정을 오갈 수 있어요). 시트가 올라오는 움직임과 뒤가 어두워지는 움직임은 「동작 줄이기」가 켜져 있으면
                멈춰 있어요 (DevTools → Rendering → prefers-reduced-motion: no-preference로 봐요).
            </p>

            <Group
                title="하단 캡슐 3탭"
                note="역 찾기 · 판정 · 설정. 현재 탭은 옅은 면 하나로만 표시해요. 탭은 링크이고, 판정 탭이 갈 역이 없으면(verdictHref: null) 꺼진 탭이 돼요 — 더 흐리고, 눌리지 않고, Tab으로도 멈추지 않아요. 색은 화면 바탕(흰 화면 / 색 화면)에 따라 바뀌어요."
            >
                <h4 className="mb-3 text-14 font-extrabold">흰 화면 — 현재 탭 셋</h4>
                {navStrips(NAV_WHITE_CASES)}

                <h4 className="mt-7 mb-3 text-14 font-extrabold">
                    꺼진 탭
                    <small className="block text-12 font-semibold text-sub">
                        꺼진 탭의 색은 결정.md · v32에 없어서 이미 있는 값을 가져다 썼어요 (흰 화면 #CBD5E1 = 시트의 꺼진 − +
                        색, 색 화면 흰색 22% = 구분선 색)
                    </small>
                </h4>
                {navStrips(NAV_OFF_CASES)}

                <h4 className="mt-7 mb-3 text-14 font-extrabold">색 화면 — 상태색 다섯 · 막다른 회색</h4>
                {navStrips(NAV_COLOR_CASES)}
            </Group>

            <Group
                title="설정 화면"
                note="전부 눌러 볼 수 있어요. 단계 버튼을 누르면 그 단계가 켜지고, 이름 줄(끝에 ›)을 누르면 그 항목의 시트가 올라와요. 단계에 없는 값이면 세 버튼이 꺼지고 이름 줄 오른쪽에 「직접 · 값」이 나와요. 「처음 값으로」는 바꾼 값이 있을 때만 켜져요 (값 · 범위 · 켜짐 여부는 가짜 계산 — 실제는 L4)."
            >
                {settingsBoards(SETTINGS_CASES)}
            </Group>

            <Group
                title="설정 시트"
                note="「승강장까지」 시트와 같은 모양에 칩 대신 비교 한 줄. 뒤가 어둡게 덮여요. − · +를 누르면 큰 숫자 · 비교 한 줄과 뒤 화면의 단계 버튼이 같이 바뀌어요. 완료 · Esc · 시트 바깥(어두운 곳)으로 닫혀요. 열리면 포커스가 시트로 들어가고 Tab은 시트 안에서만 돌아요 — 키보드로 목록을 넘기다 열린 예시에 들어가면 Esc로 닫고 지나가요. 범위(− +가 꺼지는 값)는 v32 그림의 예시 값이에요."
            >
                {settingsBoards(SETTING_SHEET_CASES)}
            </Group>

            <Group
                title="캡슐을 붙인 화면"
                note="화면 틀이 캡슐을 그려서 모든 화면에 붙었어요 — 위 U2 · U3 묶음의 모든 장에서도 점선 자리 표시 대신 진짜 캡슐이 보여요. 여기는 바탕별로 한 장씩만 모았어요."
            >
                <div className={WRAP}>
                    {ATTACHED.map(({ id, name, note, screen }) => (
                        <section key={id} className="w-97.5 flex-none">
                            <BoardTitle name={name} note={note} />
                            <Phone small={false}>{screen}</Phone>
                            <FullLink id={id} />
                        </section>
                    ))}
                </div>
            </Group>
        </section>
    );
}

/** 한 장만 브라우저 가득 — 페이지가 화면 컴포넌트를 쓰는 모습 그대로 (/preview?screen=이름) */
export function U5FullScreen({ id }: { id: string }) {
    if (id === SEARCH_PLACE_ID) return <SearchPlace />;

    const found = U5_CASES.find((c) => c.id === id);
    if (!found) return <UnknownScreen id={id} />;
    // key: 캡슐로 다른 설정 예시로 옮겨 가면(주소의 screen이 바뀌면) 새로 만들어서 그 예시의 처음 값 · 처음 시트 상태로 시작한다.
    // 없으면 같은 컴포넌트가 이어져서 앞 예시에서 바꾼 값이 남는다 (U5 검토 2번). 같은 주소(현재 탭)를 누르면 key가 같아 값이 그대로다
    return <SettingsFull key={found.id} c={found} />;
}
