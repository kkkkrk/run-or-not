# 원본 역 데이터
- 출처: 서울 열린 데이터광장 서울시 역사마스터 정보  
- URL: (https://data.seoul.go.kr/dataList/OA-21232/S/1/datasetView.do)  
- 원본 파일명: 서울시 역사마스터 정보.json => station-master.json으로 변경  

## 갱신 방법

1. 같은 데이터셋에서 새로 받아 `station-master.json`을 교체
2. 이 파일의 「받은 날짜」 수정
3. `npx tsx scripts/build-stations.ts` 실행
4. 출력에서 확인
   - 「제외한 노선」에 새 노선이 생겼는지 → 필요하면 `LINES`·`ROUTE_TO_LINE`에 추가
   - 「중복 제거」 목록이 예상과 같은지
   - 「원본에 없는 ROW_OVERRIDES id」 경고가 없는지
   - 호선별 역 수가 크게 바뀌지 않았는지
5. `git diff src/data/stations.json`으로 바뀐 역 확인 후 커밋