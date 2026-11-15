// src/ui/shared/format.test.ts
// 표시 형식의 경계값을 고정한다 (plan.md 1-2 — 표시 형식은 UI가 만들고 테스트도 같이 쓴다)
// 기준 글자는 design/v32.html 그림에 실제로 나오는 것들이다 (0분50초 · 3분20초 · 뛰어도 1분 부족 · 10초 전)
import { describe, expect, it } from "vitest";
import { formatDuration, formatElapsed, formatTrainTime, roundTo10 } from "./format";

describe("roundTo10 — 10초 단위 반올림", () => {
    it("이미 10초 단위면 그대로", () => {
        expect(roundTo10(0)).toBe(0);
        expect(roundTo10(200)).toBe(200);
    });

    it("5초부터 올리고 그 아래는 내린다", () => {
        expect(roundTo10(194)).toBe(190);
        expect(roundTo10(194.9)).toBe(190);
        expect(roundTo10(195)).toBe(200);
        expect(roundTo10(204.9)).toBe(200);
    });

    it("v32 그림의 값: 420m ÷ 1.25 + 60 = 396초 → 400초, 420m ÷ 2.5 + 60 = 228초 → 230초", () => {
        expect(roundTo10(396)).toBe(400);
        expect(roundTo10(228)).toBe(230);
    });
});

describe("formatDuration — 승강장까지 · 부족 (짧게)", () => {
    it("1분이 안 되면 초만 쓴다", () => {
        expect(formatDuration(50)).toBe("50초");
        expect(formatDuration(0)).toBe("0초");
    });

    it("초가 0이면 분만 쓴다", () => {
        expect(formatDuration(60)).toBe("1분");
        expect(formatDuration(300)).toBe("5분");
    });

    it("분과 초가 다 있으면 붙여 쓴다 (띄어쓰기 없음)", () => {
        expect(formatDuration(200)).toBe("3분20초");
        expect(formatDuration(110)).toBe("1분50초");
        expect(formatDuration(550)).toBe("9분10초");
    });

    it("1시간이 넘어도 분으로 쓴다 (입력 범위는 60분까지)", () => {
        expect(formatDuration(3600)).toBe("60분");
    });

    it("소수는 가까운 초로, 음수는 0초로", () => {
        expect(formatDuration(59.6)).toBe("1분");
        expect(formatDuration(-3)).toBe("0초");
    });

    it("roundTo10과 같이 쓰면 화면 글자가 된다", () => {
        expect(formatDuration(roundTo10(396))).toBe("6분40초");
        expect(formatDuration(roundTo10(78))).toBe("1분20초");
    });
});

describe("formatTrainTime — 열차 남은 시간 (분을 늘 쓴다)", () => {
    it("1분이 안 돼도 0분을 쓴다", () => {
        expect(formatTrainTime(50)).toBe("0분50초");
        expect(formatTrainTime(1)).toBe("0분1초");
    });

    it("초가 0이면 분만 쓴다", () => {
        expect(formatTrainTime(180)).toBe("3분");
        expect(formatTrainTime(0)).toBe("0분");
    });

    it("v32 그림의 값", () => {
        expect(formatTrainTime(150)).toBe("2분30초");
        expect(formatTrainTime(520)).toBe("8분40초");
        expect(formatTrainTime(850)).toBe("14분10초");
    });

    it("소수는 버린다 — 실제보다 길게 보여 주지 않는다", () => {
        expect(formatTrainTime(150.9)).toBe("2분30초");
        expect(formatTrainTime(59.999)).toBe("0분59초");
        expect(formatTrainTime(0.4)).toBe("0분");
    });

    it("이미 지난 시간(음수)은 0분", () => {
        expect(formatTrainTime(-5)).toBe("0분");
    });
});

describe("formatElapsed — 새로고침 글자 (10초 단위)", () => {
    it("10초 안은 「방금」", () => {
        expect(formatElapsed(0)).toBe("방금");
        expect(formatElapsed(9.9)).toBe("방금");
    });

    it("10초부터 10초 단위로 내려 쓴다", () => {
        expect(formatElapsed(10)).toBe("10초 전");
        expect(formatElapsed(19.9)).toBe("10초 전");
        expect(formatElapsed(20)).toBe("20초 전");
        expect(formatElapsed(59.9)).toBe("50초 전");
    });

    it("시계가 어긋나 음수가 와도 「방금」", () => {
        expect(formatElapsed(-2)).toBe("방금");
    });

    it("60초 이상을 「1분 전 정보」로 바꾸지 않는다 — 그 비교는 로직(stale)이 한다", () => {
        expect(formatElapsed(60)).toBe("60초 전");
    });
});
