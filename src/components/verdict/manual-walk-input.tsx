'use client'
import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWalkTimeStore } from "@/stores/walk-time-store"

// 스토어 setMinutes와 같은 범위. 스토어는 범위 밖 값을 조용히 무시하므로 UI가 먼저 막는다
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;
const QUICK_MINUTES = [3, 5, 7, 10];
const FIRST_STEP_MINUTES = 5; // 입력이 비어 있을 때 ± 첫 탭에 채우는 값

// 입력 문자열 → 저장할 수 있는 분(정수 1~60). 아니면 null
// Number()만 쓰면 "1e1"(10)·"0x10"(16)도 통과하므로 숫자만 있는지 먼저 본다
function parseMinutes(draft: string): number | null {
    const text = draft.trim();
    if (!/^\d+$/.test(text)) return null;
    const minutes = Number(text);
    return minutes >= MIN_MINUTES && minutes <= MAX_MINUTES ? minutes : null;
}

export function ManualWalkInput({
    stationId,
    initialMinutes,
    onClose,
}: {
    stationId: string;
    initialMinutes?: number; // 수정할 때 저장값. 없으면 빈 칸으로 시작
    onClose?: () => void;    // 수정 화면 닫기. 있으면 「취소」 버튼을 보여 준다
}) {
    const setMinutes = useWalkTimeStore((s) => s.setMinutes);
    // 입력 도중 값은 로컬 draft. 확인을 누르기 전에는 스토어에 쓰지 않는다
    const [draft, setDraft] = useState(
        initialMinutes === undefined ? "" : String(initialMinutes)
    );
    const minutes = parseMinutes(draft);

    function save(value: number) {
        setMinutes(stationId, value);
        onClose?.();
    }

    // 비어 있거나 잘못된 값이면 첫 탭에 5, 그다음부터 ±1 (경계에서는 버튼이 비활성)
    function step(delta: 1 | -1) {
        setDraft(String(minutes === null ? FIRST_STEP_MINUTES : minutes + delta));
    }

    return (
        <form
            className="flex w-full max-w-xs flex-col items-center gap-5"
            onSubmit={(e) => {
                e.preventDefault(); // 폼 기본 동작(페이지 이동) 막기. 엔터로도 확인
                if (minutes !== null) save(minutes);
            }}
        >
            <h1 className="text-2xl font-bold text-slate-800">역까지 걸어서 몇 분 걸려요?</h1>

            {/* 빠른 선택: 탭하면 바로 저장 */}
            <div className="grid w-full grid-cols-4 gap-2">
                {QUICK_MINUTES.map((value) => (
                    <Button
                        key={value}
                        variant="outline"
                        className="h-12 text-base"
                        onClick={() => save(value)}
                    >
                        {value}분
                    </Button>
                ))}
            </div>

            {/* 직접 입력·±: 「확인」을 눌러야 저장 */}
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    className="size-12"
                    aria-label="1분 줄이기"
                    disabled={minutes !== null && minutes <= MIN_MINUTES}
                    onClick={() => step(-1)}
                >
                    <Minus className="size-5" />
                </Button>
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="분"
                    aria-label="도보 시간(분)"
                    aria-invalid={draft !== "" && minutes === null}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-12 w-24 rounded-xl border-2 border-slate-200 text-center text-xl tabular-nums outline-none focus:border-slate-400 aria-invalid:border-red-400"
                />
                <Button
                    variant="outline"
                    className="size-12"
                    aria-label="1분 늘리기"
                    disabled={minutes !== null && minutes >= MAX_MINUTES}
                    onClick={() => step(1)}
                >
                    <Plus className="size-5" />
                </Button>
            </div>

            {/* 저장할 수 없는 값일 때만 보이게. 자리는 항상 차지해서 화면이 덜컹이지 않게 */}
            <p
                className={`-mt-2 text-sm ${minutes !== null ? "invisible" : ""} ${draft === "" ? "text-slate-500" : "text-red-500"}`}
            >
                1~60분 사이로 입력해 주세요
            </p>

            <div className="flex w-full gap-2">
                {onClose && (
                    <Button variant="outline" className="h-12 flex-1 text-base" onClick={onClose}>
                        취소
                    </Button>
                )}
                <Button type="submit" className="h-12 flex-1 text-base" disabled={minutes === null}>
                    확인
                </Button>
            </div>
        </form>
    )
}
