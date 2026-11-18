// 확정 2026-11-15 — 바꾸려면 영준에게 먼저 물어볼 것

/*
 * 뛸까말까 화면 props 타입 — UI(src/ui · Claude Code)와 상태 · 로직(영준) 사이의 경계.
 * 페이지(src/app/**)가 이 모양으로 값을 만들어 넘기고, UI는 받은 대로 그리기만 한다.
 *
 * 원칙 (plan.md 1-2 · U0)
 * - 값은 숫자(초 · m · km/h) · 문자열 · 유니언 · boolean · 콜백만.
 *   예외: 12절의 틀(화면 틀 · 시트 틀)은 UI 안에서만 쓰는 조립용이라 children을 받는다. 페이지는 틀을 직접 쓰지 않는다.
 * - 판정과 임계값 비교(20초 · 180초 · 60초 · 120초 · 100m)는 로직이 끝내고 결과만 넘긴다.
 * - 표시 형식(N분 N초, 10초 반올림, 「방금 · N0초 전」, 「약」)과 문구 · 색 · 크기 · 캐릭터 자세는 UI가 정한다.
 * - 초는 소수여도 된다. UI가 글자로 쓸 때만 정수로 만든다.
 *
 * 화면 순서(plan.md L3) → 타입
 *   로딩 · 복원 전 → LoadingScreenProps        오프라인 → OfflineScreenProps      불러오기 실패 → LoadFailedScreenProps
 *   도보 시간 없음 → PlatformTimeAskScreenProps  판정 멈춤 → StalledScreenProps     0대 → EmptyScreenProps
 *   그 밖 → VerdictScreenProps
 *   「승강장까지」 시트는 VerdictScreenProps · EmptyScreenProps 안의 sheet(PlatformTimeSheetProps)로 받고, 화면이 시트까지 그린다.
 *   설정 시트도 같다: SettingsScreenProps 안의 sheet(SettingSheetProps)로 받고, 설정 화면이 시트까지 그린다 (2026-11-18 추가).
 *
 * 차례: 1 공통 · 2 역명판 · 3 판정 글자와 캐릭터 · 4 열차 카드 · 5 판정 화면 · 6 「승강장까지」 시트
 *       7 판정 전 화면 · 8 막다른 화면 · 9 하단 캡슐 · 10 설정 · 11 역 찾기(자리만) · 12 틀(UI 안에서만)
 */

import type { ReactNode } from "react";
import type { Direction } from "@/types/subway";

// UI 파일은 이 파일만 import하면 되게 다시 내보낸다
export type { Direction };

/* ───────────────────────── 1. 공통 ───────────────────────── */

/** 판정 6종 — 판정 글자와 화면 색을 정한다. 로직 judge 결과의 kind와 같은 글자 (결정.md 4절, plan.md 2절) */
export type VerdictKind =
    | "walk"          // 걸어도 돼요
    | "slow"          // 천천히 걸어요
    | "run"           // 지금 뛰어요!
    | "tight"         // 빨리 뛰어봐요! (아슬아슬)
    | "keep-walking"  // 탈 열차가 아직 안 보여요
    | "empty";        // 열차가 없어요

/* ───────────────────────── 2. 역명판 ───────────────────────── */

/** 역명판 양옆 칸 하나 — 그 방면의 다음 역 (모든 역 화면 맨 위, 결정.md 1절) */
export type NameplateSide = {
    direction: Direction;        // 이 칸을 누르면 고르게 되는 방면
    stationName: string | null;  // 그 방면의 다음 역 이름. 끝 역이라 없으면 null
};

/** 역명판 ‹ 이전역 · 현재역 · 다음역 › 한 판 3칸 — 모든 역 화면 맨 위 (결정.md 1절) */
export type StationNameplateProps = {
    stationName: string;
    lineName: string;
    lineColor: string;
    left: string | null;            // 왼쪽 칸 역명. 종점이라 없으면 null
    right: string | null;           // 오른쪽 칸 역명
    selected: "left" | "right";     // 어두운 면 + 흰 글자로 칠할 칸
    onSelect: (side: "left" | "right") => void;
};

