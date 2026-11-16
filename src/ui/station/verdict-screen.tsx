import type { CharacterPose, ScreenTone, VerdictScreenProps } from "@/types/ui";
import { Character } from "@/ui/character/character";
import { ScreenFrame } from "@/ui/shared/screen-frame";
import { PlatformTimeSheet } from "./platform-time-sheet";
import { CARD_AREA, STAGE } from "./screen-parts";
import { TrainCard } from "./train-card";
import { VerdictTitle } from "./verdict-title";

type Verdict = VerdictScreenProps["verdict"];

/** 판정 → 화면 색 (결정.md 2절). 「탈 열차가 아직 안 보여요」만 이름이 다르다 (보라 --miss) */
const TONE: Record<Verdict, ScreenTone> = {
    walk: "walk",
    slow: "slow",
    run: "run",
    tight: "tight",
    "keep-walking": "miss",
};

/** 판정 → 캐릭터 자세 (결정.md 3절). 「탈 열차가 아직 안 보여요」는 서서 폰 보기 */
const POSE: Record<Verdict, CharacterPose> = {
    walk: "walk",
    slow: "slow",
    run: "run",
    tight: "tight",
    "keep-walking": "phone",
};

/**
 * 판정 화면 전체 — 위에서부터 역명판 → 판정 글자 → 캐릭터 → 열차 카드, 그 위로 올라오는 「승강장까지」 시트 (결정.md 1절, v32 screen()).
 * 바탕색 · 역명판 · 하단 캡슐 자리는 화면 틀이 맡고, 여기서는 그 사이를 채운다.
 *
 * 세로 배치: 판정 글자(mt-auto)와 캐릭터 무대(mb-auto)가 한 덩어리로 남는 높이의 가운데에 오고, 카드는 바닥에 붙는다.
 * 화면이 낮아 카드가 다 안 들어가면 카드 자리만 따로 스크롤된다 (판정 글자 · 캐릭터는 그대로 보인다).
 * 무대 · 카드 자리의 크기는 다른 역 화면(막다른 화면 · 판정 전 화면)과 같아야 해서 screen-parts.tsx에 있다.
 *
 * 시트: 「승강장까지」 줄을 누르면 페이지가 sheet.open을 true로 바꾸고, 시트가 열차 카드와 하단 캡슐을 덮으며 올라온다.
 * 판정 글자 · 캐릭터는 시트 위로 그대로 보여서, 시트에서 값을 바꾸면 뒤 판정이 바로 바뀌는 게 보인다.
 */
export function VerdictScreen({ nameplate, verdict, card, sheet, bottomNav }: VerdictScreenProps) {
    return (
        <ScreenFrame tone={TONE[verdict]} nameplate={nameplate} bottomNav={bottomNav}>
            <VerdictTitle verdict={verdict} />

            <div className={STAGE}>
                <Character pose={POSE[verdict]} />
            </div>

            <div className={CARD_AREA}>
                <TrainCard {...card} />
            </div>

            <PlatformTimeSheet {...sheet} />
        </ScreenFrame>
    );
}
