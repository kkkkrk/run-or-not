"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// layout(서버 컴포넌트)은 Context Provider를 직접 쓸 수 없어서 이 파일로 따로 뺀다.
// children은 서버에서 이미 그려진 채로 넘어오므로, 각 페이지는 서버 컴포넌트로 남는다.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // 렌더할 때마다 new QueryClient()를 부르면 캐시가 매번 새로 생긴다 → useState 초기화 함수로 한 번만.
  // 모듈 최상단에 두지 않는 이유: 서버에서는 모듈이 요청 사이에 공유돼 다른 사용자와 캐시가 섞일 수 있음.
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* NODE_ENV가 development일 때만 그려짐. 배포 빌드에서는 빈 컴포넌트 */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