/* ───────────────────────── 3. 판정 글자와 캐릭터 ───────────────────────── */

/** 판정 글자 — 역명판 아래 가장 큰 글자. 문구와 줄바꿈은 UI가 정한다 (결정.md 4절) */
export type VerdictTitleProps = {
    verdict: VerdictKind;
};

/** 가운데 캐릭터의 자세 (결정.md 3절) */
export type CharacterPose =
    | "stand"  // 서 있기 — 판정이 없는 화면 (승강장까지 몇 분? · 위치 확인 중 · 막다른 화면). 로딩에는 캐릭터가 없다
    | "walk"   // 걷기 — 걸어도 돼요
    | "slow"   // 천천히 걷기 — 천천히 걸어요
    | "run"    // 뛰기 — 지금 뛰어요!
    | "tight"  // 급하게 뛰기 — 빨리 뛰어봐요!
    | "phone"; // 서서 폰 보기 — 탈 열차가 아직 안 보여요

/** 가운데 캐릭터 — 판정 글자와 열차 카드 사이 (결정.md 3절) */
export type CharacterProps = {
    pose: CharacterPose;
};

/* ───────────────────────── 4. 열차 카드 ───────────────────────── */

/** 열차 하나의 판정 — 열차 줄 아이콘을 정한다 (결정.md 3절, plan.md L1 「열차마다」)
 *  모양은 셋(걷는 사람 · 뛰는 사람 · 앉은 사람), 한 바퀴 속도로 다섯을 나눈다 */
export type TrainKind =
    | "walk"   // 걸어도 타요 — 걷는 사람, 1000ms
    | "slow"   // 걸어도 타요 + 걸어서 도착한 뒤 3분 이상 남음 — 걷는 사람, 1450ms
    | "run"    // 뛰면 타요 — 뛰는 사람 + 두 줄, 580ms
    | "tight"  // 아슬아슬 — 뛰는 사람 + 두 줄 (run과 같은 모양), 430ms
    | "miss";  // 못 타요 — 앉아서 이마를 짚은 사람, 움직이지 않음 · 1.3배 · 진하기 70%

/** 열차 줄 아이콘 — 열차 줄 오른쪽의 작은 사람 (결정.md 3절) */
export type TrainIconProps = {
    kind: TrainKind;
    isTarget: boolean;  // 판정 대상 열차면 크게(42px), 아니면 28px
};

/** 「승강장까지 걸으면 N · 뛰면 N」 줄 — 열차 카드 맨 위, 줄 전체가 버튼 (결정.md 1절) */
export type PlatformTimeRowProps = {
    walkSec: number;                // 걸으면 (초). UI가 10초 단위로 반올림해 「3분20초」로 쓴다
    runSec: number;                 // 뛰면 (초)
    onPress: () => void;            // 줄을 눌렀을 때 → 페이지가 같은 화면의 sheet.open을 true로 바꾼다
    sheetOpen: boolean;             // 그 시트가 열려 있는지 = 같은 화면의 sheet.open과 같은 값. 버튼의 aria-expanded로만 쓰고 모양은 안 바뀐다
} & (
    {source: "manual"} // 직접 고른 값 → 어림일 수 없음
    | {source: "location"; approximate: boolean} // 내 위치로 계산 중 → 앞에 위치 화살표
);                                               // approximate: 위치 정확도 100m 넘음 · T맵 실패 → 숫자 앞에 「약」

/** 열차 줄 하나 — 이름(이번 열차 · 다음 열차)은 UI가 순서대로 붙인다 (결정.md 1절 · 3절) */
export type TrainRow =
    | {
        kind: Exclude<TrainKind, "miss">;
        remainingSec: number;  // 도착까지 남은 초. UI가 「2분30초」로 쓴다
        isTarget: boolean;     // 판정 대상(탈 수 있는 첫 열차) → 시간 글자와 아이콘이 커진다
    }
    | {
        kind: "miss";          // 못 타는 열차 → 줄을 흐리게
        remainingSec: number;
        shortBySec: number;    // 뛰어도 모자란 초 (= 뛰면 − 남은 시간) → 「뛰어도 1분 부족」
    };

