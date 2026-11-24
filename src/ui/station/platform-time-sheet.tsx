import type { ReactNode } from "react";
import type { PlatformTimeSheetProps, SheetLocation } from "@/types/ui";
import { durationParts, formatDistance, formatDuration, roundTo10 } from "@/ui/shared/format";
import { locationArrow, minus, plus } from "@/ui/shared/icons";
import { SheetFrame, sheetStepButton, sheetValue } from "@/ui/shared/sheet-frame";
import { CHIP_ROW, timeChips } from "./screen-parts";

/** 위치 줄 자리의 안내 한 줄 (v39 CSS 10절 .loc-hint): 위 12px · 가운데 · 12.5px / 600 · 보조색 */
const LOCATION_HINT = "mt-3 text-center text-12.5 font-semibold text-sub";

/**
 * 위치 버튼이 안내 글로 바뀌는 순간 포커스를 시트에 붙잡아 둔다 — 그 안내 글의 ref다.
 * 버튼을 눌러 브라우저 권한 창에서 거부하면 그 버튼이 사라지는데, 포커스가 그 버튼에 있었으면 갈 곳을 잃어 Esc가 시트에 닿지 않는다.
 * 포커스가 다른 곳에 있으면 건드리지 않는다. 닫힌 시트는 포커스를 받지 못해서(inert) 아무 일도 없다
 */
function keepFocusInSheet(hint: HTMLElement | null) {
    const sheet = hint?.closest<HTMLElement>('[role="dialog"]');
    const now = document.activeElement;
    if (sheet && (now === null || now === document.body)) sheet.focus({ preventScroll: true });
}

/**
 * 칩 아래 위치 줄 (결정.md 1절 「위치를 허용했을 때」 · 「위치를 못 얻었을 때」, v39 CSS 10절 .chip.loc · .loc-hint, sheetHTML()의 loc).
 * 버튼은 칩과 같은 모양(높이 46px · 모서리 12px)이고 시트 폭을 다 쓴다. 칩 아래 6px.
 *   idle         옅은 면 「내 위치로 계산하기」 → onUseLocation
 *   locating     같은 버튼이 보조색 글자 「내 위치 확인 중…」. 눌러도 아무 일도 없다 (포커스가 남게 disabled가 아니라 aria-disabled)
 *   active       검정 면 + 흰 글자 「내 위치로 계산 중 · 150m」 — 고른 칩처럼 칠한다. 다시 누르면 새로 계산한다 (onUseLocation)
 *   denied       버튼 대신 안내 한 줄        unsupported  버튼 대신 안내 한 줄        hidden  아무것도 없다
 * idle · active의 failed(방금 위치를 못 찾음): 버튼은 그대로 두고 그 아래에 한 줄. 언제 꺼지는지는 로직이 정한다 (ui.ts SheetLocation).
 * 자동인지 직접 입력인지는 검정으로 칠해진 것이 이 버튼인지 칩인지로만 보인다 (설명 줄 없음).
 */
const locationRow = (location: SheetLocation, onUseLocation: () => void): ReactNode => {
    if (location.status === "hidden") return null;
    if (location.status === "denied") {
        return (
            <p ref={keepFocusInSheet} className={LOCATION_HINT}>
                브라우저 설정에서 위치를 허용하면 알아서 계산해요
            </p>
        );
    }
    if (location.status === "unsupported") {
        return (
            <p ref={keepFocusInSheet} className={LOCATION_HINT}>
                이 브라우저에서는 위치를 쓸 수 없어요
            </p>
        );
    }

    const busy = location.status === "locating";
    const active = location.status === "active";
    return (
        <>
            <button
                type="button"
                aria-pressed={active}
                aria-disabled={busy ? true : undefined}
                onClick={busy ? undefined : onUseLocation}
                className={`mt-1.5 flex h-11.5 items-center justify-center gap-1.5 rounded-[12px] bg-fill px-4 text-14.5 font-bold tracking-normal aria-pressed:bg-ink aria-pressed:text-white ${
                    busy ? "cursor-default text-sub" : "cursor-pointer text-ink"
                }`}
            >
                {locationArrow(13)}
                <span>{busy ? "내 위치 확인 중…" : active ? "내 위치로 계산 중" : "내 위치로 계산하기"}</span>
                {location.status === "active" && (
                    <span className="font-semibold tabular-nums opacity-75">{`· ${formatDistance(location.distanceM)}`}</span>
                )}
            </button>
            {location.status !== "locating" && location.failed && (
                <p role="status" className={LOCATION_HINT}>
                    위치를 찾지 못했어요. 다시 누르거나 직접 골라 주세요
                </p>
            )}
        </>
    );
};

