import { Verdict } from "@/lib/verdict"

// 남은 초 → 「N분 N초」. 올림/내림 규칙은 여기 한 곳에서만 정한다.
// 내림: 실제보다 길게 보여 주면 놓칠 수 있으니 짧은 쪽으로 보여 준다.
export function formatRemaining(remainingSec: number): string {
    const total = Math.max(0, Math.floor(remainingSec));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return min > 0 ? `${min}분 ${sec}초` : `${sec}초`;
}

export function VerdictCard({verdict}:{
    verdict: Verdict;
}){
    let title: string;
    let titleColor: string;
    let message: string;

    switch (verdict.kind) {
        case "walk":
            title = "걸어가요";
            titleColor = "text-[#10B981]";
            message = `다음 열차 ${formatRemaining(verdict.main.remainingSec)} 남아요`;
            break;
        case "run":
            title = "뛰어요";
            titleColor = "text-red-500";
            message = `다음 열차 ${formatRemaining(verdict.main.remainingSec)} 남아요`;
            break;
        case "keep-walking":
            title = "일단 걸어가요";
            titleColor = "text-amber-500";
            message = "역에 도착하면 다음 열차를 다시 봐요";
            break;
        case "empty":
            title = "이 방향으로 가는 열차가 없어요";
            titleColor = "text-slate-500";
            message = "";
            break;
        default: {
            // Verdict에 kind가 추가되면 여기서 타입 에러가 난다.
            const unreachable: never = verdict;
            throw new Error(`알 수 없는 판정: ${JSON.stringify(unreachable)}`);
        }
    }

    return (
        <div className="flex flex-col items-center text-center">
            <h1 className={`mb-4 font-black ${titleColor} ${verdict.kind === "empty" ? "text-3xl" : "text-6xl"}`}>
                {title}
            </h1>
            {message && (
                <p className="text-lg font-medium text-slate-600">
                    {message}
                </p>
            )}
        </div>
    )
}
