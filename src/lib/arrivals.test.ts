// src/lib/arrivals.test.ts
// 화면에서 눈으로 잡기 어려운 규칙만 테스트한다 (2026-11-01 범위 결정)
//   3-4: 시간대, barvlDt 0·빈 값, 묵은 행·미래 행, 종착 열차와 순환 예외
//   3-6: 반복값 유지, 값 바뀜, 처음 본 열차 보정
// 결과 전체를 비교하지 않고 지켜야 할 규칙(남는 열차 번호, 시각)만 확인한다
import { describe, expect, it } from "vitest";
import {
    LINE_OFFSET_SEC,
    anchorArrivals,
    parseRecptnDt,
    readArrivalResponse,
    toObservations,
} from "@/lib/arrivals";
import type { ArrivalObservation } from "@/types/subway";
import bonghwasan from "./__fixtures__/bonghwasan-6.json";
import onsu from "./__fixtures__/onsu-7.json";
import seongsu from "./__fixtures__/seongsu-2.json";

// ── 도우미 ──────────────────────────────────────────────────

// 한국 시간 → ms. parseRecptnDt와 다른 방법(Date.UTC에서 9시간 빼기)으로 기대값을 만든다
function kst(date: string, time: string): number {
    const [y, mo, d] = date.split("-").map(Number);
    const [h, mi, s] = time.split(":").map(Number);
    return Date.UTC(y, mo - 1, d, h - 9, mi, s);
}

// 원본 한 줄. RawArrival은 export하지 않으므로 함수 인자 타입에서 꺼낸다
type Raw = Parameters<typeof toObservations>[0][number];
function raw(over: Partial<Raw> = {}): Raw {
    return {
        subwayId: "1007",
        updnLine: "하행",
        trainLineNm: "석남행 - 까치울방면",
        statnId: "1007000750", // 온수
        bstatnId: "1007000761", // 석남
        bstatnNm: "석남",
        btrainNo: "7157",
        barvlDt: "360",
        recptnDt: "2026-11-01 15:23:41",
        arvlMsg2: "6분 후 (광명사거리)",
        arvlMsg3: "광명사거리",
        arvlCd: "99",
        ...over,
    };
}

// 픽스처 → 관측값의 열차 번호 (정렬)
function trainNosOf(fixture: { response: unknown; fetchedAtMs: number }, subwayId: string): string[] {
    const { list } = readArrivalResponse(fixture.response);
    return toObservations(list, subwayId, fixture.fetchedAtMs).map((o) => o.trainNo).sort();
}

// 관측값 한 개 (3-6). 기본은 2026-11-02(월) 10:00:00에 180초 남은 7호선 하행
const at = (time: string) => kst("2026-11-02", time);
function obs(over: Partial<ArrivalObservation> = {}): ArrivalObservation {
    return {
        trainNo: "7155",
        subwayId: "1007",
        direction: "down",
        destination: "석남",
        label: "석남행 - 까치울방면",
        message: "3분 후 (광명사거리)",
        observedAt: at("10:00:00"),
        remainingSec: 180,
        ...over,
    };
}

// ── 테스트 ──────────────────────────────────────────────────

describe("테스트 환경", () => {
    it("UTC로 돈다 (vitest.config.mts에서 TZ 고정, 배포 서버와 같은 조건)", () => {
        expect(new Date().getTimezoneOffset()).toBe(0);
    });
});

describe("parseRecptnDt", () => {
    it("시간대 표기 없는 문자열을 한국 시간으로 읽는다", () => {
        expect(parseRecptnDt("2026-11-01 15:23:41")).toBe(Date.UTC(2026, 10, 1, 6, 23, 41));
    });

    it("한국 자정 직후는 UTC로 전날 15시대다", () => {
        expect(parseRecptnDt("2026-11-01 00:10:00")).toBe(Date.UTC(2026, 9, 31, 15, 10, 0));
    });
});

