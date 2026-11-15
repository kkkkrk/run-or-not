import type { StationNameplateProps } from "@/types/ui";
import { chevronLeft, chevronRight } from "@/ui/shared/icons";

type Side = StationNameplateProps["selected"]; // "left" | "right"

/** 가운데 역명이 이 글자 수 이상이면 판 전체의 글자를 한 단계 줄인다 (결정.md 1절) */
const LONG_NAME_LENGTH = 7;

/** 배지에 숫자 대신 「우이」를 쓰는 하나뿐인 노선. 노선색(#B0CE18)이 밝아서 글자색도 이 노선만 짙다 (결정.md 1절) */
const UI_LINE = "우이신설선";

/**
 * 호선 배지에 쓸 글자 (결정.md 1절): 「7호선」 → 「7」, 우이신설선만 「우이」.
 * 그 밖의 이름(아직 없는 노선)은 정해진 모양이 없어서 글자 없이 노선색 원만 그린다
 */
function badgeText(lineName: string): string {
    if (lineName === UI_LINE) return "우이";
    return /^(\d+)호선$/.exec(lineName)?.[1] ?? "";
}

/**
 * 역명판 ‹ 이전역 · 현재역 · 다음역 › — 모든 역 화면 맨 위의 판 하나, 3칸 (결정.md 1절, v32 CSS 4절 .sn2).
 * 양옆 역을 누르면 onSelect("left" | "right")로 알리기만 한다. 어느 쪽이 고른 방면인지는 selected로 받는다.
 *
 * 색은 화면 틀의 data-tone을 본다: 색 화면(기본)은 어두운 반투명 판 + 흰 글자,
 * 흰 화면(in-data-[tone=white]:…)은 흰 판 + 짙은 글자다 (v32 CSS 9절 .th-light .sn2).
 *
 * 크기 클래스의 숫자는 4를 곱하면 시안의 px다: h-9.5 = 38px · px-2.25 = 9px · mt-1.75 = 7px · size-6 = 24px.
 * 판의 높이는 칸 38 + 안쪽 여백 4 × 2 + 테두리 1 × 2 = 48px (로딩 화면의 역명판 스켈레톤과 같은 높이).
 */
export function StationNameplate({
    stationName,
    lineName,
    lineColor,
    left,
    right,
    selected,
    onSelect,
}: StationNameplateProps) {
    const long = stationName.length >= LONG_NAME_LENGTH;
    const isUi = lineName === UI_LINE;

    /** 양옆 칸 하나. 이웃 역이 없으면(끝 역) 자리만 남긴 빈칸이고 누를 수 없다 */
    const sideCell = (side: Side, name: string | null) => {
        if (name === null) return <span aria-hidden="true" className="h-9.5" />;

        const on = selected === side;
        return (
            <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(side)}
                // 보이는 높이는 38px 그대로 두고, 누르는 영역만 위아래로 3px씩 넓혀 44px (::after)
                className={`relative flex h-9.5 min-w-0 cursor-pointer items-center justify-center gap-0.5 rounded-full tracking-normal after:absolute after:inset-x-0 after:-inset-y-0.75 ${
                    long ? "px-1.5 text-12.5" : "px-2.25 text-13.5"
                } ${
                    on
                        ? "bg-black/26 font-extrabold text-on-ink in-data-[tone=white]:bg-fill in-data-[tone=white]:text-ink"
                        : "font-bold text-on-faint in-data-[tone=white]:text-sub"
                }`}
            >
                {side === "left" && chevronLeft}
                <span className="min-w-0 truncate">{name}</span>
                {side === "right" && chevronRight}
            </button>
        );
    };

    return (
        <div
            role="group"
            aria-label="방면 전환"
            className="mx-3 mt-1.75 grid flex-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 rounded-full border border-white/10 bg-black/12 p-1 in-data-[tone=white]:border-line in-data-[tone=white]:bg-surface"
        >
            {sideCell("left", left)}

            <div
                className={`flex min-w-0 items-center justify-center font-heavy text-on-ink in-data-[tone=white]:text-ink ${
                    long ? "gap-1.25 px-0.75 text-14.5" : "gap-1.5 px-1.5 text-16.5"
                }`}
            >
                {/* 호선 배지: 노선색 원. 색 화면에서는 노선색이 바탕에 묻히지 않게 흰 테두리를 두른다.
                    우이신설선은 노선색이 밝아서 글자만 짙은 색이다 (흰 글자 대비 1.8:1, 결정.md 1절) */}
                <span
                    style={{ backgroundColor: lineColor }}
                    className={`grid size-6 flex-none place-items-center rounded-full font-extrabold shadow-[0_0_0_1.5px_rgb(255_255_255/0.85)] in-data-[tone=white]:shadow-none ${
                        isUi ? "text-10 tracking-[-0.06em] text-ink" : "text-12.5 text-white"
                    }`}
                >
                    <span aria-hidden="true">{badgeText(lineName)}</span>
                    <span className="sr-only">{lineName}</span>
                </span>
                <span className="min-w-0 truncate">{stationName}</span>
            </div>

            {sideCell("right", right)}
        </div>
    );
}
