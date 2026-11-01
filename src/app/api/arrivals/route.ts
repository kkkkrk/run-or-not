import { NextResponse } from "next/server";
import { fetchRealtimeArrivals } from "@/lib/api/seoul-subway"

export async function GET() {
    const data = await fetchRealtimeArrivals("동대입구");
    return NextResponse.json(data);  

}