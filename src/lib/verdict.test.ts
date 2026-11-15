// src/lib/verdict.test.ts
// 판정(judge)의 경계값을 고정한다 (plan v3 L1)
// 기준: 기본 설정 + 입력 { walkSec: 300 }
//   걸으면 = 300초,  걸으면+여유 = 330초
//   뛰면   = 역 안 60 + 바깥 240 × (4.5 ÷ 9.0) = 60 + 120 = 180초
import { describe, expect, it } from "vitest";
import { needSeconds, judge, judgeTrain, type VerdictSettings, type WalkInput } from "@/lib/verdict";
import type { Arrival } from "@/types/subway";

// ── 도우미 ──────────────────────────────────────────────────

// DEFAULT_SETTINGS와 같은 값. 숫자가 눈에 보이도록 직접 적는다
const settings: VerdictSettings = {
    walkSpeed: 4.5,
    runSpeed: 9.0,
    stationOverheadSec: 60,
    marginSec: 30,
};
const input: WalkInput = { walkSec: 300 }; // → 걸으면 300 · 뛰면 180
const need = { walk: 300, run: 180 };          // judgeTrain에 바로 넣을 값
const now = 0;

// now로부터 sec초 뒤에 도착하는 열차. 여러 대를 구분할 땐 이름을 붙인다
function train(sec: number, trainNo = "?"): Arrival {
    return { trainNo, arrivalAt: now + sec * 1000 } as Arrival;
}

// ── 1. 필요 시간 ────────────────────────────────────────────

describe("1. 필요 시간", () => {
    it("승강장까지 300초 → 걸으면 300, 뛰면 180", () => {
        expect(needSeconds({ walkSec: 300 }, settings)).toEqual({ walk: 300, run: 180 });
    });
    it("역 안 이동(60초)보다 짧으면 뛰어도 줄지 않는다", () => {
        expect(needSeconds({ walkSec: 40 }, settings)).toEqual({ walk: 40, run: 40 });
    });
    it("거리 375m → 걸으면 360, 뛰면 210", () => {
        expect(needSeconds({ meters: 375 }, settings)).toEqual({ walk: 360, run: 210 });
    });
    it("같은 거리면 직접 입력도 같은 값 (360초 = 375m)", () => {
        // 제목이 말하는 걸 그대로 검사: 두 입력의 결과가 같다
        expect(needSeconds({ walkSec: 360 }, settings)).toEqual(needSeconds({ meters: 375 }, settings));
    });
    it("거리가 딱 나눠떨어지지 않으면 올림", () => {
        expect(needSeconds({ meters: 651 }, settings)).toEqual({ walk: 581, run: 321 });
    });
});

// ── 2~4. 경계값 ─────────────────────────────────────────────

describe("2~4. 경계값", () => {
    it.each([
        { sec: 330, kind: "walk" },
        { sec: 329, kind: "run" },
    ])("walk 경계: 남은 $sec → $kind", ({ sec, kind }) => {
        expect(judgeTrain(train(sec), now, need, settings).kind).toBe(kind);
    });

    // 위 it.each를 복사해서 표에 4줄
    it.each([
        {sec: 159, kind: "miss"},
        {sec: 160, kind: "tight"},
        {sec: 199, kind: "tight"},
        {sec: 200, kind: "run"},
    ])("walk 경계: 남은 $sec → $kind", ({ sec, kind }) => {
        expect(judgeTrain(train(sec), now, need, settings).kind).toBe(kind);
    });
    it.each([
        {sec: 479, kind: "walk"},
        {sec: 480, kind: "slow"},
    ])("walk 경계: 남은 $sec → $kind", ({ sec, kind }) => {
        expect(judgeTrain(train(sec), now, need, settings).kind).toBe(kind);
    });
});

// ── 5~7. 열차 여러 대 ───────────────────────────────────────

describe("5~7. 열차 여러 대", () => {
    it("첫 열차 miss + 둘째 tight → tight, missed 1대, 그 뒤는 later", () => {
        const v = judge([train(159, "A"), train(160, "B")], now, input, settings);
        expect(v.kind).toBe("tight");
        if(v.kind !== "tight") return;
        expect(v.main.arrival.trainNo).toBe("B");
        expect(v.missed.map((t) => t.arrival.trainNo)).toEqual(["A"]);
    });

    it("첫 열차 miss, 둘째 walk → 둘째가 main, 첫째는 missed, 그 뒤는 later", () => {
        const v = judge([train(100, "A"), train(400, "B"), train(700, "C")], now, input, settings);
        expect(v.kind).toBe("walk");
        if (v.kind !== "walk" && v.kind !== "run") return;
        expect(v.main.arrival.trainNo).toBe("B");
        expect(v.missed.map((t) => t.arrival.trainNo)).toEqual(["A"]);
        expect(v.later.map((t) => t.arrival.trainNo)).toEqual(["C"]);
    });

    it("첫 열차 miss, 둘째 run → 둘째가 main", () => {
        const v = judge([train(100, "A"), train(250, "B"), train(700, "C")], now, input, settings);
        expect(v.kind).toBe("run");
        if (v.kind !== "walk" && v.kind !== "run") return;
        expect(v.main.arrival.trainNo).toBe("B");
        expect(v.missed.map((t) => t.arrival.trainNo)).toEqual(["A"]);
        expect(v.later.map((t) => t.arrival.trainNo)).toEqual(["C"]);
    });

    it("첫 열차부터 탈 수 있으면 첫째가 main, missed는 비고 나머지는 later (정렬)", () => {
        const v = judge([train(700, "C"), train(390, "B"), train(500, "D")], now, input, settings);
        if (v.kind !== "walk" && v.kind !== "run") throw new Error(`kind: ${v.kind}`);
        expect(v.kind).toBe("walk");
        expect(v.main.arrival.trainNo).toBe("B");
        expect(v.missed).toEqual([]);
        expect(v.later.map((t) => t.arrival.trainNo)).toEqual(["D", "C"]);
    });

    it("전부 miss → keep-walking, platformAt = now + 300 × 1000", () => {
        const v = judge([train(50, "A"), train(150, "B")], now, input, settings);
        expect(v.kind).toBe("keep-walking"); 
        if (v.kind !== "keep-walking") return;
        expect(v.platformAt).toBe(now + 300 * 1000);
        expect(v.trains.map((t) => t.arrival.trainNo)).toEqual(["A", "B"]);
    });

    it("열차 0대 → empty (keep-walking과 다른 kind)", () => {
        const v = judge([], now, input, settings);
        expect(v).toEqual({ kind: "empty" });
    });

    it("도착 순서가 뒤섞인 입력도 remainingSec 순으로 정렬", () => {
        const v = judge([train(700, "C"), train(100, "A"), train(400, "B")], now, input, settings);
        if (v.kind !== "walk" && v.kind !== "run") throw new Error(`kind: ${v.kind}`);
        expect(v.main.arrival.trainNo).toBe("B");
        expect(v.missed.map((t) => t.arrival.trainNo)).toEqual(["A"]);
        expect(v.later.map((t) => t.arrival.trainNo)).toEqual(["C"]);
    });
});