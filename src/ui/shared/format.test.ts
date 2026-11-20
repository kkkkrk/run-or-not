// src/ui/shared/format.test.ts
// 표시 형식의 경계값을 고정한다 (plan.md 1-2 — 표시 형식은 UI가 만들고 테스트도 같이 쓴다)
// 기준 글자는 design/v32.html 그림에 실제로 나오는 것들이다 (0분50초 · 3분20초 · 뛰어도 1분 부족 · 10초 전 · 시속 4.8km · 1분 30초)
import { describe, expect, it } from "vitest";
import {
    durationParts,
    endsWithBatchim,
    formatDistance,
    formatDistanceLimit,
    formatDuration,
    formatDurationSpaced,
    formatElapsed,
    formatSpeed,
    formatTrainTime,
    lineBadgeText,
    roundTo10,
} from "./format";

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

describe("durationParts — 시트의 큰 숫자 (숫자와 단위를 따로)", () => {
    it("분과 초가 다 있으면 두 조각 — v32 시트 그림의 「3분 30초」", () => {
        expect(durationParts(210)).toEqual([
            { value: 3, unit: "분" },
            { value: 30, unit: "초" },
        ]);
    });

    it("초가 0이면 분만 — 칩 3 · 5 · 7 · 10분", () => {
        expect(durationParts(180)).toEqual([{ value: 3, unit: "분" }]);
        expect(durationParts(600)).toEqual([{ value: 10, unit: "분" }]);
    });

    it("1분이 안 되면 초만 — 가장 작은 값 30초", () => {
        expect(durationParts(30)).toEqual([{ value: 30, unit: "초" }]);
    });

    it("둘 다 0이면 「0초」 한 조각 (빈 글자가 되지 않는다)", () => {
        expect(durationParts(0)).toEqual([{ value: 0, unit: "초" }]);
    });

    it("1시간이 넘어도 분으로 — 가장 큰 값 60분", () => {
        expect(durationParts(3600)).toEqual([{ value: 60, unit: "분" }]);
    });

    it("소수는 가까운 초로, 음수는 0초로 (formatDuration과 같은 규칙)", () => {
        expect(durationParts(59.6)).toEqual([{ value: 1, unit: "분" }]);
        expect(durationParts(-3)).toEqual([{ value: 0, unit: "초" }]);
    });

    it("roundTo10과 같이 쓰면 시트의 큰 숫자가 된다 — 396초 → 「6분 40초」", () => {
        expect(durationParts(roundTo10(396))).toEqual([
            { value: 6, unit: "분" },
            { value: 40, unit: "초" },
        ]);
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

describe("formatDurationSpaced — 설정의 시간 글자 (분과 초 사이를 띄운다)", () => {
    it("v32 그림의 단계 이름: 40초 · 1분 · 1분 30초", () => {
        expect(formatDurationSpaced(40)).toBe("40초");
        expect(formatDurationSpaced(60)).toBe("1분");
        expect(formatDurationSpaced(90)).toBe("1분 30초");
    });

    it("단계에 없는 값: 「직접 · 1분 10초」 · 「직접 · 2분 30초」", () => {
        expect(formatDurationSpaced(70)).toBe("1분 10초");
        expect(formatDurationSpaced(150)).toBe("2분 30초");
    });

    it("둘 다 0이면 「0초」, 음수도 「0초」 (formatDuration과 같은 규칙)", () => {
        expect(formatDurationSpaced(0)).toBe("0초");
        expect(formatDurationSpaced(-10)).toBe("0초");
    });

    it("띄어쓰기만 빼면 formatDuration과 같은 글자다", () => {
        for (const sec of [0, 10, 40, 60, 90, 180, 300]) {
            expect(formatDurationSpaced(sec).replace(" ", "")).toBe(formatDuration(sec));
        }
    });
});

describe("formatSpeed — 속도는 늘 소수 한 자리", () => {
    it("v32 그림의 값: 4.5 · 4.8 · 10.5", () => {
        expect(formatSpeed(4.5)).toBe("4.5");
        expect(formatSpeed(4.8)).toBe("4.8");
        expect(formatSpeed(10.5)).toBe("10.5");
    });

    it("정수여도 .0을 쓴다 — 뛰기 「보통」 9.0", () => {
        expect(formatSpeed(9)).toBe("9.0");
        expect(formatSpeed(14)).toBe("14.0");
    });

    it("0.1씩 더하다 생긴 끝자리 오차는 보이지 않는다", () => {
        expect(4.5 + 0.1 + 0.1 + 0.1).not.toBe(4.8); // 4.799999999999999
        expect(formatSpeed(4.5 + 0.1 + 0.1 + 0.1)).toBe("4.8");
        expect(formatSpeed(4.800000000000001)).toBe("4.8");
    });
});

describe("endsWithBatchim — 뒤에 붙는 말 고르기 (이에요 / 예요, 과 / 와)", () => {
    it("받침으로 끝나는 단계 이름: 보통 · 힘껏 · 1분", () => {
        expect(endsWithBatchim("보통")).toBe(true);
        expect(endsWithBatchim("힘껏")).toBe(true);
        expect(endsWithBatchim("1분")).toBe(true);
    });

    it("받침 없이 끝나는 단계 이름: 느긋하게 · 빠르게 · 40초 · 1분 30초", () => {
        expect(endsWithBatchim("느긋하게")).toBe(false);
        expect(endsWithBatchim("빠르게")).toBe(false);
        expect(endsWithBatchim("40초")).toBe(false);
        expect(endsWithBatchim("1분 30초")).toBe(false);
    });

    it("한글 음절의 양 끝: 가(받침 없음) · 힣(받침 있음)", () => {
        expect(endsWithBatchim("가")).toBe(false);
        expect(endsWithBatchim("각")).toBe(true);
        expect(endsWithBatchim("히")).toBe(false);
        expect(endsWithBatchim("힣")).toBe(true);
    });

    it("숫자로 끝나면 읽는 소리로 본다 — 영 · 일 · 삼 · 육 · 칠 · 팔은 받침이 있다 (역 찾기의 결과 없음 문구, U6)", () => {
        for (const word of ["종로0", "종로1", "을지로3", "종로6", "종로7", "종로8"]) expect(endsWithBatchim(word)).toBe(true);
        for (const word of ["종로2", "을지로4", "을지로5", "종로9"]) expect(endsWithBatchim(word)).toBe(false);
    });

    it("0으로 끝나는 수는 십 · 백으로 읽어도 받침이 있다", () => {
        expect(endsWithBatchim("30")).toBe(true);
        expect(endsWithBatchim("100")).toBe(true);
    });

    it("영문 · 기호 · 낱자로 끝나거나 빈 글자면 받침이 없는 것으로 본다", () => {
        expect(endsWithBatchim("km")).toBe(false);
        expect(endsWithBatchim("4.")).toBe(false);
        expect(endsWithBatchim("ㄱ")).toBe(false);
        expect(endsWithBatchim("")).toBe(false);
    });

    it("v39 그림의 검색어: 「홍데」와 · 「강남」과", () => {
        expect(endsWithBatchim("홍데")).toBe(false);
        expect(endsWithBatchim("강남")).toBe(true);
    });
});

describe("formatDistance — 가까운 역 줄의 거리", () => {
    it("v39 그림의 값: 320m · 780m", () => {
        expect(formatDistance(320)).toBe("320m");
        expect(formatDistance(780)).toBe("780m");
    });

    it("1km가 안 되면 10m 단위로 반올림한다 (5부터 올림)", () => {
        expect(formatDistance(324)).toBe("320m");
        expect(formatDistance(325)).toBe("330m");
        expect(formatDistance(4)).toBe("0m");
        expect(formatDistance(5)).toBe("10m");
    });

    it("1km부터는 km로 소수 한 자리 — 딱 떨어져도 .0을 쓴다", () => {
        expect(formatDistance(1000)).toBe("1.0km");
        expect(formatDistance(1100)).toBe("1.1km");
        expect(formatDistance(2000)).toBe("2.0km");
        expect(formatDistance(12340)).toBe("12.3km");
    });

    it("경계: 994m는 「990m」, 995m부터는 「1000m」가 아니라 「1.0km」", () => {
        expect(formatDistance(994)).toBe("990m");
        expect(formatDistance(995)).toBe("1.0km");
        expect(formatDistance(999)).toBe("1.0km");
    });

    it("km는 한 번만 반올림한다 — 1049m는 「1.0km」, 1050m는 「1.1km」", () => {
        expect(formatDistance(1049)).toBe("1.0km");
        expect(formatDistance(1050)).toBe("1.1km");
        expect(formatDistance(1150)).toBe("1.2km"); // 1.15.toFixed(1)은 「1.1」이 된다 — 그렇게 계산하지 않는다
    });

    it("소수는 가까운 값으로, 음수는 0m로", () => {
        expect(formatDistance(319.6)).toBe("320m");
        expect(formatDistance(-20)).toBe("0m");
    });
});

describe("formatDistanceLimit — 「2km 안에 판정할 수 있는 역이 없어요」의 거리", () => {
    it("v39 그림의 값: 2000m → 「2km」 (소수 없이)", () => {
        expect(formatDistanceLimit(2000)).toBe("2km");
        expect(formatDistanceLimit(1000)).toBe("1km");
    });

    it("딱 떨어지지 않으면 formatDistance와 같다", () => {
        expect(formatDistanceLimit(1500)).toBe("1.5km");
        expect(formatDistanceLimit(800)).toBe("800m");
    });

    it("10km가 넘어도 끝의 .0만 뗀다 — 「10km」 · 「20.5km」", () => {
        expect(formatDistanceLimit(10000)).toBe("10km");
        expect(formatDistanceLimit(20500)).toBe("20.5km");
    });
});

describe("lineBadgeText — 호선 배지 글자", () => {
    it("「N호선」은 숫자만", () => {
        expect(lineBadgeText("2호선")).toBe("2");
        expect(lineBadgeText("7호선")).toBe("7");
        expect(lineBadgeText("9호선")).toBe("9");
    });

    it("우이신설선만 「우이」 (결정.md 1절)", () => {
        expect(lineBadgeText("우이신설선")).toBe("우이");
    });

    it("정해진 모양이 없는 노선은 빈 글자 → 색 원만 그려진다", () => {
        expect(lineBadgeText("신분당선")).toBe("");
        expect(lineBadgeText("경의중앙선")).toBe("");
        expect(lineBadgeText("")).toBe("");
    });
});
