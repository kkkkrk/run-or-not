import type { SettingItem, SettingKey } from "@/types/ui";
import { formatDurationSpaced, formatSpeed } from "@/ui/shared/format";

/*
 * 설정 항목 4개의 글자 — 이름 · 설명 · 단계 이름 · 단위. 설정 화면(settings-screen.tsx)과 설정 시트(setting-sheet.tsx)가 같이 쓴다
 * (결정.md 1절 「설정 화면」, v32 스크립트 5절 IT).
 *
 * 여기 있는 것은 글자뿐이다. 값(km/h · 초) · 세 단계의 값 · 지금 값이 단계 중 어디쯤인지(position) · 고칠 수 있는 범위는
 * 전부 props로 받는다 (ui.ts SettingItem). 단계 값을 바꿔도 이 파일은 그대로다.
 */

/** 카드에 놓는 순서 — 위에서부터 walk · run · station · margin */
export const SETTING_KEYS: SettingKey[] = ["walk", "run", "station", "margin"];

type SettingWords = {
    /** 이름 — 카드의 이름 줄 · 시트 제목 */
    label: string;
    /** 시트 제목 아래 설명 (평소 화면에서 뺀 글자). 줄을 바꿀 곳은 \n */
    description: string;
    /** 값의 단위: 속도(km/h) · 시간(초) */
    unit: "speed" | "time";
    /** 세 단계의 이름, 작은 값부터. null이면 단계 값이 곧 이름이다 (역 안 이동: 40초 · 1분 · 1분 30초) */
    stepNames: [string, string, string] | null;
    /** 첫 단계보다 작을 때 붙이는 말 — 「느긋하게」보다 더 느리게 */
    less: string;
    /** 마지막 단계보다 클 때 붙이는 말 — 「빠르게」보다 더 빠르게 */
    more: string;
};

export const SETTING: Record<SettingKey, SettingWords> = {
    walk: {
        label: "걷기 속도",
        description: "평소 걸음",
        unit: "speed",
        stepNames: ["느긋하게", "보통", "빠르게"],
        less: "느리게",
        more: "빠르게",
    },
    run: {
        label: "뛰기 속도",
        description: "가방 메고 뛸 때",
        unit: "speed",
        stepNames: ["가볍게", "보통", "힘껏"],
        less: "느리게",
        more: "빠르게",
    },
    station: {
        label: "역 안 이동",
        description: "입구에서 승강장까지 · 개찰구와 계단 포함",
        unit: "time",
        stepNames: null,
        less: "짧게",
        more: "길게",
    },
    margin: {
        label: "여유",
        description: "걸어서 도착하고 이만큼 남을 때만\n「걸어도 돼요」라고 해요",
        unit: "time",
        stepNames: ["빠듯하게", "보통", "넉넉하게"],
        less: "짧게",
        more: "길게",
    },
};

/**
 * 단계 버튼 세 개에 뭐라고 쓸까. 역 안 이동만 이름이 따로 없고 단계 값을 그대로 쓴다 — 받은 steps로 만들어서, 단계 값이 바뀌면 이름도 따라 바뀐다
 * (40 · 60 · 90초 → 「40초」 · 「1분」 · 「1분 30초」)
 */
export function stepNamesOf(key: SettingKey, item: SettingItem): [string, string, string] {
    const [low, mid, high] = item.steps;
    return SETTING[key].stepNames ?? [formatDurationSpaced(low), formatDurationSpaced(mid), formatDurationSpaced(high)];
}

/**이 숫자를 어떻게 읽어줄까 — 「시속 4.8km」 · 「1분 10초」. 단계에 없는 값일 때 이름 줄 오른쪽 「직접 · 값」에 쓴다 (v32 valText) */
export function valueText(key: SettingKey, value: number): string {
    return SETTING[key].unit === "speed" ? `시속 ${formatSpeed(value)}km` : formatDurationSpaced(value);
}
