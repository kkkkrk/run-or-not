import type { SettingItem, SettingKey, SettingSheetProps } from "@/types/ui";
import { durationParts, endsWithBatchim, formatSpeed } from "@/ui/shared/format";
import { minus, plus } from "@/ui/shared/icons";
import { SheetFrame, sheetStepButton, sheetValue } from "@/ui/shared/sheet-frame";
import { SETTING, stepNamesOf } from "./setting-items";

/**
 * 시트 맨 아래 한 줄 — 지금 값이 세 단계 가운데 어디쯤인지 (결정.md 1절 「칩을 두지 않고 … 한 줄로 쓴다」, v32 stepNote()).
 * 어디쯤인지(position)는 로직이 정해서 넘긴다. 여기서는 그것을 글자로 옮기기만 한다.
 *   단계와 같음        「보통」이에요 · 「빠르게」예요
 *   두 단계 사이       「보통」과 「빠르게」 사이 · 「느긋하게」와 「보통」 사이
 *   첫 단계보다 작음    「느긋하게」보다 더 느리게 · 「40초」보다 더 짧게
 *   끝 단계보다 큼      「빠르게」보다 더 빠르게 · 「1분 30초」보다 더 길게
 * 이에요 / 예요, 과 / 와는 앞 낱말이 받침으로 끝나는지에 따라 고른다
 */
function positionNote(key: SettingKey, item: SettingItem): string {
    const names = stepNamesOf(key, item);
    const quote = (name: string) => `「${name}」`;
    const { position } = item;

    switch (position.kind) {
        case "step": {
            const name = names[position.step];
            return `${quote(name)}${endsWithBatchim(name) ? "이에요" : "예요"}`;
        }
        case "between": {
            const lower = names[position.lower];
            const upper = names[position.lower + 1];
            return `${quote(lower)}${endsWithBatchim(lower) ? "과" : "와"} ${quote(upper)} 사이`;
        }
        case "below":
            return `${quote(names[0])}보다 더 ${SETTING[key].less}`;
        case "above":
            return `${quote(names[2])}보다 더 ${SETTING[key].more}`;
    }
}

/**
 * 설정 시트 — 항목 하나를 − + 로 세밀하게 맞추는 흰 시트 (결정.md 1절 「설정 화면」, v32 CSS 10절 .bsheet.set · .scrim, 스크립트 5절 open()).
 * 「승강장까지」 시트와 같은 모양이다(같은 시트 틀): 손잡이 · 제목과 설명 · 오른쪽 위 완료 → − 큰 숫자 + → 그 아래 비교 한 줄.
 * 칩은 없다. 평소 화면에서 뺀 설명은 제목 아래에 있다.
 *
 * - 큰 숫자: 속도는 「4.5 km/h」(소수 한 자리), 시간은 「1분 30초」. 받은 값을 그대로 쓴다 (10초 반올림 없음 — 설정 값은 − + 로만 움직인다).
 * - − + 한 번에 얼마나 움직이는지, 어디까지 갈 수 있는지는 로직이 정한다. 여기서는 누르면 알리고(onDecrease · onIncrease),
 *   더 못 가면 끈다(canDecrease · canIncrease).
 * - 값은 하나도 들고 있지 않다. 어느 항목인지(settingKey)와 그 값(item)을 받아 제목 · 설명 · 단위 · 단계 이름을 고른다.
 *
 * 놓이는 곳 — 「승강장까지」 시트와 다르다
 *   이 시트는 설정 화면(SettingsScreen)이 그리지 않고, 페이지가 화면 옆에 따로 그린다 (ui.ts에서 둘의 props가 따로다).
 *   그래서 화면 틀 안에 있지 않고, 스스로 화면 전체를 덮는 층을 깐다: position: fixed · 가운데 600px(layout.tsx의 가운데 칸과 같은 폭).
 *   페이지 어디에 두어도(화면 앞이든 뒤든) 같은 자리에 뜬다.
 *   ※ layout.tsx의 칸 폭(max-w-150)이 바뀌면 여기 max-w-150도 같이 바꿔야 한다.
 *   - 층은 닫혀 있는 동안 「누름 통과」다 (pointer-events-none) — 뒤의 설정 화면을 그대로 누를 수 있다. 열리면 시트 틀의 바깥 층이 누름을 막는다
 *   - 층은 넘치는 것을 자르고 스크롤되지 않는다 (overflow: clip) — 닫힌 시트가 층 바닥 아래에 내려가 있다. 화면 틀과 같은 까닭이다 (screen-frame.tsx)
 *   - 층에는 화면 틀이 주던 글자 기본값을 다시 준다 (15px · 줄 높이 1.4 · 자간 −0.015em · 낱말 단위 줄바꿈) — 틀 밖이라 물려받지 못한다
 *   - data-sheet="setting": 시트 틀이 이 표시를 보고 설정 시트의 값(아래 여백 28px · 제목 줄 위로 맞춤 …)을 고른다
 *
 * 뒤를 어둡게 덮는 막 (v32 .scrim): 짙은 남색 32%. 이 시트에만 있다 — 「승강장까지」 시트는 뒤의 판정 글자 · 캐릭터를 보여야 해서 막이 없다.
 * 열릴 때 0.2초 동안 진해지고(v32 fade-in 0.2s ease) 닫힐 때 같은 값으로 옅어진다. 처음부터 열린 채로 그려지면 움직이지 않는다.
 * 막은 그림일 뿐이고 누름은 시트 틀의 바깥 층이 받는다 (그래서 닫히는 동안에는 눌리지 않는다).
 *
 * 페이지가 지킬 것: 닫혀 있을 때도 늘 그려 둔다 (open만 바꾼다). 열 때만 그리면 올라오고 내려가는 움직임이 없다.
 * 닫힌 뒤에도 settingKey를 그대로 두면 내려가는 동안 같은 내용이 보인다.
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: mt-6.5 = 26px, mt-3 = 12px, max-w-150 = 600px. − + 칸은 52px, 가운데 숫자가 남은 폭을 쓴다.
 */
export function SettingSheet(props: SettingSheetProps) {
    const { open, onOpenChange, settingKey, item, canDecrease, canIncrease, onDecrease, onIncrease } = props;
    const { label, description, unit } = SETTING[settingKey];

    return (
        <div
            data-sheet="setting"
            className="pointer-events-none fixed inset-0 z-20 mx-auto max-w-150 overflow-hidden text-15 leading-body tracking-body break-keep antialiased supports-[overflow:clip]:overflow-clip"
        >
            <div
                aria-hidden="true"
                className={`absolute inset-0 bg-[rgb(15_23_42/0.32)] transition-opacity duration-200 ease-[ease] motion-reduce:transition-none ${
                    open ? "" : "opacity-0"
                }`}
            />

            <SheetFrame open={open} onOpenChange={onOpenChange} title={label} description={description}>
                <div className="mt-6.5 grid grid-cols-[52px_minmax(0,1fr)_52px] items-center">
                    {sheetStepButton(`${label} 줄이기`, minus, canDecrease, onDecrease)}
                    {sheetValue(
                        unit === "speed" ? [{ value: formatSpeed(item.value), unit: "km/h" }] : durationParts(item.value),
                    )}
                    {sheetStepButton(`${label} 늘리기`, plus, canIncrease, onIncrease)}
                </div>

                <p className="mt-3 text-center text-13 font-semibold text-sub">{positionNote(settingKey, item)}</p>
            </SheetFrame>
        </div>
    );
}
