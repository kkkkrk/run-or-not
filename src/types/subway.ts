export type Station = {
    id: string;        // (역, 호선) 단위 고유값. URL의 [id]
    name: string;      // 화면 표시용 "공릉"
    apiName: string;   // 서울시 API 조회용 "공릉(서울산업대입구)"
    subwayId: string;  // 서울시 응답의 호선 코드 (예: 1007)
    lineName: string;  // "7호선"
    lat: number;
    lng: number;
};

export type Direction = "up" | "down";

export type ArrivalObservation = {
    trainNo: string; 
    subwayId: string; 
    direction: Direction;
    destination: string; 
    label: string; 
    message: string;
    observedAt: number;    // recptnDt(+09:00) → ms
    remainingSec: number;  // barvlDt, 0·빈 값은 이미 걸러짐
};

export type Arrival = Omit<ArrivalObservation, "observedAt" | "remainingSec"> & {
    arrivalAt: number;
    basis: "changed" | "first-seen";
};