/** 새로고침 글자 버튼 「방금 ↻」 — 첫 열차 줄의 이름 줄 오른쪽 끝 (결정.md 4절 「새로고침」 · 「재요청 실패」) */
export type RefreshButtonProps = {
    elapsedSec: number;   // 마지막으로 받은 지 몇 초. UI가 「방금」(10초 안) · 「N0초 전」으로 쓴다
    stale: boolean;       // 받은 지 60초 이상 → 「1분 전 정보」 굵게 (비교는 로직)
    refreshing: boolean;  // 내가 누른 요청을 받는 중 → 받는 동안 아이콘이 돈다
    spinOnceKey: number;  // 이 숫자가 바뀔 때마다 아이콘이 한 바퀴만 돈다 (받은 지 5초 안에 눌렀을 때의 신호)
    onRefresh: () => void;
};

/** 열차 카드 — 「승강장까지」 줄 + 열차 줄 + 새로고침 글자 + 대기 줄 (결정.md 1절 · 4절) */
export type TrainCardProps = {
    platformTime: PlatformTimeRowProps;
    trains: TrainRow[];        // 남은 시간이 짧은 순으로 1~2대 (0대면 EmptyScreenProps). 이미 떠난 열차는 빼고 넘긴다
    refresh: RefreshButtonProps;
    showPendingRow: boolean;   // 열차 줄 아래 「그다음 열차 · 이번 열차가 떠나면 보여요」 대기 줄 (탈 열차가 아직 안 보여요)
                                // 판정이 "keep-walking"일 때만 true. 카드는 판정을 모르니 로직이 맞춰 넘기고 L3 테스트로 확인한다
};

/* ───────────────────────── 5. 판정 화면 ───────────────────────── */

/** 판정 화면 전체 — 위에서부터 역명판 → 판정 글자 → 캐릭터 → 열차 카드 → 하단 캡슐, 그 위로 올라오는 시트 (결정.md 1절) */
export type VerdictScreenProps = {
    nameplate: StationNameplateProps;
    verdict: Exclude<VerdictKind, "empty">;  // 판정 글자 · 화면 색 · 캐릭터 자세를 정한다. 열차가 없어요("empty")는 EmptyScreenProps
                                             // 자세는 UI가 고른다: "keep-walking" → "phone", 나머지는 같은 이름 (walk · slow · run · tight)
    card: TrainCardProps;
    sheet: PlatformTimeSheetProps;           // 「승강장까지」 시트. 화면이 같이 그린다 (열차 카드와 하단 캡슐을 덮는다)
    bottomNav: BottomNavProps;
};

/* ───────────────────────── 6. 「승강장까지」 시트 ───────────────────────── */

/** 「승강장까지」 시트 맨 아래 위치 줄의 상태 — U7에서 그린다 (결정.md 1절 「위치를 허용했을 때」 · 「위치를 못 얻었을 때」) */
export type SheetLocation =
    | { status: "hidden" }                                      // 줄을 그리지 않는다 (위치 기능을 붙이기 전)
    | { status: "idle"; failed: boolean }                       // 「내 위치로 계산하기」 버튼
    | { status: "locating"; source: "manual" | "location" }     // 「내 위치 확인 중…」. source = 누르기 전 값이 어디서 왔나 (아래)
    | { status: "active"; distanceM: number; failed: boolean }  // 검정 면 「내 위치로 계산 중 · 150m」. 다시 누르면 새로 계산
    | { status: "denied" }                                      // 거부 → 버튼 대신 「브라우저 설정에서 위치를 허용하면 알아서 계산해요」
    | { status: "unsupported" };                                // 미지원 → 버튼 대신 「이 브라우저에서는 위치를 쓸 수 없어요」
// failed = 방금 위치를 못 찾았다(시간 초과 · 사용 불가). 버튼 모양은 그대로 두고 그 아래에 「위치를 찾지 못했어요. 다시 누르거나 직접 골라 주세요」 한 줄.
// 언제 true인지는 로직이 정한다: 다시 계산을 시작하거나, ± · 칩을 누르거나, 시트를 닫으면 false (결정.md 1절)
// source = 확인하는 동안 시트에 보이는 값(walkSec)은 누르기 전 값 그대로다. 그 값이 직접 고른 값이면 "manual" → 고른 칩을 칠한 채로 둔다.
// 검정 버튼을 다시 눌러 새로 계산하는 중이면 "location" → 칠한 칩이 없다. 같은 화면 PlatformTimeRowProps의 source와 같은 값이다.
// 다른 상태는 status만으로 안다: "active"만 내 위치로 계산한 값이고 나머지는 직접 고른 값 (시안 v32 「승강장까지」 시트)

