"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useWalkTimeStore } from "@/stores/walk-time-store";

// skipHydration: true로 만든 persist 스토어 목록.
// 7단계에서 favorites-store·recent-store를 여기에 추가한다.
const PERSISTED_STORES = [useSettingsStore, useWalkTimeStore];

// 스토어 중 하나라도 복원이 끝나면 React에게 "스냅샷 다시 읽어"라고 알린다.
function subscribe(onStoreChange: () => void): () => void {
    const unsubscribes = PERSISTED_STORES.map((store) =>
        store.persist.onFinishHydration(onStoreChange),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

// 브라우저: 전부 복원됐는지
function getSnapshot(): boolean {
    return PERSISTED_STORES.every((store) => store.persist.hasHydrated());
}

// 서버 렌더 + 첫 hydration 렌더: 서버는 localStorage를 모르므로 항상 false
function getServerSnapshot(): boolean {
    return false;
}

export function useHydrated(): boolean {
    const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    useEffect(() => {
    // 여러 컴포넌트가 이 훅을 써도, StrictMode로 effect가 두 번 돌아도 한 번만 복원
        for (const store of PERSISTED_STORES) {
            if (!store.persist.hasHydrated()) {
            void store.persist.rehydrate();
            }
        }
    }, []);

    return hydrated;
}