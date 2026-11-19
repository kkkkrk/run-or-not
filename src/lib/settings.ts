import { SettingItem, SettingKey, SettingPosition } from "@/types/ui";
import { VerdictSettings } from "./verdict";
import { DEFAULT_SETTINGS } from "@/stores/settings-store";

type DEF = {
    "field": keyof VerdictSettings;
    "steps": [number,number,number];
}

export const SETTING_DEFS: Record<SettingKey, DEF> = {
    walk: {
        field: "walkSpeed",
        steps: [3.6, 4.5, 5.4],
    },
    run: {
        field: "runSpeed",
        steps: [7.5,9.5,10.5],
    },
    station: {
        field: "stationOverheadSec",
        steps: [40,60,90],
    },
    margin: {
        field: "marginSec",
        steps: [10,30,60],
    },
}
const KEYS:(keyof VerdictSettings)[] = ["walkSpeed","runSpeed","stationOverheadSec","marginSec"];
export const canResetSettings = (values: Record<keyof VerdictSettings,number>) => KEYS.some((key) => values[key] !== DEFAULT_SETTINGS[key]);

const RANGE: Record<SettingKey, [number,number]> = {
    walk: [3.6,5.4],
    run: [7.5, 10.5],
    station: [40, 90],
    margin: [10, 60],
}
const round1 = (value: number) => Math.round(value * 10) / 10;

const DELTA = { walk: 0.1, run: 0.5, station: 10, margin: 10 };

export function nextSetting(key: SettingKey, value: number, direction: -1 | 1): number {
    const [min, max] = RANGE[key];
    return Math.min(max, Math.max(min, round1(value + DELTA[key] * direction)));
}
export function canStepSetting(key: SettingKey, value: number, direction: -1 | 1): boolean {
    const [min, max] = RANGE[key];
    if(direction === -1){
        return min < value;
    }
    return max > value;
}

function position(key: SettingKey, value: number): SettingPosition {
    const [low, mid, high] = SETTING_DEFS[key].steps;
    if (value === low) return { kind: "step", step: 0 };
    if (value === mid) return { kind: "step", step: 1 };
    if (value === high) return { kind: "step", step: 2 };
    if (value < low) return { kind: "below" };
    if (value > high) return { kind: "above" };
    return { kind: "between", lower: value < mid ? 0 : 1 };
}

/** 값 하나 → 화면에 넘기는 모양 */
export const toItem = (key: SettingKey, value: number): SettingItem => ({
    value,
    steps: SETTING_DEFS[key].steps,
    position: position(key, value),
});

