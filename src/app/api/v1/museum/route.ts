import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/settings";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";
import { publishedMuseumTours } from "@/lib/museum-tours";
export const OPTIONS = nativePreflight;
export async function GET(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({ success: true, data: { tours: publishedMuseumTours(settings.virtual_museum_tours) } }, { headers });
  } catch { return NextResponse.json({ success: false, error: "The museum tours could not load." }, { status: 503, headers }); }
}
