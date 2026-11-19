'use client'
import { useHydrated } from "@/hooks/use-hydrated"
import { useSettingsStore } from "@/stores/settings-store";
import { BottomNavProps, SettingKey, SettingsScreenProps } from "@/types/ui";
import { SettingsScreen } from "@/ui/settings/settings-screen";
import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { canResetSettings, SETTING_DEFS, canStepSetting, nextSetting, toItem } from "@/lib/settings";
import { useLastStationStore } from "@/stores/last-station-store";


export const SettingsClient = () => {
    const hydrated = useHydrated();
    const settings = useSettingsStore(
        useShallow((s)=>({
            walkSpeed: s.walkSpeed,
            runSpeed: s.runSpeed,
            stationOverheadSec: s.stationOverheadSec,
            marginSec: s.marginSec,
        })),
    );
    const reset = useSettingsStore((s) => s.reset);
    const update = useSettingsStore((s) => s.update);
    const [sheetKey, setSheetKey] = useState<SettingKey>("walk")
    const [sheetOpen, setSheetOpen] = useState(false);
    const lastHref = useLastStationStore((s)=> s.href);
    
    if(!hydrated) return null;

    const valueOf = (key: SettingKey) => settings[SETTING_DEFS[key].field];

    const setValue = (key: SettingKey, value: number) => update({[SETTING_DEFS[key].field]: value})
    const items: SettingsScreenProps["items"] = {
        walk: toItem("walk", settings.walkSpeed),
        run: toItem("run", settings.runSpeed),
        station: toItem("station", settings.stationOverheadSec),
        margin: toItem("margin", settings.marginSec),
    }
    const bottomNav: BottomNavProps = {
        active: "settings",
        searchHref: "/", 
        verdictHref: lastHref, //본 역이 없으면 꺼진 탭
        settingsHref: "/settings",
    }
    const sheet = {
        open : sheetOpen,
        onOpenChange:setSheetOpen,
        settingKey:sheetKey,
        item:items[sheetKey],
        canDecrease:canStepSetting(sheetKey, valueOf(sheetKey), -1),
        canIncrease:canStepSetting(sheetKey, valueOf(sheetKey), 1),
        onDecrease:() => setValue(sheetKey, nextSetting(sheetKey, valueOf(sheetKey), -1)),
        onIncrease:() => setValue(sheetKey, nextSetting(sheetKey, valueOf(sheetKey), + 1))
    }
    return(
        <>
            <SettingsScreen
                items = {items}
                onSelectStep={(key, step) => setValue(key, SETTING_DEFS[key].steps[step])}
                onOpenSheet={(key)=>{
                    setSheetKey(key);
                    setSheetOpen(true);
                }}
                canReset = {canResetSettings(settings)}
                onReset = {reset}
                sheet={sheet}
                bottomNav={bottomNav}
            />
        </>
    )
}