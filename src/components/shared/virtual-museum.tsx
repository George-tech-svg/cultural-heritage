"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Landmark, Search } from "lucide-react";
import { AppLibrarySchema, type AppLibrary } from "@/lib/app-contract";
import type { ContentItem } from "@/lib/app-content";
import { MuseumToursSchema, type MuseumTour } from "@/lib/museum-tours";
import { GridView, LibraryItemDialog, type AppLink } from "./module-content-view";
import { InterfaceText } from "./interface-language";
import type { FeatureRequest } from "./learning-hub";
import { PartnerBranding } from "./partner-branding";

export function VirtualMuseum({ request, languageCode, origin, Link }: { request: FeatureRequest; languageCode: string; origin: string; Link: AppLink }) {
  const [library, setLibrary] = useState<AppLibrary | null>(null);
  const [tours, setTours] = useState<MuseumTour[]>([]);
  const [tourError, setTourError] = useState("");
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [query, setQuery] = useState(""), [search, setSearch] = useState("");
  const [error, setError] = useState(""), [loading, setLoading] = useState(true), [moreBusy, setMoreBusy] = useState(false), [retry, setRetry] = useState(0);
  const generation = useRef(0), more = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController(), epoch = ++generation.current;
    more.current?.abort(); more.current = null;
    setLoading(true); setError(""); setTourError(""); setLibrary(null); setSelected(null); setMoreBusy(false);
    const params = new URLSearchParams({ language: languageCode, module: "artifacts", q: search });
    void request(`/api/v1/library?${params}`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted && epoch === generation.current) setLibrary(AppLibrarySchema.parse(value)); }).catch(() => { if (!controller.signal.aborted) setError("The artifact collection could not load. Please try again."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    void request("/api/v1/museum", { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setTours(MuseumToursSchema.parse(value.tours)); }).catch(() => { if (!controller.signal.aborted) setTourError("Live tour links could not load. Please try again."); });
    return () => { controller.abort(); more.current?.abort(); };
  }, [request, languageCode, search, retry]);
  async function loadMore() {
    if (!library?.continuation?.records || more.current) return;
    const controller = new AbortController(), epoch = generation.current; more.current = controller; setMoreBusy(true); setError("");
    try {
      const params = new URLSearchParams({ language: languageCode, module: "artifacts", q: search, records: library.continuation.records, dictionary: "end" });
      const next = AppLibrarySchema.parse(await request(`/api/v1/library?${params}`, { signal: controller.signal }));
      if (!controller.signal.aborted && epoch === generation.current) setLibrary(current => current && ({ ...next, items: [...current.items, ...next.items.filter(item => !current.items.some(old => old.id === item.id))] }));
    } catch { if (!controller.signal.aborted) setError("More artifacts could not load. Please try again."); }
    finally { if (more.current === controller) { more.current = null; setMoreBusy(false); } }
  }
  return <section className="virtual-museum">
    <header className="museum-hero"><Landmark size={28} aria-hidden="true" /><p className="heritage-eyebrow"><InterfaceText source="Objects. Memory. Living culture." /></p><h1><InterfaceText source="Luo virtual museum" /></h1><p><InterfaceText source="Explore Luo artifacts, discover their uses and stories, and turn available 3D models to see their details." /></p><div className="museum-hero-links"><a href="#museum-exhibits"><InterfaceText source="Explore the exhibits" /></a><Link href="/contribute/artifacts"><InterfaceText source="Contribute an artifact" /><ArrowUpRight size={16} aria-hidden="true" /></Link></div></header>
    <section className="museum-live-tours"><h2><InterfaceText source="Live virtual tours" /></h2>{tourError ? <div role="alert"><p><InterfaceText source={tourError} /></p><button onClick={() => setRetry(value => value + 1)}><InterfaceText source="Try again" /></button></div> : tours.length ? <div className="museum-tour-grid">{tours.map(tour => <a key={tour.url} href={tour.url} target="_blank" rel="noopener noreferrer"><Landmark size={24} aria-hidden="true" /><h3>{tour.title}</h3><p>{tour.description}</p><span><InterfaceText source="Open live tour" /><ArrowUpRight size={18} aria-hidden="true" /></span></a>)}</div> : <p><InterfaceText source="Live tour links will appear here when the museum team adds them. Explore the published collection below." /></p>}</section>
    <section id="museum-exhibits" className="museum-exhibits"><h2><InterfaceText source="Explore the exhibits" /></h2><form className="museum-search" role="search" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}><label><span className="sr-only"><InterfaceText source="Search museum artifacts" /></span><input type="search" maxLength={200} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search museum artifacts" /></label><button aria-label="Search museum artifacts"><Search size={20} aria-hidden="true" /></button></form>
      {loading && <p role="status"><InterfaceText source="Loading the collection" /></p>}{error && <div role="alert"><p><InterfaceText source={error} /></p><button onClick={() => library ? void loadMore() : setRetry(value => value + 1)}><InterfaceText source="Try again" /></button></div>}
      {library && <GridView items={library.items} mediaForCard={item => item.media} viewLanguageCode={languageCode} onOpen={setSelected} />}
      {!loading && library?.items.length === 0 && <p><InterfaceText source="No published artifacts match this search yet." /></p>}
      {library?.continuation?.records && <button disabled={moreBusy} onClick={() => void loadMore()} className="museum-more"><InterfaceText source={moreBusy ? "Loading..." : "Explore more artifacts"} /></button>}
    </section><PartnerBranding request={request} variant="footer" />
    {selected && <LibraryItemDialog item={selected} items={library?.items} onRelated={setSelected} languageCode={languageCode} viewLanguageCode={languageCode} downloadOrigin={origin} onClose={() => setSelected(null)} />}
  </section>;
}
