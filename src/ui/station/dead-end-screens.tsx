import Link from "next/link";
import type { EmptyScreenProps, LoadFailedScreenProps, OfflineScreenProps, StalledScreenProps } from "@/types/ui";
import { chevronLeft, chevronRight, retry, trainOff } from "@/ui/shared/icons";
import { ScreenFrame } from "@/ui/shared/screen-frame";
import { PlatformTimeRow } from "./platform-time-row";
import { PlatformTimeSheet } from "./platform-time-sheet";
import { CARD_AREA, cardAreaUnderSheet, standingStage, TITLE_AREA } from "./screen-parts";
import { VerdictTitle } from "./verdict-title";

/*
 * 막다른 화면 4종 — 보여 줄 판정이 없을 때의 회색 화면 (결정.md 2절 · 4절, v32 스크립트 6절 WAIT · screen("none")).
 *   EmptyScreen 열차가 없어요 · LoadFailedScreen 불러오기 실패 · OfflineScreen 오프라인 · StalledScreen 판정 멈춤
 *
 * 넷 다 판정 화면과 세로 순서가 같다: 역명판 → 판정 글자 자리 → 서 있는 캐릭터 → 카드 자리. 문구는 결정.md 4절 그대로다.
 * 판정 글자 아래 설명(부제목)은 불러오기 실패 · 오프라인에만 있다 (결정.md 1절).
 * 두 줄짜리 제목(오프라인 · 판정 멈춤)은 한 단계 작은 크기(text-verdict-long)다.
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px.
 */

/** 큰 제목 한 줄 — 판정 글자와 같은 크기 */
const TITLE = "text-verdict";
/** 두 줄 제목 — 한 단계 작게 (844 높이에서 38px) */
const TITLE_LONG = "text-verdict-long";
/** 제목 아래 설명: 위 6px · 15.5px · 굵기 600 · 흰색 90% (v32 CSS 5절 .verdict .desc) */
const DESC = "mt-1.5 text-15.5 font-semibold text-on-sub";

/**
 * 흰 면 버튼 — 색 화면에서 가장 센 강조: 흰 면 + 그 화면의 -strong 글자 (결정.md 2절, v32 CSS 7절 .btn-solid).
 * 높이 42px · 좌우 18px · 글자 13.5px · 굵기 800 · 아이콘과 5px. 보이는 높이는 42px 그대로 두고 누르는 영역만 위아래 1px씩 넓혀 44px (::after).
 * 글자가 길어도 한 줄이고, 카드보다 길어지면 끝이 …으로 줄어든다
 */
const SOLID_BUTTON =
    "relative inline-flex h-10.5 max-w-full cursor-pointer items-center gap-1.25 self-center rounded-full bg-white px-4.5 text-13.5 font-extrabold tracking-normal whitespace-nowrap text-deadend-strong after:absolute after:inset-x-0 after:-inset-y-px";

/**
 * 글자 버튼 — 밑줄 글자 (v32 CSS 7절 .btn-text): 안쪽 여백 8 · 12px · 글자 13px · 굵기 700 · 흰색 90% · 밑줄은 글자에서 3px.
 * 보이는 높이(34px)는 그대로 두고 누르는 영역만 위아래 5px씩 넓혀 44px (::after)
 */
const TEXT_BUTTON =
    "relative self-center px-3 py-2 text-13 font-bold tracking-normal text-on-sub underline underline-offset-[3px] after:absolute after:inset-x-0 after:-inset-y-1.25";

/**
 * 열차가 없어요 — 고른 방면으로 가는 열차가 0대 (막다른 화면 1, 결정.md 4절 「빈 상태」, v32 emptyBody).
 * 카드 맨 위 「승강장까지」 줄은 그대로 두고(누르면 시트), 그 아래에 열차 그림 · 「이 방향으로 가는 열차가 없어요」 · 반대 방면 보기 버튼.
 *
 * 반대 방면 보기 = 역명판의 반대쪽 칸을 누른 것과 같다 (그 칸의 역 이름으로 글자를 쓰고, 누르면 nameplate.onSelect(반대쪽)).
 * 꺾쇠는 역명판과 같은 쪽에 둔다: 반대쪽이 왼쪽 칸이면 글자 앞에 ‹, 오른쪽 칸이면 글자 뒤에 ›.
 * 끝 역이라 반대쪽 이웃이 없으면(null) 버튼을 숨기고 문구만 둔다 — 갈 방면이 없어서.
 */
