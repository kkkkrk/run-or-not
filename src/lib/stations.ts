// src/lib/stations.ts
// 역 조회·검색. 서버(page·route)와 브라우저(검색·즐겨찾기) 양쪽에서 import한다
// → 'server-only'를 붙이지 않는다. React·스토어·브라우저 API를 import하지 않는다
import stationsJson from "@/data/stations.json";
import type { Station } from "@/types/subway";

export const allStations: Station[] = stationsJson;
/** 비교용 문자열로 바꾼다. 역 이름과 검색어에 같은 규칙을 쓴다 */
function normalize(text: string): string {
    return text.replace(/[^가-힣0-9a-zA-Z]/g, '').toLowerCase();
}

/** 역마다 정규화한 키를 로드 때 한 번 계산해 둔다. 검색할 때마다 다시 만들지 않기 위함 */
const searchIndex: { station: Station; key: string }[] = allStations.map((station)=>{
    return {station: station, key: normalize(station.name)}
});

/** id로 역 하나를 찾는다. 없으면 undefined (404 판단은 부른 쪽이 한다) */
export function getStation(id: string): Station | undefined { 
    return allStations.find((station)=> (station.id === id))
}

/** 검색어로 역을 찾는다. 앞부분 일치 먼저, 그다음 포함. 최대 limit개 */
export function searchStations(query: string, limit = 20) {
    const processedQuery = normalize(query).replace(/역$/, '');
    if(!processedQuery) return [];
    const rst = searchIndex.filter((station)=>
        station.key.includes(processedQuery)
    )
    .sort((a,b)=> {
        const aIsPrefix = a.key.startsWith(processedQuery);
        const bIsPrefix = b.key.startsWith(processedQuery);
        if (aIsPrefix === bIsPrefix) return 0;
        return aIsPrefix ? -1 : 1;
    })
    .map((station) => station.station)
    

    return rst.slice(0,limit);
}
