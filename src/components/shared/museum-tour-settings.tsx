"use client";
import { useEffect, useState } from "react";
import { MuseumToursSchema, type MuseumTour } from "@/lib/museum-tours";
import type { FeatureRequest } from "./learning-hub";
import { InterfaceText } from "./interface-language";

export function MuseumTourSettings({ request }: { request: FeatureRequest }) {
  const [tours, setTours] = useState<MuseumTour[]>([]), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setLoaded(false); void request("/api/v1/museum").then(value => { if (active) { setTours(MuseumToursSchema.parse(value.tours)); setLoaded(true); setMessage(""); } }).catch(() => { if (active) setMessage("Museum links could not load. Please retry before editing."); }); return () => { active = false; }; }, [request, retry]);
  const edit = (index: number, field: keyof MuseumTour, value: string) => setTours(current => current.map((tour, row) => row === index ? { ...tour, [field]: value } : tour));
  return <section className="museum-tour-settings rounded-xl border border-stone-300 bg-white p-4 text-stone-900"><h2 className="font-serif text-xl"><InterfaceText source="Virtual museum tours" /></h2><p><InterfaceText source="Add approved HTTPS tour links. Saved tours appear in the public virtual museum." /></p>
    {!loaded && <button type="button" className="min-h-11 underline" onClick={() => setRetry(value => value + 1)}><InterfaceText source="Try again" /></button>}
    <form onSubmit={async event => { event.preventDefault(); if (!loaded || busy) return; const result = MuseumToursSchema.safeParse(tours); if (!result.success) { setMessage("Give each tour a title and a valid HTTPS link."); return; } setBusy(true); setMessage(""); try { await request("/api/super-admin/settings", { method: "PATCH", body: JSON.stringify({ virtual_museum_tours: JSON.stringify(result.data) }) }); setMessage("Museum tours saved."); } catch { setMessage("Museum tours could not be saved. Please try again."); } finally { setBusy(false); } }}>
      {tours.map((tour, index) => <fieldset key={index} disabled={!loaded || busy} className="my-3 grid gap-2 rounded-lg border p-3"><legend><InterfaceText source="Live virtual tour" /> {index + 1}</legend><label><InterfaceText source="Title" /><input required maxLength={120} value={tour.title} onChange={event => edit(index, "title", event.target.value)} /></label><label><InterfaceText source="Tour link" /><input required type="url" maxLength={2048} value={tour.url} onChange={event => edit(index, "url", event.target.value)} placeholder="https://" /></label><label><InterfaceText source="Description" /><textarea maxLength={500} value={tour.description} onChange={event => edit(index, "description", event.target.value)} /></label><button type="button" className="min-h-11 underline" onClick={() => setTours(current => current.filter((_, row) => row !== index))}><InterfaceText source="Remove tour" /></button></fieldset>)}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={!loaded || busy || tours.length >= 24} className="min-h-11 underline" onClick={() => setTours(current => [...current, { title: "", url: "", description: "" }])}><InterfaceText source="Add live tour" /></button><button disabled={!loaded || busy} className="min-h-11 rounded-lg bg-teal-900 px-4 text-white disabled:opacity-50"><InterfaceText source="Save museum tours" /></button></div>
    </form>{message && <p role="status"><InterfaceText source={message} /></p>}
  </section>;
}
