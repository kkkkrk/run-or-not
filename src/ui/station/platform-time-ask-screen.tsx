import { useId } from "react";
import type { PlatformTimeAskScreenProps } from "@/types/ui";
import { ScreenFrame } from "@/ui/shared/screen-frame";
import { CARD_AREA, CHIP_ROW, standingStage, timeChips, TITLE_AREA } from "./screen-parts";

/**
 * 「승강장까지 몇 분?」 — 도보 시간이 아직 없을 때의 흰 화면 (결정.md 1절, v32 CSS 9절 .ask-card · .or, 스크립트 4절 whiteHTML()).
 * 위에서부터: 역명판 → 제목 「승강장까지 몇 분?」(판정 글자 자리 · 같은 크기) → 서 있는 캐릭터(흰 화면이라 회색) → 흰 카드 안에 칩 3 · 5 · 7 · 10분.
 * 제목 아래 설명 줄은 없다. 칩을 누르면 그 칩의 초를 onSelectChip으로 알리기만 한다 (고른 칩 표시는 없다 — 누르면 판정 화면으로 넘어간다).
 *
 * 위치 버튼이 있는 상태(location이 idle · failed)에서는 칩 위에 「또는 직접 고르기」 줄이 놓인다 — 양옆에 가는 선.
 * 버튼이 없는 상태(hidden · denied · unsupported)에서는 「또는」이 가리킬 것이 없어서 칩만 남긴다 (v32 「거부했을 때」와 같은 모양).
 * 위치 버튼 · 안내 한 줄은 U7에서 채운다 (아래 자리 주석).
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: p-3.75 = 15px, gap-3 = 12px, gap-2.5 = 10px.
 */
export function PlatformTimeAskScreen(props: PlatformTimeAskScreenProps) {
    const { nameplate, onSelectChip, location, bottomNav } = props;
    const titleId = useId();
    const hasLocationButton = location === "idle" || location === "failed";

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
                    {/* 위치 버튼 자리 — U7에서 여기에 검정 버튼 「내 위치로 계산하기」를 그린다 (hasLocationButton일 때, onUseLocation) */}
                    {hasLocationButton && (
                        <p className="flex items-center gap-2.5 text-12 font-bold text-[#64748B] before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
                            또는 직접 고르기
                        </p>
                    )}
                    <div role="group" aria-labelledby={titleId} className={CHIP_ROW}>
                        {timeChips(onSelectChip)}
                    </div>
                </div>
                {/* 안내 한 줄 자리 — U7에서 여기(카드 아래)에 거부 · 미지원 · 못 찾음 안내를 그린다 */}
            </div>
        </ScreenFrame>
    );
}
