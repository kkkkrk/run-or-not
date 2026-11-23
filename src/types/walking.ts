// src/types/walking.ts
export type LatLng = { lat: number; lng: number };
export type WalkingRequest = { stationId: string; from: LatLng };  // 브라우저 → /api/walking
export type WalkingResponse = { distanceM: number };               // 200
export type WalkingErrorBody = { error: string };                  // 400 · 404 · 502