/** 「승강장까지」 시트 — 「승강장까지」 줄을 누르면 아래에서 올라오는 흰 시트. 화면 props의 sheet로 받는다 (결정.md 1절) */
export type PlatformTimeSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;  // 완료 · Esc · 바깥을 누르면 false
    walkSec: number;          // 가운데 큰 숫자 = 승강장까지 걸어서 (초)
    runSec: number;           // 그 아래 「뛰면 N · 자동 계산」
    canDecrease: boolean;     // − 를 누를 수 있는지 (범위 비교는 로직)
    canIncrease: boolean;     // + 를 누를 수 있는지
    onDecrease: () => void;   // − 30초. 다음 값 계산은 로직
    onIncrease: () => void;   // + 30초
    onSelectChip: (sec: number) => void;  // 칩 3 · 5 · 7 · 10분 → 180 · 300 · 420 · 600.
                                          // 검정으로 칠할 칩은 UI가 고른다: walkSec와 같은 칩. 지금 값이 내 위치로 계산한 값이면 없다
                                          // (location이 "active"이거나, "locating"이면서 source가 "location"일 때)
    location: SheetLocation;
    onUseLocation: () => void;  // 위치 줄 버튼을 눌렀을 때 (계산 시작 · 다시 계산)
};

/* ───────────────────────── 7. 판정 전 화면 (흰 화면) ───────────────────────── */

/** 「승강장까지 몇 분?」 화면의 위치 버튼 상태 — U7에서 그린다 (결정.md 1절 「위치를 허용했을 때」 · 「위치를 못 얻었을 때」) */
export type AskLocation =
    | "hidden"        // 버튼을 그리지 않는다 (위치 기능을 붙이기 전)
    | "idle"          // 검정 버튼 「내 위치로 계산하기」 + 「또는 직접 고르기」 칩
    | "failed"        // 위치를 못 찾음(시간 초과 · 사용 불가) → 버튼 · 칩 그대로 + 카드 아래 안내 한 줄
    | "denied"        // 거부 → 버튼 없이 칩 + 「브라우저 설정에서 위치를 허용하면 다음부터 알아서 계산해요」
    | "unsupported";  // 미지원 → 버튼 없이 칩 + 「이 브라우저에서는 위치를 쓸 수 없어요」

/** 「승강장까지 몇 분?」 화면 — 도보 시간이 아직 없을 때의 흰 화면 (결정.md 1절) */
export type PlatformTimeAskScreenProps = {
    nameplate: StationNameplateProps;
    onSelectChip: (sec: number) => void;  // 칩 3 · 5 · 7 · 10분 → 180 · 300 · 420 · 600
    location: AskLocation;
    onUseLocation: () => void;            // 위치 버튼을 눌렀을 때
    bottomNav: BottomNavProps;
};

/** 로딩 — 판정 글자 자리가 스켈레톤인 흰 화면. 저장값 복원 전 · 위치 확인 중도 같은 화면 (결정.md 1절 · 4절) */
export type LoadingScreenProps = {
    nameplate: StationNameplateProps | null;      // 아직 역을 모르면 null
    locationStep: "locating" | "routing" | null;  // 스켈레톤 아래 「내 위치 확인 중」 · 「걷는 길 계산 중」 (U7). 그냥 로딩이면 null
    bottomNav: BottomNavProps;
};

/* ───────────────────────── 8. 막다른 화면 4종 (회색) ───────────────────────── */

