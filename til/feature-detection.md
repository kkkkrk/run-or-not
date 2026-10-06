# Feature Detection
기능 감지: 이 환경에서 이 기능을 쓸 수 있는지 확인

### `!window.isSecureContext` 
➡️ 보안 컨텍스트가 아닐 때  
배포할 때는 어차피 보통 https라 쓸 일이 없지만 디버깅할 때 많이 사용함 ex: 사내 ip, 핸드폰으로 http로 확인

보안 컨텍스트: https, localhost, 127.0.0.1, file://  
보안 컨텍스트가 아닌 경우: **http**

