import { BottomNavProps } from "@/types/ui";
import { LoadingScreen } from "@/ui/station/loading-screen"
const bottomNav: BottomNavProps = {
    active: "verdict",
    searchHref: "/",
    settingsHref: "/settings",
    verdictHref: null,
};
export default function Loading(){
    return <LoadingScreen nameplate={null} locationStep={null} bottomNav={bottomNav}/>
}