/** 열차가 없어요 — 이 방면으로 가는 열차가 0대 (막다른 화면 1, 결정.md 4절 「빈 상태」) */
export type EmptyScreenProps = {
    nameplate: StationNameplateProps;    // 「반대 방면 보기」 버튼 = 역명판의 반대쪽 칸을 누른 것과 같은 동작 (그 칸의 역 이름 · onSelect)
    platformTime: PlatformTimeRowProps;  // 카드 맨 위 「승강장까지」 줄은 그대로 둔다
    sheet: PlatformTimeSheetProps;       // 그 줄을 누르면 올라오는 「승강장까지」 시트. 판정 화면과 같은 값
    bottomNav: BottomNavProps;
};

/** 불러오기 실패 — 첫 화면부터 도착 정보를 못 받음 (막다른 화면 2, 결정.md 2절) */
export type LoadFailedScreenProps = {
    nameplate: StationNameplateProps;
    statusCode: string | null;  // HTTP 상태 코드 글자 "502" (statusCodeOf가 주는 값 그대로). 있으면 작게 보여 준다. 네트워크 오류면 null
    onRetry: () => void;        // 「다시 시도」
    bottomNav: BottomNavProps;  // 「다른 역 찾기」는 bottomNav.searchHref로 간다
};

/** 오프라인 — 첫 화면부터 인터넷이 끊김. 연결되면 알아서 다시 받아서 버튼이 없다 (막다른 화면 3, 결정.md 2절) */
export type OfflineScreenProps = {
    nameplate: StationNameplateProps;
    bottomNav: BottomNavProps;
};

/** 판정 멈춤 — 마지막으로 받은 지 120초 이상 (막다른 화면 4, 결정.md 4절) */
export type StalledScreenProps = {
    nameplate: StationNameplateProps;
    refreshing: boolean;      // 다시 받는 중
    onRefresh: () => void;    // 「다시 받기」
    bottomNav: BottomNavProps;
};

/* ───────────────────────── 9. 하단 캡슐 ───────────────────────── */

/** 하단 캡슐의 탭 — 역 찾기 · 판정 · 설정 (결정.md 1절) */
export type BottomNavTab = "search" | "verdict" | "settings";

/** 하단 플로팅 캡슐 3탭 — 모든 화면 맨 아래. 탭은 주소를 받아 링크(Link)로 그린다 (결정.md 1절) */
export type BottomNavProps = {
    active: BottomNavTab;        // 현재 탭 (옅게 표시)
    searchHref: string;          // 역 찾기 주소
    verdictHref: string | null;  // 판정 탭이 갈 역 주소. 갈 역이 없으면 null → 꺼진 탭
    settingsHref: string;        // 설정 주소
};

/* ───────────────────────── 10. 설정 ───────────────────────── */

/** 설정 항목 4개 — 걷기 속도 · 뛰기 속도 · 역 안 이동 · 여유 (결정.md 1절 「설정 화면」) */
export type SettingKey = "walk" | "run" | "station" | "margin";

/** 설정 단계 번호 — 작은 값부터 0 · 1 · 2 (예: 느긋하게 · 보통 · 빠르게) (결정.md 1절) */
export type SettingStep = 0 | 1 | 2;

/** 지금 값이 세 단계 중 어디쯤인지 — 단계 버튼과 시트의 비교 한 줄에 쓴다. 계산은 로직 (결정.md 1절) */
export type SettingPosition =
    | { kind: "step"; step: SettingStep }  // 단계와 같은 값 → 그 버튼이 켜진다
    | { kind: "between"; lower: 0 | 1 }    // lower 단계와 그다음 단계 사이 → 「「보통」과 「빠르게」 사이」
    | { kind: "below" }                    // 첫 단계보다 작다
    | { kind: "above" };                   // 마지막 단계보다 크다

/** 설정 항목 하나의 값 (결정.md 1절) */
export type SettingItem = {
    value: number;                    // 지금 값. 속도는 km/h, 시간은 초
    steps: [number, number, number];  // 세 단계의 값, 작은 쪽부터
    position: SettingPosition;        // 단계가 아니면 UI가 세 버튼을 끄고 「직접 · 시속 4.8km」를 쓴다
};

