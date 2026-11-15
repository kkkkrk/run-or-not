import type { CharacterPose, ScreenTone, VerdictScreenProps } from "@/types/ui";
import { Character } from "@/ui/character/character";
import { ScreenFrame } from "@/ui/shared/screen-frame";
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
 * 판정 화면 전체 — 위에서부터 역명판 → 판정 글자 → 캐릭터 → 열차 카드 (결정.md 1절, v32 screen()).
 * 바탕색 · 역명판 · 하단 캡슐 자리는 화면 틀이 맡고, 여기서는 그 사이를 채운다.
 *
 * 세로 배치: 판정 글자(mt-auto)와 캐릭터 무대(mb-auto)가 한 덩어리로 남는 높이의 가운데에 오고, 카드는 바닥에 붙는다.
 * 화면이 낮아 카드가 다 안 들어가면 카드 자리만 따로 스크롤된다 (판정 글자 · 캐릭터는 그대로 보인다).
 */
export function VerdictScreen({ nameplate, verdict, card, bottomNav }: VerdictScreenProps) {
    return (
        <ScreenFrame tone={TONE[verdict]} nameplate={nameplate} bottomNav={bottomNav}>
            <VerdictTitle verdict={verdict} />

            {/* 캐릭터 무대: 높이는 화면 높이의 24%(120 ~ 215px)이고 캐릭터는 그 높이에 맞춰 커진다. 바닥에 붙여 세운다 */}
            <div className="relative mb-auto flex h-[clamp(120px,24cqh,215px)] flex-none items-end justify-center overflow-hidden">
                <Character pose={POSE[verdict]} />
            </div>

            {/* 열차 카드 자리: 아래 76px는 하단 캡슐이 떠 있을 자리다 (캡슐 56px + 바닥 12px + 틈 8px).
                스크롤되면 카드가 캡슐 밑으로 지나가게, 여백을 스크롤되는 안쪽에 둔다. 스크롤 막대는 숨긴다 */}
            <div className="flex min-h-0 flex-initial flex-col gap-[clamp(7px,1.2cqh,10px)] overflow-y-auto px-4 pt-4 pb-19 [scrollbar-width:none] *:shrink-0 [&::-webkit-scrollbar]:hidden">
                <TrainCard {...card} />
            </div>

            {/* 「승강장까지」 시트 자리 — U3에서 여기에 <PlatformTimeSheet {...sheet} />를 붙인다. sheet는 그때까지 받기만 한다 */}
        </ScreenFrame>
    );
}
