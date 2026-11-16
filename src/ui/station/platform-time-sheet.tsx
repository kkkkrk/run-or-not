import { Fragment, type ReactNode } from "react";
import type { PlatformTimeSheetProps } from "@/types/ui";
import { durationParts, formatDuration, roundTo10 } from "@/ui/shared/format";
import { minus, plus } from "@/ui/shared/icons";
import { SheetFrame } from "@/ui/shared/sheet-frame";
import { CHIP_ROW, timeChips } from "./screen-parts";

/**
 * − · + 동그란 버튼 (v32 CSS 10절 .pm): 52px 원 · 옅은 면 · 아이콘 18px.
 * 더 못 줄이거나 못 늘릴 때는 disabled가 아니라 aria-disabled로 끈다 (아이콘이 흐려지고 눌러도 아무 일도 없다).
 * 키보드로 −를 계속 누르다 가장 작은 값에 닿았을 때, disabled로 바뀌면 그 버튼에 있던 포커스가 사라져서
 * Esc도 Tab도 시트에 닿지 않게 된다. aria-disabled는 포커스를 그 자리에 둔다.
 */
const stepButton = (label: string, icon: ReactNode, enabled: boolean, onPress: () => void) => (
    <button
        type="button"
        aria-label={label}
        aria-disabled={enabled ? undefined : true}
        onClick={enabled ? onPress : undefined}
        className="grid size-13 flex-none cursor-pointer place-items-center rounded-full bg-fill text-ink aria-disabled:cursor-default aria-disabled:text-[#CBD5E1]"
    >
        {icon}
    </button>
);

/**
 * 「승강장까지」 시트 — 「승강장까지」 줄을 누르면 아래에서 올라오는 흰 시트 (결정.md 1절, v32 CSS 10절 .bsheet.walk · sheetHTML()).
 * 위에서부터: (틀) 손잡이 · 「승강장까지 걸어서」 · 완료 → − 큰 숫자 + 와 그 아래 「뛰면 N · 자동 계산」 → 칩 3 · 5 · 7 · 10분.
 * 제목 아래 설명 줄은 없다. 값은 하나도 들고 있지 않다 — 누르면 콜백으로 알리고, 바뀐 값을 props로 다시 받아 그린다.
 *
 * - 큰 숫자: walkSec를 10초 단위로 반올림해 「3분 30초」로 쓴다 (「승강장까지」 줄의 걸으면 값과 같은 숫자). 숫자는 크게, 단위는 작게.
 *   <output>이라서 값이 바뀌면 화면 낭독기가 새 값을 읽어 준다.
 * - 고른 칩: walkSec와 같은 칩. 지금 값이 내 위치로 계산한 값이면 칠한 칩이 없다 (ui.ts onSelectChip 주석).
 * - 높이: 시트 전체가 300px보다 낮아지지 않는다 (v32 .bsheet.walk min-height). 틀이 96px(위 10 + 손잡이 4 + 제목 줄 14 + 44 + 아래 24)라
 *   내용에 204px(min-h-51)을 준다. 남는 높이는 숫자 줄 위아래로 반씩 나뉜다 (my-auto).
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: pt-4 pb-3 = 위 16 · 아래 12px, gap-2 = 8px, size-13 = 52px, ml-2 = 8px, ml-0.5 = 2px.
 */
export function PlatformTimeSheet(props: PlatformTimeSheetProps) {
    const { open, onOpenChange, walkSec, runSec, canDecrease, canIncrease, onDecrease, onIncrease, onSelectChip, location } =
        props;

    // 내 위치로 계산한 값이면 칠할 칩이 없다. 확인하는 동안에는 누르기 전 값이 어디서 왔는지(source)를 본다
    const byLocation =
        location.status === "active" || (location.status === "locating" && location.source === "location");

    return (
        <SheetFrame open={open} onOpenChange={onOpenChange} title="승강장까지 걸어서" description={null}>
            <div className="flex min-h-51 flex-col">
                <div className="my-auto flex items-center justify-between gap-2 pt-4 pb-3">
                    {stepButton("30초 줄이기", minus, canDecrease, onDecrease)}

                    <div className="flex min-w-0 flex-col items-center gap-1.5">
                        <output className="block text-center text-sheet-value whitespace-nowrap text-ink tabular-nums">
                            {durationParts(roundTo10(walkSec)).map(({ value, unit }, index) => (
                                <Fragment key={unit}>
                                    <b className={index > 0 ? "ml-2" : undefined}>{value}</b>
                                    <small className="ml-0.5 text-sheet-unit text-sub">{unit}</small>
                                </Fragment>
                            ))}
                        </output>
                        <span className="text-13 font-semibold text-sub">
                            {`뛰면 ${formatDuration(roundTo10(runSec))} · 자동 계산`}
                        </span>
                    </div>

                    {stepButton("30초 늘리기", plus, canIncrease, onIncrease)}
                </div>

                <div role="group" aria-label="빠른 선택" className={CHIP_ROW}>
                    {timeChips(onSelectChip, byLocation ? null : walkSec)}
                </div>

                {/* 위치 줄 자리 — U7에서 여기(칩 아래 6px)에 「내 위치로 계산하기」 버튼 · 안내 한 줄을 그린다 (location · onUseLocation).
                    그때까지 location은 칠할 칩을 고르는 데만 쓰고, onUseLocation은 받기만 한다 */}
            </div>
        </SheetFrame>
    );
}
