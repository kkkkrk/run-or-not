// src/lib/verdict.test.ts
// 판정(judge)의 경계값을 고정한다 (plan.md T2)
// 기준: 기본 설정 + 도보 입력 { walkSec: 300 }
//   걷기 필요 = 300 + 60 = 360초,  걷기+여유 = 390초
//   뛰기 필요 = 300×1.3÷3.0 + 60 = 130 + 60 = 190초
import { describe, expect, it } from "vitest";
import { judge, needSeconds, type VerdictSettings, type WalkInput } from "@/lib/verdict";
import type { Arrival } from "@/types/subway";

// ── 도우미 ──────────────────────────────────────────────────

// DEFAULT_SETTINGS와 같은 값. 숫자가 눈에 보이도록 직접 적는다
const S: VerdictSettings = {
    walkSpeed: 1.3,
    runSpeed: 3.0,
    stationOverheadSec: 60,
    marginSec: 30,
};
const WALK: WalkInput = { walkSec: 300 };
const NOW = 1_700_000_000_000;

// now로부터 sec초 뒤에 도착하는 열차
function train(trainNo: string, sec: number): Arrival {
    return {
        trainNo,
        subwayId: "1007",
        direction: "up",
        destination: "장암",
        label: "장암행",
        message: "",
        arrivalAt: NOW + sec * 1000,
        basis: "changed",
    };
}

// ── needSeconds ─────────────────────────────────────────────

describe("needSeconds", () => {
    it("{ walkSec: 300 } → 걷기 360초, 뛰기 190초", () => {
        expect(needSeconds(WALK, S)).toEqual({ walk: 360, run: 190 });
    });

    it("{ meters } → 거리÷속도 + 역 안 시간 (올림)", () => {
        // 걷기: 650 ÷ 1.3 = 500 + 60 = 560
        // 뛰기: 650 ÷ 3.0 = 216.67 + 60 = 276.67 → 277
        expect(needSeconds({ meters: 650 }, S)).toEqual({ walk: 560, run: 277 });
    });
});

// ── judge: 경계값 ───────────────────────────────────────────

describe("judge 경계값", () => {
    it("남은 390초(= 걷기+여유) → walk", () => {
        const v = judge([train("A", 390)], NOW, WALK, S);
        expect(v.kind).toBe("walk");
    });

    it("남은 389초(1초 모자람) → run", () => {
        const v = judge([train("A", 389)], NOW, WALK, S);
        expect(v.kind).toBe("run");
    });

    it("남은 190초(= 뛰기 필요) → run", () => {
        const v = judge([train("A", 190)], NOW, WALK, S);
        expect(v.kind).toBe("run");
    });

    it("남은 189초(1초 모자람) → miss라서 keep-walking", () => {
        const v = judge([train("A", 189)], NOW, WALK, S);
        expect(v.kind).toBe("keep-walking");
        if (v.kind !== "keep-walking") return;
        expect(v.trains[0].kind).toBe("miss");
    });
});

// ── judge: 열차 여러 대 ─────────────────────────────────────

describe("judge 열차 여러 대", () => {
    it("첫 열차 miss, 둘째 walk → 둘째가 main, 첫째는 missed, 그 뒤는 later", () => {
        const v = judge(
            [train("A", 100), train("B", 400), train("C", 700)],
            NOW, WALK, S,
        );
        expect(v.kind).toBe("walk");
        if (v.kind !== "walk" && v.kind !== "run") return;
        expect(v.main.arrival.trainNo).toBe("B");
        expect(v.missed.map((t) => t.arrival.trainNo)).toEqual(["A"]);
        expect(v.later.map((t) => t.arrival.trainNo)).toEqual(["C"]);
    });

    it("첫 열차 miss, 둘째 run → 둘째가 main", () => {
        const v = judge(
            [train("A", 100), train("B", 250), train("C", 700)],
            NOW, WALK, S,
        );
        expect(v.kind).toBe("run");
        if (v.kind !== "walk" && v.kind !== "run") return;
        expect(v.main.arrival.trainNo).toBe("B");
        expect(v.missed.map((t) => t.arrival.trainNo)).toEqual(["A"]);
        expect(v.later.map((t) => t.arrival.trainNo)).toEqual(["C"]);
    });

    it("도착 순서가 뒤섞인 입력도 remainingSec 순으로 정렬", () => {
        const v = judge(
            [train("C", 700), train("A", 100), train("B", 400)],
            NOW, WALK, S,
        );
        if (v.kind !== "walk" && v.kind !== "run") throw new Error(`kind: ${v.kind}`);
        expect(v.main.arrival.trainNo).toBe("B");
        expect(v.missed.map((t) => t.arrival.trainNo)).toEqual(["A"]);
        expect(v.later.map((t) => t.arrival.trainNo)).toEqual(["C"]);
    });

    it("전부 miss → keep-walking, platformAt = now + 360 × 1000", () => {
        const v = judge([train("A", 50), train("B", 150)], NOW, WALK, S);
        expect(v.kind).toBe("keep-walking");
        if (v.kind !== "keep-walking") return;
        expect(v.platformAt).toBe(NOW + 360 * 1000);
        expect(v.trains.map((t) => t.arrival.trainNo)).toEqual(["A", "B"]);
    });

    it("열차 0대 → empty (keep-walking과 다른 kind)", () => {
        const v = judge([], NOW, WALK, S);
        expect(v).toEqual({ kind: "empty" });
        expect(v.kind).not.toBe("keep-walking");
    });
});
