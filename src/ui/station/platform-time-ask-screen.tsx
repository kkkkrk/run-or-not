import { useId } from "react";
import type { AskLocation, PlatformTimeAskScreenProps } from "@/types/ui";
import { locationArrow } from "@/ui/shared/icons";
import { ScreenFrame } from "@/ui/shared/screen-frame";
import { CARD_AREA, CHIP_ROW, standingStage, timeChips, TITLE_AREA } from "./screen-parts";

/** 카드 아래 안내 한 줄의 문구 (결정.md 1절 「위치를 허용했을 때」 · 「위치를 못 얻었을 때」). 안내가 없는 상태는 null */
const HINT: Record<AskLocation, string | null> = {
    hidden: null,
    idle: null,
    failed: "위치를 찾지 못했어요. 다시 누르거나 직접 골라 주세요",
    denied: "브라우저 설정에서 위치를 허용하면 다음부터 알아서 계산해요",
    unsupported: "이 브라우저에서는 위치를 쓸 수 없어요",
};

/**
 * 「승강장까지 몇 분?」 — 도보 시간이 아직 없을 때의 흰 화면 (결정.md 1절, v32 CSS 9절 .ask-card · .or, 스크립트 4절 whiteHTML()).
 * 위에서부터: 역명판 → 제목 「승강장까지 몇 분?」(판정 글자 자리 · 같은 크기) → 서 있는 캐릭터(흰 화면이라 회색) → 흰 카드 안에 칩 3 · 5 · 7 · 10분.
 * 제목 아래 설명 줄은 없다. 칩을 누르면 그 칩의 초를 onSelectChip으로 알리기만 한다 (고른 칩 표시는 없다 — 누르면 판정 화면으로 넘어간다).
 *
 * 위치 (U7 — v39 CSS 9절 .btn-loc · .ask-hint)
 *   idle         카드 맨 위에 검정 버튼 「내 위치로 계산하기」(높이 52px · 알약 · 위치 화살표 16px) → onUseLocation. 권한은 이 버튼을 눌렀을 때만 묻는다.
 *                그 아래 「또는 직접 고르기」 줄(양옆에 가는 선) → 칩
 *   failed       idle 그대로 + 카드 아래 안내 한 줄 「위치를 찾지 못했어요. 다시 누르거나 직접 골라 주세요」. 버튼을 남겨 다시 누를 수 있다
 *   denied       버튼 없이 칩만 + 카드 아래 「브라우저 설정에서 위치를 허용하면 다음부터 알아서 계산해요」
 *   unsupported  거부와 같은 모양 + 「이 브라우저에서는 위치를 쓸 수 없어요」
 *   hidden       버튼도 안내도 없이 칩만 (위치 기능을 붙이기 전)
 * 버튼이 없는 상태에서는 「또는」이 가리킬 것이 없어서 「또는 직접 고르기」 줄도 없다. 제목과 버튼 글자는 어느 상태에서나 같다.
 * 안내 한 줄은 12.5px / 600 · 보조색 · 가운데, 좌우 14px 안쪽. 방금 일어난 일인 failed만 화면 낭독기가 읽어 준다 (role="status").
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: p-3.75 = 15px, gap-3 = 12px, gap-2.5 = 10px, h-13 = 52px, gap-2 = 8px, px-3.5 = 14px.
 */
export function PlatformTimeAskScreen(props: PlatformTimeAskScreenProps) {
    const { nameplate, onSelectChip, location, onUseLocation, bottomNav } = props;
    const titleId = useId();
    const hasLocationButton = location === "idle" || location === "failed";
    const hint = HINT[location];

    return (
        <ScreenFrame tone="white" nameplate={nameplate} bottomNav={bottomNav}>
            <div className={TITLE_AREA}>
                <h1 id={titleId} className="text-verdict">
                    승강장까지 몇 분?
                </h1>
            </div>
            {standingStage}

            <div className={CARD_AREA}>
                <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.75">
                    {hasLocationButton && (
                        <button
                            type="button"
                            onClick={onUseLocation}
                            className="flex h-13 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink text-15.5 font-extrabold tracking-normal text-white"
                        >
                            {locationArrow(16)}
                            <span>내 위치로 계산하기</span>
                        </button>
                    )}
                    {hasLocationButton && (
                        <p className="flex items-center gap-2.5 text-12 font-bold text-hint before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
                            또는 직접 고르기
                        </p>
                    )}
                    <div role="group" aria-labelledby={titleId} className={CHIP_ROW}>
                        {timeChips(onSelectChip)}
                    </div>
                </div>
                {hint !== null && (
                    <p role={location === "failed" ? "status" : undefined} className="px-3.5 text-center text-12.5 font-semibold text-sub">
                        {hint}
                    </p>
                )}
            </div>
        </ScreenFrame>
    );
}