/**
 * 「승강장까지」 시트 — 「승강장까지」 줄을 누르면 아래에서 올라오는 흰 시트 (결정.md 1절, v32 CSS 10절 .bsheet.walk · sheetHTML()).
 * 위에서부터: (틀) 손잡이 · 「승강장까지 걸어서」 · 완료 → − 큰 숫자 + 와 그 아래 「뛰면 N · 자동 계산」 → 칩 3 · 5 · 7 · 10분 → 위치 줄.
 * 제목 아래 설명 줄은 없다. 값은 하나도 들고 있지 않다 — 누르면 콜백으로 알리고, 바뀐 값을 props로 다시 받아 그린다.
 *
 * - 큰 숫자: walkSec를 10초 단위로 반올림해 「3분 30초」로 쓴다 (「승강장까지」 줄의 걸으면 값과 같은 숫자). 숫자는 크게, 단위는 작게.
 *   값이 바뀌면 화면 낭독기가 새 값을 읽어 준다. − + 버튼과 큰 숫자의 모양은 설정 시트와 같이 쓴다 (shared/sheet-frame.tsx).
 * - 고른 칩: walkSec와 같은 칩. 지금 값이 내 위치로 계산한 값이면 칠한 칩이 없다 (ui.ts onSelectChip 주석).
 * - 위치 줄: 위 locationRow (U7).
 * - 높이: 시트 전체가 300px보다 낮아지지 않는다 (v32 .bsheet.walk min-height). 틀이 96px(위 10 + 손잡이 4 + 제목 줄 14 + 44 + 아래 24)라
 *   내용에 204px(min-h-51)을 준다. 남는 높이는 숫자 줄 위아래로 반씩 나뉜다 (my-auto).
 *   위치 버튼까지는 300px 안에 들어가고(약 290px), 버튼 아래에 「위치를 찾지 못했어요…」 한 줄이 붙을 때만 시트가 약 320px로 커진다.
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: pt-4 pb-3 = 위 16 · 아래 12px, gap-2 = 8px, gap-1.5 = 6px, mt-1.5 = 6px, h-11.5 = 46px, px-4 = 16px, mt-3 = 12px.
 */
export function PlatformTimeSheet(props: PlatformTimeSheetProps) {
    const { open, onOpenChange, walkSec, runSec, canDecrease, canIncrease, onDecrease, onIncrease, onSelectChip } = props;
    const { location, onUseLocation } = props;

    // 내 위치로 계산한 값이면 칠할 칩이 없다. 확인하는 동안에는 누르기 전 값이 어디서 왔는지(source)를 본다
    const byLocation =
        location.status === "active" || (location.status === "locating" && location.source === "location");

    return (
        <SheetFrame open={open} onOpenChange={onOpenChange} title="승강장까지 걸어서" description={null}>
            <div className="flex min-h-51 flex-col">
                <div className="my-auto flex items-center justify-between gap-2 pt-4 pb-3">
                    {sheetStepButton("30초 줄이기", minus, canDecrease, onDecrease)}

                    <div className="flex min-w-0 flex-col items-center gap-1.5">
                        {sheetValue(durationParts(roundTo10(walkSec)))}
                        <span className="text-13 font-semibold text-sub">
                            {`뛰면 ${formatDuration(roundTo10(runSec))} · 자동 계산`}
                        </span>
                    </div>

                    {sheetStepButton("30초 늘리기", plus, canIncrease, onIncrease)}
                </div>

                <div role="group" aria-label="빠른 선택" className={CHIP_ROW}>
                    {timeChips(onSelectChip, byLocation ? null : walkSec)}
                </div>

                {locationRow(location, onUseLocation)}
            </div>
        </SheetFrame>
    );
}
