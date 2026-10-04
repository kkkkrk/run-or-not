// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // useState로 감싸야 리렌더링 시 QueryClient가 새로 생성되지 않음
    const [queryClient] = useState(
    () =>
        new QueryClient({
        defaultOptions: {
            queries: {
            staleTime: 60 * 1000, // 1분 (SSR 시 즉시 refetch 방지)
            },
        },
        }),
    );

    return (
    <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    );
}