/** 설정 화면 — 한 카드 안에 네 항목, 항목마다 단계 버튼 셋, 그 위로 올라오는 설정 시트 (결정.md 1절) */
export type SettingsScreenProps = {
    items: Record<SettingKey, SettingItem>;
    onSelectStep: (key: SettingKey, step: SettingStep) => void;  // 단계 버튼을 눌렀을 때
    onOpenSheet: (key: SettingKey) => void;                      // 이름 줄(끝에 ›)을 눌렀을 때 → 페이지가 sheet.settingKey를 그 항목으로, sheet.open을 true로 바꾼다
    canReset: boolean;       // 「처음 값으로」 — 바꾼 값이 있을 때만 켜진다
    onReset: () => void;
    sheet: SettingSheetProps;  // 설정 시트. 화면이 같이 그린다 (판정 화면의 sheet와 같은 방식 — 2026-11-18 추가)
    bottomNav: BottomNavProps;
};

/** 설정 시트 — 항목 하나를 − + 로 세밀하게. 「승강장까지」 시트와 같은 모양. 설정 화면 props의 sheet로 받는다 (결정.md 1절) */
export type SettingSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;  // 완료 · Esc · 바깥을 누르면 false
    settingKey: SettingKey;   // 어느 항목인지 → 제목 · 설명 · 단위 · 단계 이름은 UI가 정한다
                              // 닫혀 있을 때도 값이 있어야 한다 — 마지막으로 연 항목을 그대로 두면 내려가는 동안 같은 내용이 보인다
    item: SettingItem;        // 가운데 큰 숫자와 그 아래 비교 한 줄
    canDecrease: boolean;     // 범위 비교는 로직
    canIncrease: boolean;
    onDecrease: () => void;   // − (걷기 0.1 · 뛰기 0.5km/h, 역 안 이동 · 여유 10초). 다음 값 계산은 로직
    onIncrease: () => void;
};

/* ───────────────────────── 11. 역 찾기 (자리만) ───────────────────────── */

/** 역 찾기 화면 — 이름만 둔 자리. 시안(plan.md S)을 정한 뒤 U6에서 채운다 (결정.md 5절) */
export type StationSearchScreenProps = {
    bottomNav: BottomNavProps;
};

/* ───────────────────────── 12. 틀 (UI 안에서만 쓰는 조립용 — 페이지는 쓰지 않는다) ───────────────────────── */

/** 화면 바탕 — 상태색 다섯 · 막다른 회색 · 흰 화면. 어느 판정이 어느 색인지는 UI가 정한다 (결정.md 2절) */
export type ScreenTone =
    | "walk"     // 초록 — 걸어도 돼요
    | "slow"     // 파랑 — 천천히 걸어요
    | "run"      // 빨강 — 지금 뛰어요!
    | "tight"    // 진홍 — 빨리 뛰어봐요!
    | "miss"     // 보라 — 탈 열차가 아직 안 보여요
    | "deadend"  // 회색 — 막다른 화면 4종
    | "white";   // 흰 화면 — 판정 전(로딩 · 승강장까지 몇 분?) · 설정 · 역 찾기

/** 화면 틀 — 화면 전체 바탕색 + 맨 위 역명판 + 맨 아래 하단 캡슐. 모든 화면 컴포넌트가 안에서 쓴다 (결정.md 1절 · 2절) */
export type ScreenFrameProps = {
    tone: ScreenTone;
    nameplate: StationNameplateProps | null;  // 역명판이 없는 화면(설정 · 역 찾기 · 역을 모르는 로딩)은 null
    bottomNav: BottomNavProps;
    children: ReactNode;                      // 역명판과 하단 캡슐 사이에 놓이는 것 (판정 글자 · 캐릭터 · 카드 · 시트)
};

/** 시트 틀 — 손잡이 + 제목 + 완료 버튼이 있는 흰 시트. 「승강장까지」 시트와 설정 시트가 같이 쓴다 (결정.md 1절) */
export type SheetFrameProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;  // 완료 · Esc · 바깥을 누르면 false
    title: string;                          // 「승강장까지 걸어서」 · 「걷기 속도」
    description: string | null;             // 제목 아래 설명. 설정 시트에만 있고 「승강장까지」 시트는 null
    children: ReactNode;                    // 제목 줄 아래 내용 (− 큰 숫자 + · 칩 · 비교 한 줄)
};