describe("toObservations", () => {
    const now = kst("2026-11-01", "15:24:00");

    it("barvlDt가 0이거나 비면 거른다", () => {
        const rows = [
            raw({ btrainNo: "keep" }),
            raw({ btrainNo: "zero", barvlDt: "0" }),
            raw({ btrainNo: "empty", barvlDt: "" }),
        ];
        expect(toObservations(rows, "1007", now).map((o) => o.trainNo)).toEqual(["keep"]);
    });

    it("3분 넘게 묵은 행과 1분 넘게 미래인 행은 거른다 (딱 3분·딱 1분은 남김)", () => {
        const now = kst("2026-11-01", "15:30:00");
        const rows = [
            raw({ btrainNo: "stale-edge", recptnDt: "2026-11-01 15:27:00" }), // 정확히 3분 전 → 남김
            raw({ btrainNo: "stale", recptnDt: "2026-11-01 15:26:59" }), //      3분 1초 전 → 버림
            raw({ btrainNo: "future-edge", recptnDt: "2026-11-01 15:31:00" }), // 정확히 1분 뒤 → 남김
            raw({ btrainNo: "future", recptnDt: "2026-11-01 15:31:01" }), //     1분 1초 뒤 → 버림
        ];
        expect(toObservations(rows, "1007", now).map((o) => o.trainNo).sort()).toEqual(["future-edge", "stale-edge"]);
    });

    it("이 역에서 끝나는 열차는 거른다 (온수 7호선 하행 온수행)", () => {
        const nos = trainNosOf(onsu, "1007");
        expect(nos).not.toContain("7155"); // 온수행 (bstatnId = statnId)
        expect(nos).toContain("7157"); //     석남행은 남음
    });

    it("이 역에서 끝나는 열차는 거른다 (봉화산 6호선 하행 봉화산행)", () => {
        const nos = trainNosOf(bonghwasan, "1006");
        expect(nos).not.toContain("6129"); // 봉화산행
        expect(nos).toContain("6127"); //     신내행은 남음
    });

    it("종착 판단은 이름이 아니라 id로 한다", () => {
        const rows = [
            raw({ btrainNo: "same-id", bstatnId: "1007000750", bstatnNm: "이름이 달라도" }), // id 같음 → 종착
            raw({ btrainNo: "same-name", bstatnId: "1007000761", bstatnNm: "온수" }), //       이름만 같음 → 계속 감
        ];
        expect(toObservations(rows, "1007", now).map((o) => o.trainNo)).toEqual(["same-name"]);
    });

    it("2호선 성수행은 성수에서도 남긴다 (순환 표기 예외)", () => {
        expect(trainNosOf(seongsu, "1002")).toEqual(["2215", "2217", "2222", "2226"]);
    });

    // MVP 이후로 미룸: 화면 목록에서 바로 보이는 규칙
    it.todo("다른 호선 행을 거른다");
    it.todo("방향 문자열을 Direction으로 바꾼다 (모르는 값은 null)");
});

describe("anchorArrivals", () => {
    it("같은 남은 초가 반복되면 처음 고정한 시각을 유지한다", () => {
        // 10:00:00 180초 → 10:00:20 180초 → 10:00:40 180초 (recptnDt만 바뀐 응답)
        const first = anchorArrivals({}, [obs({ observedAt: at("10:00:00"), remainingSec: 180 })]);
        const second = anchorArrivals(first.next, [obs({ observedAt: at("10:00:20"), remainingSec: 180 })]);
        const third = anchorArrivals(second.next, [obs({ observedAt: at("10:00:40"), remainingSec: 180 })]);

        const expected = at("10:03:00") - LINE_OFFSET_SEC["1007"] * 1000; // 첫 관측의 보정은 그대로 남는다
        for (const r of [first, second, third]) {
            expect(r.arrivals).toHaveLength(1);
            expect(r.arrivals[0].arrivalAt).toBe(expected);
            expect(r.arrivals[0].basis).toBe("first-seen");
        }
    });

    it("남은 초가 바뀌면 그 응답 기준으로 다시 고정한다", () => {
        const first = anchorArrivals({}, [obs({ observedAt: at("10:00:00"), remainingSec: 180 })]);
        const second = anchorArrivals(first.next, [obs({ observedAt: at("10:00:20"), remainingSec: 150 })]);

        expect(second.arrivals[0].arrivalAt).toBe(at("10:02:50")); // 10:00:20 + 150초, 보정 없음
        expect(second.arrivals[0].basis).toBe("changed");
    });

    it("처음 본 열차는 노선 보정값을 뺀다", () => {
        const r = anchorArrivals({}, [obs({ trainNo: "9101", subwayId: "1009", observedAt: at("10:00:00"), remainingSec: 180 })]);

        expect(r.arrivals[0].arrivalAt).toBe(at("10:03:00") - LINE_OFFSET_SEC["1009"] * 1000);
        expect(r.arrivals[0].basis).toBe("first-seen");
    });

    // MVP 이후로 미룸 (사라진 열차는 5-3 화면에서 확인)
    it.todo("새 응답에 없는 열차는 맵에서 지운다");
    it.todo("우이신설선처럼 매번 1초씩 줄어드는 값은 매 응답 기준으로 다시 고정된다");
    it.todo("2호선처럼 보정값이 음수면 도착 시각이 늦어진다");
});
