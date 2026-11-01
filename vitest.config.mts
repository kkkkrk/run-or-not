import { defineConfig } from "vitest/config";

// 배포 서버(Vercel)는 UTC로 돈다. 테스트도 항상 UTC로 돌려서
// 「내 맥(KST)에서만 맞는」 시간 계산을 바로 잡는다 (3-4 parseRecptnDt).
// 설정 파일이 테스트 워커보다 먼저 읽히므로 여기서 바꾸면 워커가 이 값을 물려받는다.
process.env.TZ = "UTC";

export default defineConfig({
    resolve: {
        tsconfigPaths: true, // "@/..." 별칭을 tsconfig.json paths대로 (Vite 8 기본 기능. 예전엔 vite-tsconfig-paths 플러그인)
    },
    test: {
        environment: "node", // lib 순수 함수만 테스트한다. 화면 테스트(jsdom)는 MVP 이후
    },
});
