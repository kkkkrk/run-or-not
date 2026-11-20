import type { PlatformTimeRowProps } from "@/types/ui";
import { formatDuration, roundTo10 } from "@/ui/shared/format";
import { chevronRight, locationArrow } from "@/ui/shared/icons";

/**
 * 「승강장까지 걸으면 N · 뛰면 N」 줄 — 열차 카드 맨 위에 한 번만. 줄 전체가 버튼이고 끝에 › (결정.md 1절, v32 CSS 7절 .vA-common).
 * 누르면 onPress로 알리기만 한다. 시트를 여는 것은 페이지가 한다.
 *
 * - 내 위치로 계산 중(source "location")일 때만 「승강장까지」 앞에 작은 위치 화살표 (11px, 흰색 90%)
 * - 어림값(approximate)이면 숫자 앞에 「약」. 글자가 늘어난 만큼 간격을 줄여서 375 폭에서도 한 줄이다 (14 → 10px, 5 → 3px)
 * - 그래도 넘치면 숫자는 그대로 두고 「승강장까지」 글자가 먼저 줄어든다 (…)
 * - 숫자는 10초 단위로 반올림해서 쓴다
 *
 * 화면 낭독기에는 보이는 글자를 그대로 읽히고(걸으면 3분20초 뛰면 1분50초), 눈에만 보이는 것 —
 * 위치 화살표의 뜻과 「누르면 고친다」 — 만 숨은 글자(sr-only)로 더했다.
 *
 * 크기 클래스의 숫자는 4를 곱하면 시안의 px다: px-3.75 py-2.75 = 좌우 15px · 위아래 11px (줄 높이 44.4px), gap-3.5 = 14px.
 */
export function PlatformTimeRow(props: PlatformTimeRowProps) {
    const { walkSec, runSec, onPress, sheetOpen } = props;
    const byLocation = props.source === "location";
    const approximate = props.source === "location" && props.approximate;

    /** 「걸으면 3분20초」 한 쌍 */
    const pair = (label: string, sec: number) => (
        <span className={`flex items-baseline ${approximate ? "gap-0.75" : "gap-1.25"}`}>
            <span className="text-12.5 font-semibold text-on-sub">{approximate ? `${label} 약` : label}</span>
            <b className="text-16 font-extrabold tracking-num tabular-nums">{formatDuration(roundTo10(sec))}</b>
        </span>
    );

    return (
        <button
            type="button"
            aria-expanded={sheetOpen}
            onClick={onPress}
            className="flex w-full cursor-pointer items-center gap-2.5 bg-black/16 px-3.75 py-2.75 text-left tracking-normal"
        >
            <span className="flex min-w-0 items-center gap-1 overflow-hidden text-12 font-bold whitespace-nowrap text-on-sub">
                {byLocation && locationArrow(11)}
                <span className="min-w-0 truncate">승강장까지</span>
                {byLocation && <span className="sr-only">(내 위치로 계산 중)</span>}
            </span>

            <span
                className={`ml-auto flex flex-none items-baseline whitespace-nowrap ${
                    approximate ? "gap-2.5" : "gap-3.5"
                }`}
            >
                {pair("걸으면", walkSec)}
                {pair("뛰면", runSec)}
            </span>

            <span className="-mr-0.75 -ml-0.5 grid flex-none place-items-center text-on-faint">{chevronRight}</span>
            <span className="sr-only">수정</span>
        </button>
    );
}
