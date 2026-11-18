import type { PlatformTimeSheetProps } from "@/types/ui";
import { durationParts, formatDuration, roundTo10 } from "@/ui/shared/format";
import { minus, plus } from "@/ui/shared/icons";
import { SheetFrame, sheetStepButton, sheetValue } from "@/ui/shared/sheet-frame";
import { CHIP_ROW, timeChips } from "./screen-parts";

/**
 * 「승강장까지」 시트 — 「승강장까지」 줄을 누르면 아래에서 올라오는 흰 시트 (결정.md 1절, v32 CSS 10절 .bsheet.walk · sheetHTML()).
 * 위에서부터: (틀) 손잡이 · 「승강장까지 걸어서」 · 완료 → − 큰 숫자 + 와 그 아래 「뛰면 N · 자동 계산」 → 칩 3 · 5 · 7 · 10분.
 * 제목 아래 설명 줄은 없다. 값은 하나도 들고 있지 않다 — 누르면 콜백으로 알리고, 바뀐 값을 props로 다시 받아 그린다.
 *
 * - 큰 숫자: walkSec를 10초 단위로 반올림해 「3분 30초」로 쓴다 (「승강장까지」 줄의 걸으면 값과 같은 숫자). 숫자는 크게, 단위는 작게.
 *   값이 바뀌면 화면 낭독기가 새 값을 읽어 준다. − + 버튼과 큰 숫자의 모양은 설정 시트와 같이 쓴다 (shared/sheet-frame.tsx).
 * - 고른 칩: walkSec와 같은 칩. 지금 값이 내 위치로 계산한 값이면 칠한 칩이 없다 (ui.ts onSelectChip 주석).
 * - 높이: 시트 전체가 300px보다 낮아지지 않는다 (v32 .bsheet.walk min-height). 틀이 96px(위 10 + 손잡이 4 + 제목 줄 14 + 44 + 아래 24)라
 *   내용에 204px(min-h-51)을 준다. 남는 높이는 숫자 줄 위아래로 반씩 나뉜다 (my-auto).
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: pt-4 pb-3 = 위 16 · 아래 12px, gap-2 = 8px, gap-1.5 = 6px.
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

                {/* 위치 줄 자리 — U7에서 여기(칩 아래 6px)에 「내 위치로 계산하기」 버튼 · 안내 한 줄을 그린다 (location · onUseLocation).
                    그때까지 location은 칠할 칩을 고르는 데만 쓰고, onUseLocation은 받기만 한다 */}
            </div>
        </SheetFrame>
    );
}
