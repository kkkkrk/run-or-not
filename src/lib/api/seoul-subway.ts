import 'server-only';

export async function fetchRealtimeArrival() {
    const url = "http://swopenapi.seoul.go.kr/api/subway/6f5a4d4642736177373065734f6958/json/realtimeStationArrival/0/10/%EA%B5%AC%EC%9D%98";
    // const url = "http://swopenapi.seoul.go.kr/api/subway/sample/json/realtimeStationArrival/0/5/%EC%84%9C%EC%9A%88";
    const res = await fetch(url);
    const data = await res.json();
    console.log('실시간 지하철: ', data);
    return data;
} 



