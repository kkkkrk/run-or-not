import type { RefreshButtonProps } from "@/types/ui";
import { formatElapsed } from "@/ui/shared/format";
import { refreshArrow } from "@/ui/shared/icons";

/**
 * 새로고침 글자 버튼 「방금 ↻」 — 첫 열차 줄의 이름 줄 오른쪽 끝 (결정.md 4절 「새로고침」 · 「재요청 실패」, v32 CSS 7절 .rf).
 * 글자 + 아이콘 전체가 버튼이다. 누르면 onRefresh로 알리기만 하고, 다시 받을지 · 무시할지는 로직이 정한다.
 *
 * 글자: 받은 지 10초 안 「방금」, 그다음 10초 단위 「10초 전」 · 「20초 전」… stale(60초 이상)이면 굵은 「1분 전 정보」.
 * 누르는 영역: 보이는 크기는 그대로 두고 ::after로 위아래 14px · 좌우 8px 넓혀 44px를 넘긴다
 * (after:-inset-y-3.5 · after:-inset-x-2 — 크기 클래스의 숫자 × 4 = px. 글자 높이 17.5 + 28 = 45.5px).
 *
 * 아이콘이 도는 경우는 둘이고, 서로 다른 CSS 속성을 써서 겹쳐도 엉키지 않는다.
 *   1) refreshing — 받는 동안 0.7초에 한 바퀴씩 계속 돈다 (animate-refresh-spin, transform을 돌린다)
 *   2) spinOnceKey — 숫자가 1 커질 때마다 딱 한 바퀴 (받은 지 5초 안에 눌렀을 때의 신호).
 *      아이콘을 「spinOnceKey 바퀴」만큼 돌려 두고(rotate) transition을 걸었다. 숫자가 1 커지면 한 바퀴 더 돈 자리로
 *      0.7초 동안 옮겨 가므로 한 바퀴 도는 것으로 보인다. 상태도 effect도 없이 props만으로 「한 번만 재생」이 된다.
 *      transition은 값이 「바뀔 때」만 움직여서, 화면이 처음 그려질 때는 숫자가 몇이든 돌지 않는다.
 *      ※ 숫자가 1씩 커진다고 보고 만들었다. 2가 커지면 0.7초에 두 바퀴, 줄어들면 거꾸로 돈다.
 */
export function RefreshButton({ elapsedSec, stale, refreshing, spinOnceKey, onRefresh }: RefreshButtonProps) {
    const label = stale ? "1분 전 정보" : formatElapsed(elapsedSec);

    return (
        <button
            type="button"
            onClick={onRefresh}
            aria-label={stale ? "새로고침 · 1분 넘게 새 정보를 못 받았어요" : `새로고침 · ${label} 정보`}
            aria-busy={refreshing}
            className={`relative flex flex-none cursor-pointer items-center gap-1.25 text-12.5 tracking-normal whitespace-nowrap text-on-ink tabular-nums after:absolute after:-inset-x-2 after:-inset-y-3.5 ${
                stale ? "font-extrabold" : "font-semibold"
            }`}
        >
            <span>{label}</span>
            <span
                style={{ rotate: `${spinOnceKey}turn` }}
                className={`flex-none transition-[rotate] duration-700 ease-linear motion-reduce:transition-none ${
                    refreshing ? "animate-refresh-spin motion-reduce:animate-none" : ""
                }`}
            >
                {refreshArrow}
            </span>
        </button>
    );
}
