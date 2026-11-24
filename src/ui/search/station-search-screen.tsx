import { useId, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { StationSearchScreenProps } from "@/types/ui";
import { endsWithBatchim, formatDistance, formatDistanceLimit } from "@/ui/shared/format";
import { clearX, search } from "@/ui/shared/icons";
import { ScreenFrame } from "@/ui/shared/screen-frame";
import { LIST, locateRowBody, matchedName, rowBox, stationRowBody } from "./station-row";

/** 묶음 제목 「가까운 역」 · 「최근 본 역」 (v39 .sec): 13px / 700 · 보조색, 여백 위 18 · 좌우 31 · 아래 8px */
const GROUP_TITLE = "px-7.75 pt-4.5 pb-2 text-13 font-bold tracking-normal text-sub";

/** 안내 한 줄 (v39 .line1): 13.5px / 600 · 보조색 · 좌우 31px. 위 여백은 쓰는 곳에서 준다 (처음 연 사람 16px · 위치 거부 · 미지원 14px · 위치를 못 찾음 10px) */
const GUIDE_LINE = "px-7.75 text-13.5 font-semibold tracking-normal text-sub";

/** 카드 안 한 줄 (v39 .card1) — 결과 없음 · 가까이에 없음: 목록 카드와 같은 면에 안쪽 위아래 17 · 좌우 14px, 14.5px / 700 · 보조색 */
const CARD_LINE = "mx-4 rounded-[20px] border border-line bg-surface px-3.5 py-4.25 text-14.5 font-bold text-sub";

/** ↑↓로 고른 줄 (v39 .row.kbd): 카드에서 4px 안쪽 둥근 면 · 모서리 15px · 옅은 회색. 글자 뒤에 깔린다 */
const ACTIVE_ROW = "relative isolate before:absolute before:inset-1 before:-z-1 before:rounded-[15px] before:bg-fill";

/**
 * 결과 줄은 <button>이 아니라 option이라, 버튼이면 저절로 되는 것을 직접 준다: 손가락 모양 커서 · 누를 때 회색으로 번쩍이지 않기 ·
 * 더블탭 확대를 기다리지 않기(globals.css가 버튼 · 링크에 주는 것과 같다) · 길게 눌러도 글자가 골라지지 않기
 */
const OPTION = "cursor-pointer touch-manipulation select-none [-webkit-tap-highlight-color:transparent]";

/** 스크롤되는 자리 아래 여백 = 하단 캡슐이 떠 있는 자리 (캡슐 56 + 바닥 12 + 틈 12px, v39 .fd-body의 padding-bottom) */
const CAPSULE_SPACE = 80;
/** 검색창과 결과 카드 사이 (v39 .list.top · .card1.top의 margin-top) */
const RESULT_GAP = 12;

/** 지우기 버튼 · 결과 줄을 누르는 동안 포커스가 검색창을 떠나지 않게 한다 — 휴대폰에서 키보드가 내려갔다 다시 올라오지 않는다 */
const keepFocus = (event: MouseEvent) => event.preventDefault();

/**
 * ↑↓로 고른 줄이 보이는 곳 밖에 있으면 그 줄이 보일 만큼만 목록을 민다 — 고른 줄(option)의 ref다.
 * 줄이 「고른 줄」이 되는 순간에만 불린다 (ref가 붙을 때). 같은 줄이 계속 골라져 있는 동안에는 다시 불리지 않아서,
 * 손으로 스크롤한 자리를 도로 끌어가지 않는다.
 *
 * scrollIntoView를 쓰지 않은 까닭: 그 함수는 바깥의 스크롤까지 다 움직이고(미리보기 목록에서는 페이지가 통째로 끌려간다),
 * 줄을 스크롤 자리의 맨 아래에 맞추는데 거기에는 하단 캡슐이 떠 있어 줄이 캡슐 밑에 깔린다. 그래서 캡슐 자리(80px) 위까지만 보이는 곳으로 친다
 */
function keepInView(row: HTMLElement | null) {
    const box = row?.closest<HTMLElement>("[data-search-scroll]");
    if (!row || !box) return;

    const seen = box.getBoundingClientRect();
    const rect = row.getBoundingClientRect();
    // 위쪽은 결과 카드의 위 여백(12px) + 테두리(1px)만큼 띄운다 — 첫 줄로 돌아오면 목록이 딱 맨 위에 선다
    const top = seen.top + RESULT_GAP + 1;
    const bottom = seen.bottom - CAPSULE_SPACE;
    if (rect.top < top) box.scrollTop -= top - rect.top;
    else if (rect.bottom > bottom) box.scrollTop += rect.bottom - bottom;
}

/**
 * 검색어가 바뀌면 목록을 맨 위로 돌린다 — 스크롤되는 자리 안의 보이지 않는 표시(<span key={query}>)의 ref다.
 * 검색어가 바뀔 때마다 그 표시가 새로 만들어지면서 불린다. 안 하면 길게 내려 본 목록 자리에 새 결과가 중간부터 보인다
 */
function scrollToTop(mark: HTMLElement | null) {
    if (mark?.parentElement) mark.parentElement.scrollTop = 0;
}

/**
 * 역 찾기 화면 — 위에서부터 검색창 → 「가까운 역」 묶음 → 「최근 본 역」 묶음 → 하단 캡슐 (결정.md 6절 · 값 표,
 * v39 CSS 11절 .sf · .fd-body · .sec · .line1 · .card1, 스크립트 6-1절 FIND · mountFind). 흰 화면이고 역명판이 없다.
 * 값은 하나도 들고 있지 않다 — 글자를 치거나 줄을 누르면 콜백으로 알리고, 바뀐 값을 props로 다시 받아 그린다.
 *
 * 검색창 (역명판과 같은 자리 · 같은 알약: 위 7 · 좌우 12px · 높이 48px)
 *   진짜 <input>이고 값은 query 그대로다. 글자가 바뀔 때마다 onQueryChange, 한글 조합 시작 · 끝에 onComposingChange(true · false).
 *   테두리는 평소 옅은 선이고, 포커스가 있거나 글자가 있으면 같은 1px 그대로 색만 짙어진다 (돋보기도 같이) — 포커스 표시는 이것 하나다.
 *   글자가 있으면 오른쪽에 지우기 버튼(보이는 원 22px · 누르는 곳 44px) → onClearQuery. 누른 뒤 포커스는 검색창에 둔다.
 *   「취소」 · 뒤로 화살표는 없다. 열자마자 포커스를 주지 않는다 (키보드가 최근 본 역을 가린다 — 2026-11-20 영준 확인).
 *
 * 검색창 아래 (이 자리만 스크롤되고, 목록은 하단 캡슐 밑으로 지나간다) — 무엇을 그릴지는 results.status가 정한다
 *   "idle"  「가까운 역」 묶음 + 「최근 본 역」 묶음 (처음 화면)
 *   "list"  결과 카드. 줄 = 배지 · 역 이름(일치한 글자는 빨강) · 오른쪽 끝 「7호선」
 *   "none"  카드 안 한 줄 「「홍데」와 맞는 역이 없어요」. 조사는 검색어 끝 글자의 받침 소리로 고른다 (「강남」과 · 「종로6」과).
 *           검색어가 길어도 한 줄이다: 검색어 쪽만 …으로 줄고 「」와 맞는 역이 없어요」는 다 보인다 (U6 검토 2번 — 화면 낭독기는 전체를 읽는다)
 *   UI는 query가 비었는지를 보고 고르지 않는다 (ui.ts StationSearchResults).
 *
 * 콤보박스 (결정.md 6절 「만들 때 챙길 것」) — 입력칸 role="combobox", 결과 카드 listbox, 결과 줄 option
 *   입력 중에는 포커스가 검색창에 남는다. 결과 줄은 Tab으로 멈추지 않고, 검색창에서 ↑↓로 고른다 → onArrowDown · onArrowUp.
 *   고른 줄(results.activeIndex)에만 4px 안쪽 둥근 면이 보이고, 입력칸의 aria-activedescendant가 그 줄을 가리킨다.
 *   null이면(화살표를 아직 안 썼으면) 아무 줄에도 표시가 없다. 범위를 벗어난 번호도 없는 것으로 그린다.
 *   Enter · 휴대폰 키보드의 「검색」 → onEnter. 어느 줄로 갈지는 로직이 정한다. 결과 줄을 누르면 onSelectStation(역 id).
 *   한글 조합을 끝내는 데 쓰인 ↑ · ↓ · Enter는 넘기지 않는다 (isComposing이 true이거나 keyCode가 229 — 입력기가 가져간 키).
 *   그 키는 글자를 확정할 뿐이고, 브라우저에 따라(맥 크롬) 조합이 끝난 뒤 같은 키가 한 번 더 온다 — 둘 다 넘기면 ↓가 두 칸
 *   움직이고 Enter가 두 번 불린다. 사파리는 조합을 먼저 끝내고 그 키를 isComposing false · keyCode 229로 보내서 229도 같이 본다 (U6 검토 1번).
 *   Enter는 keydown과 폼 제출 두 길로 받는다: 휴대폰 키보드의 「검색」이 Enter keydown으로 오지 않는 경우와, 조합을 끝낸 Enter를
 *   브라우저가 그대로 제출로 잇는 경우를 폼 제출이 받는다. keydown에서 받았으면 기본 동작을 막아서 한 번만 불린다.
 *
 * 「가까운 역」 묶음 — 제목 아래 같은 자리에서 내용만 바뀐다 (nearby.status)
 *   "idle"      「내 위치로 찾기」 줄 + › → onFindNearby          "locating"  같은 줄이 「내 위치 확인 중…」 (누를 수 없음 · role="status")
 *   "list"      가까운 순서로 줄 = 배지 · 역 이름 · 거리 → onSelectStation(역 id)
 *   "none"      카드 안 한 줄 「2km 안에 판정할 수 있는 역이 없어요」 (거리 글자는 radiusM에서)
 *   "denied"    묶음이 통째로 빠지고, 안내 한 줄이 최근 본 역 아래에      "hidden"  묶음도 안내도 없다
 *   "failed"    (U7) idle과 같은 줄 + 그 카드 아래 10px에 안내 한 줄 「위치를 찾지 못했어요. 다시 누르거나 역 이름으로 찾아 주세요」.
 *               줄을 다시 누르면 onFindNearby → 로직이 "locating"으로 바꾸면서 안내가 사라진다
 *   "unsupported"  (U7) 거부와 같은 모양에 문구만 「이 브라우저에서는 위치를 쓸 수 없어요」
 *
 * 「최근 본 역」 묶음 — 줄 = 배지 · 역 이름 · 오른쪽 끝 「태릉입구 방면」 → onSelectRecent(역 id, 방면)
 *   0줄이면 제목 · 목록 대신 안내 한 줄. null(저장값 복원 전)이면 아무것도 그리지 않고 자리를 비운다 (2026-11-20 영준 확인).
 *   0줄 + 위치 거부 · 미지원(처음 연 사람)은 안내 두 줄을 차례로 둔다 — 「역을 한 번 보면…」 다음에 위치 안내 (결정.md 6절, 시안 v40 1-A).
 *
 * 낭독용 이름: 줄은 「공릉 7호선 태릉입구 방면」 · 「건대입구 7호선 320m」 · 「공덕 5호선」처럼 역 이름 · 호선 · 값 순서(aria-label)이고
 * 배지는 숨긴다. 화면 제목 「역 찾기」는 보이지 않는 <h1>으로 둔다 (그림에는 제목 줄이 없다).
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: 검색창 mx-3 mt-1.75 h-12 pl-4.5 pr-1 gap-2.25 = 좌우 12 · 위 7 · 높이 48 · 안쪽 왼쪽 18 · 오른쪽 4 · 사이 9px,
 * 지우기 size-11 · size-5.5 = 44 · 22px, 스크롤 자리 pb-20 = 80px, 묶음 제목 px-7.75 pt-4.5 pb-2 = 31 · 18 · 8px,
 * 카드 안 한 줄 py-4.25 = 17px, 결과 카드 mt-3 = 12px, 안내 한 줄 pt-4 · pt-3.5 · pt-2.5 = 16 · 14 · 10px, 고른 줄 inset-1 = 4px.
 */
export function StationSearchScreen(props: StationSearchScreenProps) {
    const { query, onQueryChange, onClearQuery, onComposingChange, onArrowDown, onArrowUp, onEnter } = props;
    const { results, onSelectStation, nearby, onFindNearby, recent, onSelectRecent, bottomNav } = props;

    const id = useId();
    const inputId = `${id}-input`;
    const listId = `${id}-list`;
    const optionId = (index: number) => `${id}-option-${index}`;
    const nearbyTitleId = `${id}-nearby`;
    const recentTitleId = `${id}-recent`;

    const typed = query !== "";
    const rows = results.status === "list" ? results.rows : null;
    // 고른 줄 번호. 없거나(null) rows 범위를 벗어나면 고른 줄이 없는 것으로 그린다
    const picked = results.status === "list" ? results.activeIndex : null;
    const activeIndex = picked !== null && rows !== null && Number.isInteger(picked) && picked >= 0 && picked < rows.length ? picked : null;

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        // 한글 조합을 끝내는 데 쓰인 키는 넘기지 않는다. 조합 중이면 isComposing이 true이고, 사파리는 조합을 먼저 끝낸 뒤에
        // 그 키를 isComposing false · keyCode 229로 보낸다 (229 = 입력기가 가져간 키). 둘 다 걸러야 글자만 확정되고 줄은 안 골라진다.
        // Enter는 기본 동작(폼 제출)도 막는다 — 안 막으면 onSubmit을 거쳐 onEnter가 불린다. 다른 키는 입력기 몫이라 그대로 둔다
        if (event.nativeEvent.isComposing || event.keyCode === 229) {
            if (event.key === "Enter") event.preventDefault();
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault(); // 폼 제출로 한 번 더 불리지 않게
            onEnter();
            return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        // Shift · Alt · Ctrl · ⌘와 같이 누른 화살표는 글자 고르기 · 커서 옮기기라서 브라우저에 맡긴다
        if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

        // 결과 카드가 있을 때만 커서가 입력칸 맨 앞 · 맨 뒤로 가는 기본 동작을 막는다
        if (rows !== null) event.preventDefault();
        if (event.key === "ArrowDown") onArrowDown();
        else onArrowUp();
    };

    /** 「가까운 역」 제목 아래의 내용. 묶음이 없는 상태(hidden · denied · unsupported)는 null */
    const nearbyBody = (): ReactNode => {
        switch (nearby.status) {
            case "idle":
            case "failed":
                return (
                    <>
                        <div className={LIST}>
                            <button
                                type="button"
                                aria-label="내 위치로 가까운 역 찾기"
                                onClick={onFindNearby}
                                className={`${rowBox(0)} cursor-pointer`}
                            >
                                {locateRowBody("내 위치로 찾기", false)}
                            </button>
                        </div>
                        {nearby.status === "failed" && (
                            <p role="status" className={`${GUIDE_LINE} pt-2.5`}>
                                위치를 찾지 못했어요. 다시 누르거나 역 이름으로 찾아 주세요
                            </p>
                        )}
                    </>
                );
            case "locating":
                return (
                    <div className={LIST}>
                        <div role="status" className={`${rowBox(0)} cursor-default`}>
                            {locateRowBody("내 위치 확인 중…", true)}
                        </div>
                    </div>
                );
            case "list":
                return (
                    // role="list": 목록 점을 없앤 <ul>은 사파리의 화면 낭독기가 목록으로 읽어 주지 않아서 다시 알려 준다
                    <ul role="list" className={LIST}>
                        {nearby.rows.map((row, index) => {
                            const distance = formatDistance(row.distanceM);
                            return (
                                <li key={row.stationId}>
                                    <button
                                        type="button"
                                        aria-label={`${row.stationName} ${row.lineName} ${distance}`}
                                        onClick={() => onSelectStation(row.stationId)}
                                        className={`${rowBox(index)} cursor-pointer`}
                                    >
                                        {stationRowBody(row, row.stationName, distance)}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                );
            case "none":
                return (
                    // 확인 중 줄에 이어 결과를 읽어 주게 role="status" (결과 없음 카드와 같은 까닭)
                    <p role="status" className={CARD_LINE}>
                        {`${formatDistanceLimit(nearby.radiusM)} 안에 판정할 수 있는 역이 없어요`}
                    </p>
                );
            default:
                return null;
        }
    };
    const nearbyContent = nearbyBody();

    /** 검색어 없이 보이는 처음 화면: 「가까운 역」 묶음 → 「최근 본 역」 묶음 → (거부했으면) 안내 한 줄 */
    const home = (
        <>
            {nearbyContent !== null && (
                <section aria-labelledby={nearbyTitleId}>
                    <h2 id={nearbyTitleId} className={GROUP_TITLE}>
                        가까운 역
                    </h2>
                    {nearbyContent}
                </section>
            )}

            {recent !== null && recent.length === 0 && (
                <p className={`${GUIDE_LINE} pt-4`}>역을 한 번 보면 여기에 최근 본 역이 생겨요</p>
            )}
            {recent !== null && recent.length > 0 && (
                <section aria-labelledby={recentTitleId}>
                    <h2 id={recentTitleId} className={GROUP_TITLE}>
                        최근 본 역
                    </h2>
                    <ul role="list" className={LIST}>
                        {recent.map((row, index) => {
                            const toward = `${row.directionName} 방면`;
                            return (
                                // 같은 역이 방면만 달리 두 번 올 수 있어서 방면까지 key에 넣는다
                                <li key={`${row.stationId}-${row.direction}`}>
                                    <button
                                        type="button"
                                        aria-label={`${row.stationName} ${row.lineName} ${toward}`}
                                        onClick={() => onSelectRecent(row.stationId, row.direction)}
                                        className={`${rowBox(index)} cursor-pointer`}
                                    >
                                        {stationRowBody(row, row.stationName, toward)}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {nearby.status === "denied" && (
                <p className={`${GUIDE_LINE} pt-3.5`}>브라우저 설정에서 위치를 허용하면 가까운 역을 보여 드려요</p>
            )}
            {nearby.status === "unsupported" && (
                <p className={`${GUIDE_LINE} pt-3.5`}>이 브라우저에서는 위치를 쓸 수 없어요</p>
            )}
        </>
    );

    /** 결과 없음 문구의 검색어: 앞뒤 공백만 뗀 글자 */
    const word = query.trim();

    return (
        <ScreenFrame tone="white" nameplate={null} bottomNav={bottomNav}>
            <h1 className="sr-only">역 찾기</h1>

            <form
                role="search"
                onSubmit={(event) => {
                    event.preventDefault();
                    onEnter();
                }}
                className={`mx-3 mt-1.75 flex h-12 flex-none items-center gap-2.25 rounded-full border bg-surface pr-1 pl-4.5 focus-within:border-ink focus-within:text-ink ${
                    typed ? "border-ink text-ink" : "border-line text-hint"
                }`}
            >
                {search}
                <input
                    id={inputId}
                    type="text"
                    role="combobox"
                    aria-label="역 이름 검색"
                    aria-autocomplete="list"
                    aria-expanded={rows !== null}
                    aria-controls={rows !== null ? listId : undefined}
                    aria-activedescendant={activeIndex !== null ? optionId(activeIndex) : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    placeholder="역 이름 검색"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onCompositionStart={() => onComposingChange(true)}
                    onCompositionEnd={() => onComposingChange(false)}
                    onKeyDown={onKeyDown}
                    // 포커스 표시는 알약의 짙은 테두리가 한다. outline-hidden은 평소에는 안 보이고, 색을 강제하는 고대비 모드에서만 테두리로 보인다
                    className="h-full min-w-0 flex-1 text-16.5 font-bold tracking-[-0.02em] text-ink caret-run outline-hidden placeholder:font-semibold placeholder:text-hint"
                />
                {typed && (
                    <button
                        type="button"
                        aria-label="검색어 지우기"
                        onMouseDown={keepFocus}
                        onClick={() => {
                            // 이 버튼은 검색어가 비면 사라진다. 키보드로 눌렀을 때 포커스가 갈 곳을 잃지 않게 먼저 검색창으로 옮긴다
                            document.getElementById(inputId)?.focus();
                            onClearQuery();
                        }}
                        className="grid size-11 flex-none cursor-pointer place-items-center rounded-full"
                    >
                        <span className="grid size-5.5 place-items-center rounded-full bg-faint text-white">{clearX}</span>
                    </button>
                )}
            </form>

            {/* 화면이 낮거나 줄이 많으면 이 자리만 따로 스크롤된다. 목록이 캡슐 밑으로 지나가게 아래 여백을 스크롤되는 안쪽에 둔다.
                tabIndex={-1}: 결과 줄은 Tab으로 멈추지 않는 option이라, 그대로 두면 크롬이 이 스크롤 자리 자체를 Tab 순서에 넣는다 */}
            <div
                data-search-scroll=""
                tabIndex={-1}
                className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-20 outline-none *:shrink-0 [&::-webkit-scrollbar]:hidden"
            >
                <span key={query} ref={scrollToTop} hidden />

                {rows !== null && (
                    <div role="listbox" id={listId} aria-label="검색 결과" className={`${LIST} mt-3`}>
                        {rows.map((row, index) => (
                            <div
                                key={row.stationId}
                                role="option"
                                id={optionId(index)}
                                aria-selected={index === activeIndex}
                                aria-label={`${row.stationName} ${row.lineName}`}
                                ref={index === activeIndex ? keepInView : undefined}
                                onMouseDown={keepFocus}
                                onClick={() => onSelectStation(row.stationId)}
                                className={`${rowBox(index)} ${OPTION} ${index === activeIndex ? ACTIVE_ROW : ""}`}
                            >
                                {stationRowBody(row, matchedName(row), row.lineName)}
                            </div>
                        ))}
                    </div>
                )}
                {results.status === "none" && (
                    // 세 조각을 한 줄에: 여는 낫표 · 검색어(길면 이쪽만 …) · 닫는 낫표부터 끝까지(줄어들지 않는다)
                    <p role="status" className={`${CARD_LINE} mt-3 flex`}>
                        <span className="flex-none">「</span>
                        <span className="min-w-0 truncate">{word}</span>
                        <span className="flex-none whitespace-nowrap">{`」${endsWithBatchim(word) ? "과" : "와"} 맞는 역이 없어요`}</span>
                    </p>
                )}
                {results.status === "idle" && home}
            </div>
        </ScreenFrame>
    );
}
