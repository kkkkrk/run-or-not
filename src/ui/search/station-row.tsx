import type { ReactNode } from "react";
import type { SearchResultRow, StationRowBase } from "@/types/ui";
import { lineBadgeText, UI_LINE } from "@/ui/shared/format";
import { locateChevron, locationArrow } from "@/ui/shared/icons";

/*
 * 역 찾기 목록 줄의 조각 — 결과 · 가까운 역 · 최근 본 역 줄과 「내 위치로 찾기」 줄이 같이 쓴다
 * (결정.md 6절 「목록 줄 모양은 하나다」 · 값 표, v39 CSS 11절 .list · .row · .row-n · .row-r · .lic · .hit, 4절 .badge).
 *
 * 줄 모양은 하나다: [26px 칸] [이름 …말줄임] [오른쪽 끝 값]. 26px 칸에는 호선 배지나 위치 아이콘이 들어간다.
 * 그래서 어느 목록에서나 왼쪽 칸은 화면 왼쪽에서 31px(카드 바깥 16 + 테두리 1 + 안쪽 14), 이름은 68px(+ 칸 26 + 사이 11)에서 시작한다.
 *
 * 컴포넌트가 아니라 클래스 글자와 「그림 조각」이다 (station/screen-parts.tsx와 같은 방식 — props 타입은 ui.ts에 있는 것만 쓴다).
 * 줄을 감싸는 요소는 쓰는 쪽(station-search-screen.tsx)이 정한다: 가까운 역 · 최근 본 역 줄은 <button>, 결과 줄은 콤보박스의 option.
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: mx-4 = 16px, min-h-14 = 56px, gap-2.75 = 11px, px-3.5 = 14px, size-6.5 = 26px, -mr-1 = −4px.
 */

/** 목록 카드 (v39 .list): 흰 면 + 테두리 1px + 모서리 20px, 좌우 바깥 여백 16px. 줄이 모서리 밖으로 나가지 않게 자른다 */
export const LIST = "mx-4 flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface";

/**
 * 줄 상자 (v39 .row): 높이 56px · 좌우 14px · 칸 사이 11px. 둘째 줄부터 위에 구분선 1px — 선은 56px 안에 들어간다.
 * 키보드 포커스 표시는 2px 안쪽으로 들인다: 줄이 카드 폭을 꽉 채워서, 그대로 두면 표시의 좌우가 카드 모서리에 잘린다
 */
export const rowBox = (index: number) =>
    `flex min-h-14 w-full items-center gap-2.75 px-3.5 text-left -outline-offset-2 ${index > 0 ? "border-t border-line" : ""}`;

/**
 * 줄의 큰 글자 (v39 .row-n · .ell): 굵기 800 · 자간 −0.03em · 줄 높이 1.25. 남는 폭을 다 쓰고, 넘치면 이쪽만 …으로 줄인다.
 * (leading-tight = 1.25, tracking-num = −0.03em — 숫자용으로 만든 토큰과 값이 같아서 그 이름으로 쓴다)
 */
const NAME = "min-w-0 flex-1 truncate leading-tight font-extrabold tracking-num";

/**
 * 호선 배지 (v39 .badge, 결정.md 1절 · 값 표): 지름 26px 원 · 노선색 면 · 흰 숫자 13.5px / 800.
 * 우이신설선만 숫자 대신 「우이」 11px · 자간 −0.06em · 짙은 글자다 (노선색이 밝아서 — 역명판 배지와 같은 규칙).
 * 「우이」 크기는 역명판 배지(24px 원)가 10px이고 여기(26px 원)는 11px이다: 숫자가 12.5 → 13.5px로 1px 큰 만큼 같이 키웠다
 * (2026-11-20 영준이 /preview에서 10px와 견줘 보고 고름. 결정.md에는 10px만 적혀 있다).
 * 색은 줄 props로 받은 값을 그대로 칠한다. 화면 낭독기에는 숨긴다 — 호선은 줄의 이름(aria-label)에 글자로 들어 있다
 */
const lineBadge = (lineName: string, lineColor: string) => (
    <span
        aria-hidden="true"
        style={{ backgroundColor: lineColor }}
        className={`grid size-6.5 flex-none place-items-center rounded-full font-extrabold ${
            lineName === UI_LINE ? "text-11 tracking-[-0.06em] text-ink" : "text-13.5 tracking-normal text-white"
        }`}
    >
        {lineBadgeText(lineName)}
    </span>
);

/**
 * 역 줄의 안쪽: 배지 + 역 이름 + 오른쪽 끝 값 (v39 fdRow · resultRows).
 * name은 글자 그대로이거나 일치한 글자를 칠한 조각(아래 matchedName)이다. trailing은 「태릉입구 방면」 · 「320m」 · 「7호선」.
 * 오른쪽 끝 값은 13.5px / 700 · 보조색이고 줄어들지 않는다 — 이름이 길면 이름만 줄어든다 (결정.md 6절)
 */
export const stationRowBody = (row: StationRowBase, name: ReactNode, trailing: string) => (
    <>
        {lineBadge(row.lineName, row.lineColor)}
        <span className={`${NAME} text-17`}>{name}</span>
        <span className="flex-none text-13.5 font-bold tracking-normal text-sub">{trailing}</span>
    </>
);

/**
 * 결과 줄의 역 이름 — 일치한 글자만 빨강(#AF2922)으로 칠한다 (v39 hl() · .hit). 빨강은 역 찾기에서 세 곳에만 쓰는 색이다.
 * 범위는 로직이 화면에 보이는 원래 이름 기준으로 넘긴다 (ui.ts SearchResultRow). 길이가 0 이하면 칠하지 않고,
 * 범위가 이름 밖으로 나가면 이름 안에 있는 만큼만 칠한다
 */
export const matchedName = ({ stationName, matchStart, matchLength }: SearchResultRow): ReactNode => {
    if (!(matchLength > 0)) return stationName;

    const start = Math.max(0, matchStart);
    const end = Math.max(start, matchStart + matchLength);
    return (
        <>
            {stationName.slice(0, start)}
            <span className="text-run-strong">{stationName.slice(start, end)}</span>
            {stationName.slice(end)}
        </>
    );
};

/**
 * 「내 위치로 찾기」 줄의 안쪽 (v39 LOC_ROW · BUSY_ROW): 위치 화살표 16px(26px 칸 · 빨강 #AF2922) + 글자 16px / 800 + 끝에 › 15px.
 * 확인 중(busy)에는 같은 줄이 보조색 글자가 되고 ›가 없다. ›는 오른쪽으로 4px 내어 끝을 다른 줄의 오른쪽 글자 끝과 맞춘다
 */
export const locateRowBody = (label: string, busy: boolean) => (
    <>
        <span className="grid size-6.5 flex-none place-items-center text-run-strong">{locationArrow(16)}</span>
        <span className={`${NAME} text-16 ${busy ? "text-sub" : ""}`}>{label}</span>
        {!busy && <span className="-mr-1 flex-none text-faint">{locateChevron}</span>}
    </>
);
