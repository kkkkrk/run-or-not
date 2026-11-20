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
 * 놓이는 곳: 설정 화면(SettingsScreen)이 화면 틀 안의 맨 아래에 그린다 — 「승강장까지」 시트와 같은 자리다 (ui.ts SettingsScreenProps.sheet).
 * 틀의 바닥에 붙어서 카드 아래쪽과 하단 캡슐을 덮는다.
 *
 * 감싼 것(data-sheet="setting"): 시트 틀이 이 표시를 보고 설정 시트의 값(아래 여백 28px · 제목 줄 위로 맞춤 …)을 고른다.
 * 표시만 하는 요소라 상자를 만들지 않는다 (display: contents) — 안의 막과 시트는 화면 틀을 기준으로 자리를 잡는다.
 *
 * 뒤를 어둡게 덮는 막 (v32 .scrim): 화면 틀 전체 · 짙은 남색 32%. 이 시트에만 있다 — 「승강장까지」 시트는 뒤의 판정 글자 · 캐릭터를 보여야 해서 막이 없다.
 * 열릴 때 0.2초 동안 진해지고(v32 fade-in 0.2s ease) 닫힐 때 같은 값으로 옅어진다. 처음부터 열린 채로 그려지면 움직이지 않는다.
 * 막은 그림일 뿐이라 늘 「누름 통과」다 (pointer-events-none) — 닫혀 있을 때도 화면 위에 투명하게 남아 있어서, 이게 없으면 설정 화면이 안 눌린다.
 * 누름은 시트 틀의 바깥 층(열려 있을 때만 있다)이 받는다. z-15는 하단 캡슐(10)보다 위, 시트(20)보다 아래다.
 *
 * 닫혀 있을 때도 늘 그려져 있다 (open만 바뀐다). 닫힌 뒤에도 settingKey가 그대로면 내려가는 동안 같은 내용이 보인다.
 *
 * 크기 클래스의 숫자 × 4 = 시안의 px: mt-6.5 = 26px, mt-3 = 12px. − + 칸은 52px, 가운데 숫자가 남은 폭을 쓴다.
 */
export function SettingSheet(props: SettingSheetProps) {
    const { open, onOpenChange, settingKey, item, canDecrease, canIncrease, onDecrease, onIncrease } = props;
    const { label, description, unit } = SETTING[settingKey];

    return (
        <div data-sheet="setting" className="contents">
            <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 z-15 bg-[rgb(15_23_42/0.32)] transition-opacity duration-200 ease-[ease] motion-reduce:transition-none ${
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
