'use client'
import { useId, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getLineColor } from "@/lib/line-color"
import { searchStations } from "@/lib/stations"

function stationHref(id: string): string {
    return `/station/${id}`;
}

export function StationSearch() {
    const router = useRouter();
    const listId = useId(); // 입력칸과 결과 목록을 aria 속성으로 잇는 id
    const [query, setQuery] = useState("");
    const [composing, setComposing] = useState(false); // 한글 조합 중 (compositionstart ~ compositionend)
    const [activeIndex, setActiveIndex] = useState(0);  // ↑↓로 고른 결과. 검색어가 바뀌면 맨 위로

    let results = searchStations(query);
    // 조합 중인 마지막 글자 때문에 0개가 되면(「공덕」을 치는 중의 「공더」) 그 글자를 빼고 찾는다.
    // 목록이 비었다가 다시 채워지며 튀지 않게. 조합이 끝나면 입력 그대로 찾는다
    if (composing && results.length === 0) {
        results = searchStations(query.slice(0, -1));
    }
    // 결과가 줄어 범위를 넘으면 마지막 줄로. 0개면 -1(고른 것 없음)
    const active = Math.min(activeIndex, results.length - 1);
    const expanded = results.length > 0;
    const optionId = (index: number) => `${listId}-${index}`;

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        // 조합 중에 누른 키는 IME가 글자를 끝내는 데 쓴다. 브라우저에 따라(맥 크롬 등) 조합이 끝난 뒤
        // 같은 키가 한 번 더 들어오므로, 여기서 무시하지 않으면 ↓가 두 칸 움직이고 Enter가 두 번 처리된다
        if (e.nativeEvent.isComposing || active < 0) return;

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault(); // 커서가 입력칸 맨 앞·맨 뒤로 가는 기본 동작 막기
            const next = e.key === "ArrowDown"
                ? Math.min(active + 1, results.length - 1)
                : Math.max(active - 1, 0);
            setActiveIndex(next);
            // 목록이 화면보다 길 때 고른 줄이 보이게
            document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
            e.preventDefault();
            router.push(stationHref(results[active].id));
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <Input
                    type="search"
                    role="combobox"
                    aria-label="역 이름 검색"
                    aria-autocomplete="list"
                    aria-expanded={expanded}
                    aria-controls={expanded ? listId : undefined}
                    aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                    autoComplete="off"
                    placeholder="역 이름을 입력해 주세요 (예: 공덕)"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIndex(0);
                    }}
                    onCompositionStart={() => setComposing(true)}
                    onCompositionEnd={() => setComposing(false)}
                    onKeyDown={handleKeyDown}
                    className="h-14 rounded-full border-2 border-gray-200 bg-white pl-13 pr-5 text-lg md:text-lg focus-visible:border-slate-400"
                />
            </div>

            {expanded ? (
                <ul id={listId} role="listbox" aria-label="검색 결과">
                    {results.map((station, i) => (
                        <li
                            key={station.id}
                            id={optionId(i)}
                            role="option"
                            aria-selected={i === active}
                            className="rounded-2xl hover:bg-slate-50 aria-selected:bg-slate-100"
                        >
                            {/* 키보드는 입력칸에서 ↑↓ Enter로 고르므로 링크는 Tab 순서에서 뺀다 */}
                            <Link href={stationHref(station.id)} tabIndex={-1} className="flex items-center gap-3 px-5 py-3">
                                <span
                                    aria-hidden
                                    className="size-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: getLineColor(station.lineName) }}
                                />
                                <span className="text-lg font-medium text-slate-800">{station.name}</span>
                                <span className="text-slate-500">{station.lineName}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                // 조합 중(첫 자음만 친 「ㄱ」 등)에는 안내도 띄우지 않는다
                query.trim() !== "" && !composing && (
                    <div className="py-8 text-center">
                        <p className="text-lg text-slate-700">검색 결과가 없어요</p>
                        <p className="mt-1 text-sm text-slate-500">2~7·9호선, 우이신설선 역만 찾을 수 있어요 (일부 구간 제외)</p>
                    </div>
                )
            )}
        </div>
    )
}
