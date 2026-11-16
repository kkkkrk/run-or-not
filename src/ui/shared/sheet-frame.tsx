import { useId, type KeyboardEvent } from "react";
import type { SheetFrameProps } from "@/types/ui";

/** 시트 안에서 Tab이 멈추는 곳. 꺼진 − + 는 disabled가 아니라 aria-disabled라서 여기 그대로 들어 있다 (platform-time-sheet.tsx) */
const TAB_STOPS = "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)";

/**
 * 시트가 열려 있는 동안의 포커스를 맡는다.
 *   열릴 때       포커스를 시트로 옮긴다
 *   열려 있는 동안 같은 화면 안에서 포커스가 시트 밖에 떨어지면 시트로 다시 데려온다
 *   닫힐 때       원래 있던 곳(시트를 연 버튼)으로 돌려준다
 *
 * 시트 안에는 「열려 있는 동안만 있는 표시」(<span hidden>)가 하나 있고, 이 함수는 그 표시의 ref다.
 * React는 ref 함수를 요소가 화면에 생길 때 부르고, 함수가 돌려준 뒷정리 함수를 요소가 사라질 때 부른다.
 * 그래서 상태도 effect도 없이 「열릴 때 한 번 · 닫힐 때 한 번」이 된다 (plan.md 1-3의 예외 「ref로 포커스 옮기기」).
 * 컴포넌트 밖에 둔 까닭: 안에 두면 그릴 때마다 새 함수가 되어, 1초마다 다시 그려질 때마다 포커스를 다시 옮긴다.
 */
function holdFocusInSheet(marker: HTMLElement | null) {
    const sheet = marker?.closest<HTMLElement>('[role="dialog"]');
    if (!sheet) return;

    const before = document.activeElement;
    // preventScroll: 포커스를 옮기면서 브라우저가 화면을 끌어 올리지 않게 한다 (시트는 이미 바닥에 붙어 있다)
    sheet.focus({ preventScroll: true });

    // Tab 가두기(아래 onKeyDown)는 시트 안에서 누른 Tab만 본다. 주소 표시줄에서 Tab으로 들어오는 것처럼 그 길을 거치지 않고
    // 포커스가 시트 밖(뒤의 역명판 · 카드)에 떨어지면 여기서 데려온다 — 그래야 Esc가 늘 시트에 닿는다.
    // 듣는 범위는 시트가 놓인 화면(부모)까지다. 화면 밖(미리보기의 다른 휴대폰 칸 · 조절 버튼)의 포커스는 건드리지 않는다
    const screen = sheet.parentElement;
    const pullBack = (event: FocusEvent) => {
        if (event.target instanceof Node && !sheet.contains(event.target)) sheet.focus({ preventScroll: true });
    };
    screen?.addEventListener("focusin", pullBack);

    return () => {
        screen?.removeEventListener("focusin", pullBack);
        // 포커스가 아직 시트 안(또는 아무 데도 아님)일 때만 돌려준다 — 이미 다른 곳으로 간 포커스를 빼앗지 않는다
        const now = document.activeElement;
        const stillHere = now === null || now === document.body || sheet.contains(now);
        if (stillHere && before instanceof HTMLElement && before.isConnected) before.focus({ preventScroll: true });
    };
}

