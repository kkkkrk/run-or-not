import type { Metadata } from "next";
import { StationView } from "@/components/verdict/station-view"
import { getStation } from "@/lib/stations";
import { notFound } from "next/navigation";

export async function generateMetadata(
    props: PageProps<"/station/[id]">,
):Promise<Metadata> {
    const { id } = await props.params;
    const station = getStation(id);
    if(!station) return {};

    return {title: `${station.name} ${station.lineName}`};
}

export default async function StationPage({params}: PageProps<"/station/[id]">){
    const {id} = await params;
    const station = getStation(id);
    if(station === undefined) {
        throw new Error("test")
        // notFound();
    }
    return(
        <StationView station={station}/>
    )
}