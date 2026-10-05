import { NextResponse } from "next/server";
import { fetchRealtimeArrival } from "@/lib/api/seoul-subway"

export async function GET() {
    const data = await fetchRealtimeArrival();
    return NextResponse.json(data);
    
}