export function EmptyScreen({ nameplate, platformTime, sheet, bottomNav }: EmptyScreenProps) {
    const opposite = nameplate.selected === "left" ? "right" : "left";
    const oppositeName = nameplate[opposite];

    return (
        <ScreenFrame tone="deadend" nameplate={nameplate} bottomNav={bottomNav}>
            <VerdictTitle verdict="empty" />
            {standingStage}

            {/* 시트가 열려 있는 동안 카드를 숨기는 것은 판정 화면과 같다 (이 카드는 시트보다 낮아서 눈에 보이는 차이는 없다) */}
            <div className={cardAreaUnderSheet(sheet.open)}>
                <div className="overflow-hidden rounded-[20px] bg-on-fill">
                    <PlatformTimeRow {...platformTime} />

                    {/* 안쪽 여백 위 20 · 좌우 15 · 아래 18px, 사이 12px. 열차 그림은 46px 칸(모서리 15px, 흰색 16% 면) 안에 26px */}
                    <div className="flex flex-col items-center gap-3 px-3.75 pt-5 pb-4.5 text-center">
                        <span className="grid size-11.5 place-items-center rounded-[15px] bg-on-surface">{trainOff}</span>
                        <p className="text-15 font-bold">이 방향으로 가는 열차가 없어요</p>
                        {oppositeName !== null && (
                            <button type="button" onClick={() => nameplate.onSelect(opposite)} className={SOLID_BUTTON}>
                                {opposite === "left" && chevronLeft}
                                <span className="min-w-0 truncate">{`${oppositeName} 방면 보기`}</span>
                                {opposite === "right" && chevronRight}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <PlatformTimeSheet {...sheet} />
        </ScreenFrame>
    );
}

/**
 * 불러오기 실패 — 첫 화면부터 도착 정보를 못 받음 (막다른 화면 2, 결정.md 4절, v32 WAIT.fail).
 * 「불러오지 못했어요」 + 설명, 흰 면 버튼 「다시 시도」, 그 아래 글자 버튼 「다른 역 찾기」(역 찾기 주소로 가는 링크).
 * 상태 코드가 있으면 그 아래 작은 글자 「상태 코드 502」 — 12.5px · 굵기 600 · 흰색 72% · 가운데.
 * 쓰는 사람이 읽을 글이 아니라 확인용이라 화면에서 가장 작고 흐리다. 코드가 없는 네트워크 오류(null)면 이 줄이 없다.
 */
export function LoadFailedScreen({ nameplate, statusCode, onRetry, bottomNav }: LoadFailedScreenProps) {
    return (
        <ScreenFrame tone="deadend" nameplate={nameplate} bottomNav={bottomNav}>
            <div aria-live="polite" className={TITLE_AREA}>
                <h1 className={TITLE}>불러오지 못했어요</h1>
                <p className={DESC}>도착 정보를 가져오지 못했어요</p>
            </div>
            {standingStage}

            <div className={CARD_AREA}>
                <button type="button" onClick={onRetry} className={SOLID_BUTTON}>
                    {retry}
                    다시 시도
                </button>
                <Link href={bottomNav.searchHref} className={TEXT_BUTTON}>
                    다른 역 찾기
                </Link>
                {statusCode !== null && (
                    <p className="text-center text-12.5 font-semibold text-on-faint">{`상태 코드 ${statusCode}`}</p>
                )}
            </div>
        </ScreenFrame>
    );
}

/**
 * 오프라인 — 첫 화면부터 인터넷이 끊김 (막다른 화면 3, 결정.md 4절, v32 WAIT.offline).
 * 두 줄 제목 「인터넷 연결을 / 확인해 주세요」 + 설명. 연결되면 알아서 다시 받으므로 버튼이 없다.
 * 카드 자리는 비어 있어도 그대로 둔다 — 하단 캡슐 자리를 비우고, 제목 · 캐릭터가 다른 막다른 화면과 같은 높이에 오게 한다.
 */
export function OfflineScreen({ nameplate, bottomNav }: OfflineScreenProps) {
    return (
        <ScreenFrame tone="deadend" nameplate={nameplate} bottomNav={bottomNav}>
            <div aria-live="polite" className={TITLE_AREA}>
                <h1 className={TITLE_LONG}>
                    인터넷 연결을
                    <br />
                    확인해 주세요
                </h1>
                <p className={DESC}>연결되면 자동으로 다시 불러와요</p>
            </div>
            {standingStage}

            <div className={CARD_AREA} />
        </ScreenFrame>
    );
}

/**
 * 판정 멈춤 — 마지막으로 받은 지 120초 이상 (막다른 화면 4, 결정.md 4절, v32 WAIT.hold).
 * 두 줄 제목 「도착 정보를 / 못 받고 있어요」, 설명 없이 흰 면 버튼 「다시 받기」 하나.
 *
 * refreshing(다시 받는 중)이면 버튼의 ↻가 0.7초에 한 바퀴씩 돈다 — 새로고침 글자 버튼과 같은 규칙이다
 * (결정.md 4절 「받는 동안만 아이콘이 돈다」. 이 화면의 받는 중 그림은 v32에 없다). 버튼은 그대로 누를 수 있고,
 * 받는 중에 또 누른 것을 무시하는 것은 로직이 한다.
 */
export function StalledScreen({ nameplate, refreshing, onRefresh, bottomNav }: StalledScreenProps) {
    return (
        <ScreenFrame tone="deadend" nameplate={nameplate} bottomNav={bottomNav}>
            <div aria-live="polite" className={TITLE_AREA}>
                <h1 className={TITLE_LONG}>
                    도착 정보를
                    <br />
                    못 받고 있어요
                </h1>
            </div>
            {standingStage}

            <div className={CARD_AREA}>
                <button type="button" onClick={onRefresh} aria-busy={refreshing} className={SOLID_BUTTON}>
                    <span className={refreshing ? "animate-refresh-spin motion-reduce:animate-none" : undefined}>
                        {retry}
                    </span>
                    다시 받기
                </button>
            </div>
        </ScreenFrame>
    );
}
