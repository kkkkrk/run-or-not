import type { LoadingScreenProps } from "@/types/ui";
import { ScreenFrame } from "@/ui/shared/screen-frame";
import { CARD_AREA, STAGE, TITLE_AREA } from "./screen-parts";

/**
 * 스켈레톤의 면 (v32 CSS 7절 .skel + 9절 .th-light .skel): 옅은 회색 위로 밝은 띠가 1.4초에 한 번 지나간다.
 * 색은 구분선 색(#E2E8F0)과 그보다 밝은 #EEF2F6. 움직임을 줄이는 설정이면 띠가 멈춘 채로 보인다.
 * 모서리는 조각마다 달라서 쓰는 곳에서 준다 (글자 자리 12px · 판정 글자 자리 14px · 역명판 자리 알약 · 「승강장까지」 줄 자리 0)
 */
const SKELETON =
    "animate-skeleton bg-[linear-gradient(90deg,var(--color-line)_25%,#EEF2F6_50%,var(--color-line)_75%)] bg-size-[200%_100%] motion-reduce:animate-none";

/**
 * 스켈레톤 카드의 열차 줄 하나: 이름 자리(높이 12px) + 그 아래 8px + 시간 자리. 안쪽 여백은 진짜 열차 줄과 같다 (위아래 13 · 좌우 15px).
 * 둘째 줄에는 진짜 카드처럼 위에 가는 구분선이 붙는다
 */
const skeletonRow = (nameWidth: string, timeSize: string, divider: boolean) => (
    <div
        className={`px-3.75 py-3.25 ${
            divider ? "relative before:absolute before:inset-x-3.75 before:top-0 before:h-px before:bg-line" : ""
        }`}
    >
        <div className={`mb-2 h-3 rounded-[12px] ${nameWidth} ${SKELETON}`} />
        <div className={`rounded-[12px] ${timeSize} ${SKELETON}`} />
    </div>
);

/**
 * 로딩 — 흰 화면에 판정 글자 자리 · 열차 카드 스켈레톤 (결정.md 3절 · 4절, v32 WAIT.loading · SKEL_CARD). 저장값을 불러오기 전에도 같은 화면이다.
 * **캐릭터가 없다** — 멈춰 선 캐릭터가 막다른 화면과 같은 그림이라 멈춘 화면으로 읽힐 수 있어서다. 무대 자리는 비운 채 그대로 둔다.
 * 판정 글자 자리 · 무대 · 카드 자리의 크기가 판정 화면과 같아서, 진짜 화면이 들어와도 위아래로 밀리지 않는다.
 *
 * 역을 아직 모를 때(nameplate가 null — 예: 페이지를 넘어가는 순간의 loading.tsx)는 역명판 자리에 같은 크기의 알약 스켈레톤을 둔다:
 * 높이 48px · 바깥 여백 위 7px · 좌우 12px (h-12 · mt-1.75 · mx-3). 진짜 역명판이 들어와도 화면이 밀리지 않는다.
 *
 * 스켈레톤은 그림일 뿐이라 화면 낭독기에는 숨기고(aria-hidden), 대신 보이지 않는 글자 「불러오는 중」을 읽게 한다.
 * locationStep(「내 위치 확인 중」 · 「걷는 길 계산 중」 한 줄과 그때의 서 있는 캐릭터)은 U7에서 그린다. 그때까지는 받기만 한다.
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: h-11 = 44px, h-10 = 40px, h-6 = 24px, h-3 = 12px, mb-2 = 8px.
 */
export function LoadingScreen(props: LoadingScreenProps) {
    const { nameplate, bottomNav } = props;

    return (
        <ScreenFrame tone="white" nameplate={nameplate} bottomNav={bottomNav}>
            {nameplate === null && (
                <div aria-hidden="true" className={`mx-3 mt-1.75 h-12 flex-none rounded-full ${SKELETON}`} />
            )}

            <div className={TITLE_AREA}>
                <p role="status" className="sr-only">
                    불러오는 중
                </p>
                {/* 판정 글자 자리: 폭 62% · 높이 44px · 모서리 14px */}
                <div aria-hidden="true" className={`mx-auto h-11 w-[62%] rounded-[14px] ${SKELETON}`} />
                {/* 위치 확인 중 한 줄 자리 — U7에서 여기(스켈레톤 아래 10px)에 「내 위치 확인 중」 · 「걷는 길 계산 중」을 그린다 (locationStep) */}
            </div>

            {/* 캐릭터 무대: 자리만 있고 비어 있다 */}
            <div className={STAGE} />

            <div className={CARD_AREA}>
                {/* 열차 카드 모양: 「승강장까지」 줄 자리(44px, 모서리 없이 카드 폭 가득) + 판정 대상 열차 줄 + 다음 열차 줄 */}
                <div aria-hidden="true" className="overflow-hidden rounded-[20px] border border-line bg-surface">
                    <div className={`h-11 ${SKELETON}`} />
                    {skeletonRow("w-[34%]", "h-10 w-[58%]", false)}
                    {skeletonRow("w-[30%]", "h-6 w-[42%]", true)}
                </div>
            </div>
        </ScreenFrame>
    );
}