/**
 * 시트 틀 — 아래에서 올라오는 흰 시트: 손잡이 + 제목 + 오른쪽 위 완료(검정 캡슐), 그 아래 내용(children).
 * 「승강장까지」 시트(U3)와 설정 시트(U5)가 같이 쓴다 (결정.md 1절, v32 CSS 10절 .bsheet · .handle · .sh-head · .done).
 *
 * 놓이는 곳: 화면 틀(<main>, relative · overflow-hidden) 안의 맨 아래. 틀의 바닥에 붙어서 열차 카드와 하단 캡슐을 덮고,
 * 판정 글자 · 캐릭터는 보이게 둔다. 그래서 뒤를 어둡게 덮는 막이 없다 (v32도 이 시트에는 .scrim을 그리지 않는다).
 * 색 화면 위에 떠도 늘 밝은 색(흰 면 · 짙은 글자)이다.
 *
 * 열고 닫기는 props로만 한다 (open · onOpenChange). 닫아 달라고 알리는 곳은 셋이다 — 완료 버튼 · Esc · 시트 바깥.
 *   - 전환: 닫혀 있을 때도 그려 두고 자기 높이만큼 아래로 내려 둔다. open이 바뀌면 CSS transition이 0.26초 동안 올리고 내린다
 *     (v32 sheet-in 0.26s cubic-bezier(0.2, 0.8, 0.2, 1). v32에는 내려가는 움직임이 없어서 같은 값을 거꾸로 쓴다).
 *     처음부터 열린 채로 그려지면 움직이지 않는다 (transition은 값이 바뀔 때만 움직인다).
 *   - 닫혀 있을 때: inert(누를 수도 포커스할 수도 없고 화면 낭독기에도 없다) + invisible(위쪽 그림자가 화면 바닥에 비치지 않게).
 *     숨기는 것(visibility)은 닫힐 때만 전환에 넣는다 — 다 내려간 뒤에 숨게. 열릴 때는 넣지 않아서 그 자리에서 바로 보인다:
 *     열릴 때도 넣으면 전환이 시작되는 순간에는 아직 「숨김」이라 포커스를 받지 못한다 (실제로 겪은 문제).
 *   - 바깥: 화면 틀 전체를 덮는 투명한 층. 누르면 닫히고, 그 누름이 뒤의 역명판 · 카드로 새지 않는다.
 *     키보드 · 화면 낭독기로는 Esc와 완료가 같은 일을 하므로 이 층은 숨긴다 (aria-hidden).
 *   - 포커스: 열리면 시트로 옮기고(위 holdFocusInSheet), Tab은 시트 안에서만 돈다 — 마지막에서 Tab이면 처음으로,
 *     처음에서 Shift+Tab이면 마지막으로. 닫히면 시트를 연 버튼으로 돌아간다.
 *   - 끌기: 시트 위에서 손가락으로 끌어도 브라우저가 화면을 끌지 않는다 (touch-pinch-zoom = 두 손가락 확대만 남김).
 *     손잡이를 보고 시트를 끌어내리려다 브라우저의 「당겨서 새로고침」이 걸리면 화면에 있는 동안만 쓰는 도보 시간이 사라진다.
 *     끌어서 닫는 동작은 없다 — 닫기는 완료 · Esc · 바깥.
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: px-5 pt-2.5 pb-6 = 좌우 20 · 위 10 · 아래 24px, 손잡이 w-9 h-1 = 36 × 4px,
 * mt-3.5 = 14px, 완료 h-11 px-4.5 = 높이 44px · 좌우 18px. z-15 · z-20은 v32의 .scrim(15) · .bsheet(20)과 같은 값이고
 * 하단 캡슐(10)보다 위다.
 *
 * 설정 시트(U5)에서만 달라지는 값은 여기 없다: 뒤를 어둡게 덮는 막(.scrim), 아래 여백 28px, 설명이 있을 때 제목 줄을 위로 맞추기.
 */
export function SheetFrame({ open, onOpenChange, title, description, children }: SheetFrameProps) {
    const id = useId();
    const titleId = `${id}-title`;
    const descriptionId = `${id}-description`;

    const close = () => onOpenChange(false);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            event.stopPropagation();
            close();
            return;
        }
        if (event.key !== "Tab") return;

        // 마지막에서 Tab · 처음에서 Shift+Tab이면 반대쪽 끝으로 보낸다 (그대로 두면 시트 뒤의 버튼으로 나간다)
        const sheet = event.currentTarget;
        const stops = sheet.querySelectorAll<HTMLElement>(TAB_STOPS);
        if (stops.length === 0) return;

        const first = stops[0];
        const last = stops[stops.length - 1];
        const active = document.activeElement;
        const leaving = event.shiftKey ? active === first || active === sheet : active === last;
        if (leaving) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
        }
    };

    return (
        <>
            {open && <div aria-hidden="true" onClick={close} className="absolute inset-0 z-15" />}

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description === null ? undefined : descriptionId}
                tabIndex={-1}
                inert={!open}
                onKeyDown={onKeyDown}
                className={`absolute inset-x-0 bottom-0 z-20 flex touch-pinch-zoom flex-col rounded-t-[28px] bg-surface px-5 pt-2.5 pb-6 text-ink shadow-[0_-8px_28px_rgb(15_23_42/0.18)] outline-none duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
                    open ? "translate-y-0 transition-[translate]" : "invisible translate-y-full transition-[translate,visibility]"
                }`}
            >
                {open && <span ref={holdFocusInSheet} hidden />}

                <div aria-hidden="true" className="h-1 w-9 self-center rounded-xs bg-[#CBD5E1]" />

                <div className="mt-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-16 font-extrabold">
                            {title}
                        </h2>
                        {description !== null && (
                            <p id={descriptionId} className="mt-0.75 text-13 leading-[1.45] font-semibold text-sub">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        className="h-11 flex-none cursor-pointer rounded-full bg-ink px-4.5 text-14 font-extrabold tracking-normal text-white"
                    >
                        완료
                    </button>
                </div>

                {children}
            </div>
        </>
    );
}
