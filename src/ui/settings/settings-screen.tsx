import type { SettingsScreenProps, SettingStep } from "@/types/ui";
import { rowChevron } from "@/ui/shared/icons";
import { ScreenFrame } from "@/ui/shared/screen-frame";
import { SETTING, SETTING_KEYS, stepNamesOf, valueText } from "./setting-items";

const STEPS: SettingStep[] = [0, 1, 2];

/**
 * 설정 화면 — 한 카드 안에 걷기 속도 · 뛰기 속도 · 역 안 이동 · 여유, 항목마다 세 단계 버튼
 * (결정.md 1절 「설정 화면」, v32 CSS 11절 .home-top · .wordmark, 12절 .settings · .card · .seg · .reset · .o1-*, 스크립트 5절 settings()).
 * 흰 화면이고 역명판이 없다. 맨 위에 「설정」과 오른쪽 「처음 값으로」, 그 아래 카드, 맨 아래 하단 캡슐(화면 틀이 놓는다).
 *
 * 값은 하나도 들고 있지 않다 — 누르면 콜백으로 알리고, 바뀐 값을 props로 다시 받아 그린다.
 *   단계 버튼        onSelectStep(항목, 0 | 1 | 2). 켜진 버튼은 지금 값이 그 단계일 때(item.position이 "step")
 *   이름 줄(끝에 ›)  onOpenSheet(항목) → 페이지가 그 항목의 설정 시트를 연다. 줄 전체가 버튼이다
 *   처음 값으로      onReset(). canReset이 false면 꺼져 있다 (바꾼 값이 없을 때)
 * 단계에 없는 값이면(position이 "step"이 아니면) 세 버튼을 모두 끄고 이름 줄 오른쪽에 「직접 · 시속 4.8km」를 진하게 쓴다.
 * 평소(단계 값일 때)에는 그 자리에 아무 글자도 없다.
 *
 * 설정 시트는 이 화면이 그리지 않는다. 페이지가 이 화면 옆에 <SettingSheet>를 따로 그린다 (setting-sheet.tsx) —
 * SettingsScreenProps에 시트 값이 없어서다 (ui.ts 10절). 그래서 이름 줄 버튼은 「누르면 대화 상자가 뜬다」(aria-haspopup)만 알린다.
 *
 * 「처음 값으로」가 꺼졌을 때 disabled가 아니라 aria-disabled인 까닭: 키보드로 눌러서 처음 값이 되는 순간 버튼이 꺼지는데,
 * disabled로 바뀌면 그 버튼에 있던 포커스가 갈 곳을 잃는다 (시트의 − + 와 같은 까닭). 꺼진 버튼은 흐려지고 눌러도 아무 일도 없다.
 *
 * 누르는 곳: 이름 줄 47px, 단계 버튼은 보이는 42px에 위아래 1px씩 · 「처음 값으로」는 보이는 38px에 위아래 3px씩 넓혀 44px (::after).
 * 글자 자간: 이 화면의 버튼 글자는 본문 자간(−0.015em)을 그대로 따른다 (v32 CSS 3절 .screen[data-set] button).
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: 머리줄 h-14 px-4.5 pt-1 = 높이 56 · 좌우 18 · 위 4px, 내용 px-4.5 pt-1.5 pb-20 = 좌우 18 · 위 6 · 아래 80px
 * (아래 80px는 하단 캡슐이 떠 있을 자리), 카드 px-3.5 py-0.5 = 14 · 2px, 줄 pt-3.75 pb-3.5 = 15 · 14px,
 * 이름 줄 min-h-11.75 px-0.5 pt-3.75 pb-2.5 = 47 · 2 · 15 · 10px (-mt-3.75로 줄 위 여백까지 올라가 그만큼 누르는 곳이 넓다),
 * 단계 묶음 p-1 gap-1 = 4px, 단계 버튼 h-10.5 = 42px.
 */
export function SettingsScreen({ items, onSelectStep, onOpenSheet, canReset, onReset, bottomNav }: SettingsScreenProps) {
    return (
        <ScreenFrame tone="white" nameplate={null} bottomNav={bottomNav}>
            <header className="flex h-14 flex-none items-center justify-between px-4.5 pt-1">
                <h1 className="text-wordmark">설정</h1>
                <button
                    type="button"
                    aria-disabled={canReset ? undefined : true}
                    onClick={canReset ? onReset : undefined}
                    className="relative cursor-pointer px-0.5 py-2.5 text-13 font-bold text-ink after:absolute after:inset-x-0 after:-inset-y-0.75 aria-disabled:cursor-default aria-disabled:text-faint"
                >
                    처음 값으로
                </button>
            </header>

            {/* 화면이 낮아 카드가 다 안 들어가면 이 자리만 따로 스크롤된다. 카드가 캡슐 밑으로 지나가게 아래 여백을 스크롤되는 안쪽에 둔다 */}
            <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4.5 pt-1.5 pb-20 *:shrink-0 [&::-webkit-scrollbar]:hidden">
                <div className="rounded-[20px] border border-line bg-surface px-3.5 py-0.5">
                    {SETTING_KEYS.map((key) => {
                        const item = items[key];
                        const { label } = SETTING[key];
                        const names = stepNamesOf(key, item);
                        // 지금 값이 단계 가운데 하나면 그 번호, 단계에 없는 값이면 null
                        const pressedStep = item.position.kind === "step" ? item.position.step : null;

                        return (
                            <div key={key} className="border-line pt-3.75 pb-3.5 not-first:border-t">
                                <button
                                    type="button"
                                    aria-haspopup="dialog"
                                    onClick={() => onOpenSheet(key)}
                                    className="-mt-3.75 flex min-h-11.75 w-full cursor-pointer items-center justify-between gap-2.5 px-0.5 pt-3.75 pb-2.5 text-left"
                                >
                                    <b className="text-15 font-extrabold">{label}</b>
                                    <span className="ml-auto flex items-center gap-0.5">
                                        {pressedStep === null && (
                                            <span className="text-12.5 font-extrabold whitespace-nowrap text-ink">
                                                {`직접 · ${valueText(key, item.value)}`}
                                            </span>
                                        )}
                                        <span className="-mr-1.25 grid flex-none place-items-center text-faint">
                                            {rowChevron}
                                        </span>
                                    </span>
                                    <span className="sr-only">세부 설정</span>
                                </button>

                                <div role="group" aria-label={label} className="grid grid-cols-3 gap-1 rounded-[14px] bg-fill p-1">
                                    {STEPS.map((step) => (
                                        <button
                                            key={step}
                                            type="button"
                                            aria-pressed={pressedStep === step}
                                            onClick={() => onSelectStep(key, step)}
                                            className="relative h-10.5 cursor-pointer rounded-[10px] text-14 font-bold text-sub after:absolute after:inset-x-0 after:-inset-y-px aria-pressed:bg-surface aria-pressed:font-extrabold aria-pressed:text-ink aria-pressed:shadow-[0_1px_4px_rgb(0_0_0/0.08)]"
                                        >
                                            {names[step]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ScreenFrame>
    );
}
