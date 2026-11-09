'use client'
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Direction } from "@/types/subway"

// 2호선은 서울시 응답의 updnLine이 상행/하행이 아니라 내선/외선이다.
// arrivals.ts의 toDirection과 같은 대응: 상행·내선 → up, 하행·외선 → down
const LINE2_SUBWAY_ID = "1002";

/** 방향 라벨. 2호선은 내선(up)/외선(down), 나머지는 상행(up)/하행(down) */
export function getDirectionLabel(subwayId: string, dir: Direction): string {
    if(subwayId === LINE2_SUBWAY_ID) return dir === "up" ? "내선" : "외선";
    return dir === "up" ? "상행" : "하행";
}

/**
 * 주소의 ?dir만 바꾼다 (경로·다른 쿼리는 그대로).
 * router.replace가 아니라 replaceState인 이유:
 * - 방향은 이미 받은 도착 정보를 거르는 값이라 서버에 다시 갈 필요가 없다
 * - 방문 기록이 쌓이지 않아 뒤로 가기가 방향이 아니라 이전 페이지로 간다
 * Next가 replaceState를 감싸 두어서 useSearchParams가 새 값으로 다시 그려진다
 */
export function changeDirection(dir: Direction) {
    const url = new URL(window.location.href);
    url.searchParams.set("dir", dir);
    window.history.replaceState(null, "", url);
}

const DIRECTIONS: Direction[] = ["up", "down"];

export function DirectionToggle({ subwayId, dir }: {
    subwayId: string;
    dir: Direction;
}) {
    return (
        <ToggleGroup
            aria-label="방향"
            value={[dir]}
            onValueChange={(value) => {
                // 이미 눌린 쪽을 다시 누르면 빈 배열이 온다 → 무시해서 늘 한쪽이 선택돼 있게
                const next = value[0];
                if(next === "up" || next === "down") changeDirection(next);
            }}
            spacing={1}
            className="rounded-full border-2 border-gray-200 bg-white p-1"
        >
            {DIRECTIONS.map((d) => (
                <ToggleGroupItem
                    key={d}
                    value={d}
                    className="h-10 min-w-20 rounded-full px-5 text-base text-slate-500 aria-pressed:bg-slate-800 aria-pressed:text-white"
                >
                    {getDirectionLabel(subwayId, d)}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}
