import type { Arrival, Direction } from "@/types/subway";

// 서울시 원본 응답의 열차 하나. 실제 응답에서 "쓰는 필드만" 정의한다.
// 이 타입은 이 파일 밖으로 나가면 안 된다.
type RawArrivalFailure = {
    status: number; 
    code: string;
    message: string;
}
//TODO: 주석 요소도 적용시켜야함
type RawArrival = {
    recptnDt:string; // 이 도착 정보를 생성한 시각(한국 시간) 예: "2026-10-09 15:10:23" 
    subwayId:string; //몇호선인지 호선코드 2호선 예: "1002"
    updnLine:string; // 열차 진행 방향 예: 2호선: 내선, 외선 나머지: 상행 하행
    /**key로 사용*/
    btrainNo:string; //열차번호 예: "4298"
    barvlDt:string; // 데이터가 만들어진 시점 기준으로 열차가 도착하기까지 남은 초 예: "60"
    arvlMsg2:string; // 도착 안내 문구 예: 5분 20초 후
    arvlMsg3:string; //열차의 현재 위치 역 이름 예: "성수"
    trainLineNm:string; //행선지 - 다음 방면 예: 성수행 - 잠실나루방면

    // bstatnNm:string; // 종착역 이름
    // btrainSttus:string;  //열차 종류 예: 일반/급행/ITX
    // arvlCd:string;  //도착코드 0: 진입 1: 도착 2: 출발 3: 전역 출발 4: 전역진입 5: 전역도착 99: 운행중
    // lstcarAt:string; //막차여부 0/1
}
type RawArrivalSuccess = {
    errorMessage: RawArrivalFailure;
    realtimeArrivalList: RawArrival[];
}
type RawArrivalResponse = RawArrivalSuccess | RawArrivalFailure;

// "2026-10-09 14:35:10" 같은 문자열을 한국 시간(+09:00)으로 해석해 ms로.
export function parseRecptnDt(recptnDt: string): number {

}

// 방향 문자열 → "up" | "down". 모르는 값은 null로 걸러낸다.
export function toDirection(updnLine: string): Direction | null {

}

// 열차 하나 변환. 남은 초가 비었거나 방향을 모르면 null.
// arrivalAt = parseRecptnDt(recptnDt) + 남은 초 * 1000
export function toArrival(raw: RawArrival): Arrival | null {

}

// 전체 변환: 다른 호선 거르기 → toArrival → null 제거 → arrivalAt 오름차순 정렬
export function toArrivals(raws: RawArrival[], subwayId: string): Arrival[] {

}