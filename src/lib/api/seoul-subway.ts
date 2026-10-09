import 'server-only';

const BASE = "http://swopenapi.seoul.go.kr/api/subway"; 
export async function fetchRealtimeArrivals(apiName:string):Promise<unknown> {
    const key = process.env.SEOUL_API_KEY;
    if(!key){
        throw new Error("SEOUL_API_KEY 환경 변수가 없습니다"); 
    } 
    const url = `${BASE}/${key}/json/realtimeStationArrival/0/30/${encodeURIComponent(apiName)}`;
    //TODO: revalidate 시간 늘리기
    const res = await fetch(url, {next: {revalidate: 2}}); 
    if(!res.ok){
        throw new Error(`HTTP 에러: ${res.status}`)
    }
    const data = await res.json(); 
    return data;
} 




