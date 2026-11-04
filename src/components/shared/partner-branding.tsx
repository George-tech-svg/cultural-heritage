"use client";
import { InterfaceText } from "@/components/shared/interface-language";
import { useEffect, useState } from "react";
import type { FeatureRequest } from "./learning-hub";
import { MuseumTourSettings } from "./museum-tour-settings";

export function PartnerBranding({ request, variant = "compact" }: { request?: FeatureRequest; variant?: "compact" | "auth" | "footer" }) {
  const [data, setData] = useState<Record<string,string>>({});
  const [failed, setFailed] = useState<Record<string,boolean>>({});
  useEffect(() => {
    if (variant !== "footer") return;
    let active = true;
    const refresh = () => { const response = request ? request("/api/branding") : fetch("/api/branding").then(async result => { if (!result.ok) throw new Error(); return (await result.json()).data; }); void response.then(value => { if (active) setData(value); }).catch(() => {}); };
    refresh(); window.addEventListener("branding-updated",refresh);
    return () => { active = false; window.removeEventListener("branding-updated",refresh); };
  },[request,variant]);
  if (variant !== "footer") return null;
  const nrf = data.nrf_logo_url || "/partners/nrf-kenya.png";
  return <section className="heritage-partners" aria-label="Project partners"><h2><InterfaceText source="In partnership with" /></h2><div className="heritage-partner-list">
    <div>{data.jooust_logo_url && !failed[data.jooust_logo_url] && <img src={data.jooust_logo_url} alt="JOOUST" loading="lazy" onError={() => setFailed(current => ({...current,[data.jooust_logo_url]:true}))} />}<span>Jaramogi Oginga Odinga University of Science and Technology</span></div>
    <div>{!failed[nrf] && <img src={nrf} alt="National Research Fund Kenya" loading="lazy" onError={() => setFailed(current => ({...current,[nrf]:true}))} />}<span>National Research Fund (NRF), Kenya</span></div>
  </div></section>;
}

export function PartnerBrandingSettings({ request, transport = fetch }: { request: FeatureRequest; transport?: typeof fetch }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [colours, setColours] = useState<Record<string, string>>({});
  useEffect(() => { let active = true; void request("/api/branding").then(value => { if (active) setColours(value); }).catch(() => {}); return () => { active = false; }; }, [request]);
  return <><section className="space-y-4 rounded-xl border border-stone-300 bg-white p-4 text-stone-900"><h2 className="font-serif text-xl"><InterfaceText source="Institutional partners" /></h2><p className="text-sm"><InterfaceText source="Upload approved JOOUST and NRF partner logos. They appear in the partnership acknowledgement, never behind page content. Use a PNG, JPEG or WebP up to 2 MB." /></p><p className="text-sm text-stone-600"><InterfaceText source="Use the original institutional artwork so the partner logos stay clear on every screen." /></p>
    {["jooust", "nrf"].map(partner => <form key={partner} className="flex flex-wrap items-end gap-3 border-t py-3" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(""); try { const form = new FormData(event.currentTarget); const file = form.get("file"); if (file instanceof File && file.size) { form.set("partner", partner); const response = await transport("/api/super-admin/branding", { method: "POST", body: form }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Logo upload failed."); } await request("/api/super-admin/settings", { method: "PATCH", body: JSON.stringify({ [`${partner}_color`]: form.get("color") }) }); window.dispatchEvent(new Event("branding-updated")); setMessage("Partner branding saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save branding."); } finally { setBusy(false); } }}><label className="min-w-0 flex-1"><InterfaceText source={partner === "jooust" ? "JOOUST partner logo" : "NRF partner logo"} /><input type="file" name="file" accept="image/png,image/jpeg,image/webp" className="block w-full py-2 text-sm" /></label><label><InterfaceText source="Official colour" /><input type="color" name="color" key={colours[`${partner}_color`]} defaultValue={colours[`${partner}_color`] || "#6b4724"} className="block h-11 w-16" /></label><button disabled={busy} className="min-h-11 rounded-lg bg-amber-900 px-4 text-white disabled:opacity-50"><InterfaceText source="Save partner branding" /></button></form>)}
    {message && <p role="status">{message}</p>}
  </section><MuseumTourSettings request={request} /></>;
}
