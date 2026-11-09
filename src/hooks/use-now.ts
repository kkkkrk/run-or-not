import { useSyncExternalStore } from "react";

// 모든 컴포넌트가 타이머 하나를 같이 쓴다.
let current: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function tick() {
    current = Date.now();
    listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void): () => void {
    listeners.add(onStoreChange);
    if (timer === undefined) {
        current = Date.now(); // 다시 구독할 때 오래된 값이 남지 않게
        timer = setInterval(tick, 1000);
    }
    return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0) {
            clearInterval(timer);
            timer = undefined;
        }
    };
}

// 브라우저: 마지막으로 잰 현재 시각 (같은 틱 안에서는 같은 값을 돌려줘야 함)
function getSnapshot(): number {
    if (current === null) current = Date.now();
    return current;
}

// 서버 렌더 + 첫 hydration 렌더: 시각이 서버와 달라지므로 null
function getServerSnapshot(): null {
    return null;
}

export function useNow(): number | null {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
