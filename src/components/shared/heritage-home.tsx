"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Compass, HeartHandshake, Menu, Mic, Search, Sprout } from "lucide-react";
import { AppLibrarySchema } from "@/lib/app-contract";
import type { ContentItem } from "@/lib/app-content";
import { APP_NAME } from "@/lib/brand";
import type { AppLink } from "./module-content-view";
import type { FeatureRequest } from "./learning-hub";
import { InterfaceInput, InterfaceText } from "./interface-language";
import { BrandMark } from "./brand-mark";
import { LuoLandscape } from "./luo-landscape";
import { MediaImage } from "./media-preview";
import { NavigationIcon } from "./navigation-icon";
import { DismissiblePopover, PopoverClose } from "./dismissible-popover";
import { PartnerBranding } from "./partner-branding";
import { InstallAppButton } from "@/components/pwa/app-installation";

const ItemDetails = lazy(() => import("./module-content-view").then(module => ({ default: module.LibraryItemDialog })));
const pathways = [
  { title: "Words that connect us", description: "Discover Dholuo words, their meanings and the wisdom in everyday language.", href: "/dashboard?module=dictionary", label: "Explore the dictionary", number: "01" },
  { title: "Stories worth keeping", description: "Follow oral histories, folktales and songs across generations.", href: "/dashboard?module=oral_histories", label: "Discover our stories", number: "02" },
  { title: "Objects with a story", description: "Explore cultural artifacts and the knowledge held in their making and use.", href: "/dashboard?module=artifacts", label: "Browse cultural artifacts", number: "03" },
  { title: "Learn a little, every day", description: "Bring language into everyday life with lessons, games and guided practice.", href: "/learn", label: "Start learning", number: "04" },
];
const navigation = [["/explore", "Collections"], ["/dashboard?module=songs", "Stories & songs"], ["/learn", "Learn Dholuo"], ["/contribute", "Contribute"]];
async function publicRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error("The collection is temporarily unavailable.");
  return result.data;
}

export function HeritageHome({ Link, request = publicRequest, languageCode = "luo", languageName = "Dholuo", artwork, downloadOrigin, embedded = false, signedIn = false, onSignIn, onSearch }: {
  Link: AppLink; request?: FeatureRequest; languageCode?: string; languageName?: string; artwork?: string; downloadOrigin?: string; embedded?: boolean; signedIn?: boolean; onSignIn?: () => void; onSearch: (query: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading"); setItems([]); setSelected(null);
    void request(`/api/v1/library?${new URLSearchParams({ language: languageCode, module: "discover" })}`, { signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return;
      const result = AppLibrarySchema.safeParse(value);
      if (!result.success) throw new Error("The collection could not be read.");
      const visual = result.data.items.filter(item => item.media.some(media => media.type === "image"));
      setItems((visual.length ? visual : result.data.items).slice(0, 6)); setState("ready");
    }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [request, languageCode, retry]);
  const Main = embedded ? "div" : "main";
  const signIn = onSignIn ? <button type="button" className="heritage-button is-small" onClick={onSignIn}><InterfaceText source="Sign in" /></button> : <Link href={signedIn ? "/account" : "/login"} className="heritage-button is-small"><InterfaceText source={signedIn ? "My account" : "Sign in"} /></Link>;
  return <div className={`heritage-home ${embedded ? "is-embedded" : ""}`}>
    {!embedded && <>
      <a href="#heritage-main" className="heritage-skip"><InterfaceText source="Skip to content" /></a>
      <header className="heritage-public-header"><div className="heritage-container heritage-header-inner">
        <Link href="/welcome" className="heritage-wordmark"><BrandMark src={artwork} /><span><strong>{APP_NAME}</strong><small><InterfaceText source="Language · Culture · Living memory" /></small></span></Link>
        <nav className="heritage-desktop-nav" aria-label="Heritage navigation">{navigation.map(([href, label]) => <Link key={href} href={href}><InterfaceText source={label} /></Link>)}</nav>
        <div className="heritage-header-actions">{signIn}<DismissiblePopover open={menu} onClose={() => setMenu(false)}><button type="button" className="heritage-menu-toggle" aria-label="Open heritage navigation" aria-expanded={menu} onClick={() => setMenu(value => !value)}><Menu size={22} aria-hidden="true" /></button>{menu && <div className="heritage-mobile-nav" onClickCapture={event => { if ((event.target as HTMLElement).closest("a[href]")) setMenu(false); }}><PopoverClose label="Close heritage navigation" onClose={() => setMenu(false)} /><InstallAppButton /><nav aria-label="Mobile heritage navigation">{navigation.map(([href, label]) => <Link key={href} href={href}><InterfaceText source={label} /><ArrowUpRight size={16} aria-hidden="true" /></Link>)}<Link href="/chatbot"><InterfaceText source="CULTURAL HERITAGE" /></Link><Link href="/help"><InterfaceText source="Help & training" /></Link></nav></div>}</DismissiblePopover></div>
      </div></header>
    </>}
    <Main id="heritage-main">
      <section className="heritage-hero"><div className="heritage-container heritage-hero-grid">
        <div className="heritage-hero-copy"><p className="heritage-eyebrow"><span aria-hidden="true" />{languageName} <span aria-hidden="true">/</span> <InterfaceText source="Luo living heritage" /></p>
          <h1><InterfaceText source="Our words." /><br /><InterfaceText source="Our stories." /><br /><em><InterfaceText source="Our living heritage." /></em></h1>
          <p className="heritage-hero-description"><InterfaceText source="A home for Dholuo language and Luo cultural knowledge. Explore the words, stories, songs and traditions that connect generations." /></p>
          <form className="heritage-hero-search" role="search" onSubmit={event => { event.preventDefault(); onSearch(query.trim()); }}><label><span className="sr-only"><InterfaceText source="Search the heritage collection" /></span><Search size={19} aria-hidden="true" /><InterfaceInput type="search" value={query} maxLength={200} onChange={event => setQuery(event.target.value)} placeholder="Find a word, story or tradition" aria-label="Search the heritage collection" /></label><button type="submit"><InterfaceText source="Search" /><ArrowRight size={17} aria-hidden="true" /></button></form>
          <div className="heritage-hero-links"><Link href="/dashboard" className="heritage-button"><InterfaceText source="Discover the collection" /><ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/learn" className="heritage-text-link"><InterfaceText source="Learn Dholuo" /><ArrowRight size={17} aria-hidden="true" /></Link></div>
          <div className="heritage-principles"><span><BookOpen size={16} aria-hidden="true" /><InterfaceText source="Language & wisdom" /></span><span><Mic size={16} aria-hidden="true" /><InterfaceText source="Stories & memory" /></span><span><Sprout size={16} aria-hidden="true" /><InterfaceText source="Living traditions" /></span></div>
        </div>
        <figure className="heritage-hero-art"><LuoLandscape /><figcaption><span>01 — <InterfaceText source="Rooted in place" /></span><span><InterfaceText source="Inspired by the Lake Victoria landscape" /></span></figcaption></figure>
      </div></section>
      <section className="heritage-introduction heritage-container" aria-labelledby="heritage-introduction-title"><p className="heritage-eyebrow"><InterfaceText source="A connection worth keeping" /></p><div><h2 id="heritage-introduction-title"><InterfaceText source="Culture lives when we share it." /></h2><p><InterfaceText source="A familiar word. A story remembered. The meaning behind an everyday object. Explore Luo heritage at your own pace, and help carry living knowledge forward with care." /></p></div></section>
      <section className="heritage-section heritage-container" aria-labelledby="heritage-featured-title"><header className="heritage-section-heading"><div><p className="heritage-eyebrow"><InterfaceText source="From the collection" /></p><h2 id="heritage-featured-title"><InterfaceText source="Discover something worth keeping." /></h2></div><Link href="/explore" className="heritage-text-link"><InterfaceText source="Browse all collections" /><ArrowUpRight size={17} aria-hidden="true" /></Link></header>
        {state === "loading" ? <div className="heritage-featured-grid" role="status" aria-label="Loading published heritage"><span className="sr-only"><InterfaceText source="Loading the collection" /></span>{[0, 1, 2].map(index => <div key={index} className="heritage-card-placeholder" />)}</div> : state === "error" ? <div className="heritage-collection-notice" role="status"><BookOpen size={24} aria-hidden="true" /><p><InterfaceText source="The collection could not load. Please try again." /></p><button type="button" onClick={() => setRetry(value => value + 1)}><InterfaceText source="Try again" /></button><Link href="/dashboard"><InterfaceText source="Open the public library" /></Link></div> : !items.length ? <div className="heritage-collection-notice"><BookOpen size={24} aria-hidden="true" /><p><InterfaceText source="Explore the collections as published heritage is added." /></p><Link href="/explore"><InterfaceText source="Browse all collections" /></Link></div> : <div className="heritage-featured-grid">{items.map(item => {
          const image = item.media.find(media => media.type === "image");
          return <button type="button" className="heritage-featured-card" key={item.id} onClick={() => setSelected(item)}><div className="heritage-card-image">{image ? <MediaImage src={image.url} alt={item.title} loading="lazy" sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px" /> : <BookOpen size={56} aria-hidden="true" />}<span className="heritage-card-category">{item.moduleName || languageName}</span></div><div className="heritage-card-copy"><h3>{item.title}</h3>{item.englishTitle && item.englishTitle !== item.title && <p className="heritage-card-english" lang="en">{item.englishTitle}</p>}{item.summary && <p className="heritage-card-summary">{item.summary}</p>}<span className="heritage-card-action"><InterfaceText source="Explore this item" /><ArrowUpRight size={18} aria-hidden="true" /></span>{item.isProvisional && <span className="heritage-card-review"><InterfaceText source="Review in progress" /></span>}</div></button>;
        })}</div>}
      </section>
      <section className="heritage-pathways"><div className="heritage-container"><header className="heritage-section-heading"><div><p className="heritage-eyebrow"><InterfaceText source="Many ways to belong" /></p><h2><InterfaceText source="Follow your curiosity." /></h2></div><p><InterfaceText source="Start with a word, a story or something you have always wanted to know." /></p></header><div className="heritage-pathway-grid">{pathways.map(path => <Link key={path.href} href={path.href} className="heritage-pathway-card"><span className="heritage-pathway-number">{path.number}</span><NavigationIcon href={path.href} size={27} /><h3><InterfaceText source={path.title} /></h3><p><InterfaceText source={path.description} /></p><span className="heritage-card-action"><InterfaceText source={path.label} /><ArrowUpRight size={17} aria-hidden="true" /></span></Link>)}</div></div></section>
      <section className="heritage-assistant heritage-container"><div className="heritage-assistant-mark" aria-hidden="true"><Compass size={36} /></div><div><p className="heritage-eyebrow">CULTURAL HERITAGE</p><h2><InterfaceText source="Let a question lead the way." /></h2><p><InterfaceText source="Ask about Luo culture, history, songs or Dholuo. Explore an answer in English or Dholuo, and check its sources when available." /></p></div><Link href="/chatbot" className="heritage-button"><InterfaceText source="Ask the cultural assistant" /><ArrowUpRight size={17} aria-hidden="true" /></Link></section>
      <section className="heritage-contribution"><div className="heritage-container"><HeartHandshake size={32} aria-hidden="true" /><p className="heritage-eyebrow"><InterfaceText source="Knowledge belongs with its community" /></p><h2><InterfaceText source="Help the next generation stay connected." /></h2><p><InterfaceText source="Have a story, a word or cultural knowledge to share? Contribute its source and permission details, then follow it through review." /></p><Link href="/contribute" className="heritage-button is-gold"><InterfaceText source="Share your heritage" /><ArrowUpRight size={18} aria-hidden="true" /></Link></div></section>
    </Main>
    <footer className="heritage-public-footer"><div className="heritage-container"><div className="heritage-footer-top"><div><Link href="/welcome" className="heritage-wordmark"><BrandMark src={artwork} /><span><strong>{APP_NAME}</strong><small><InterfaceText source="Language · Culture · Living memory" /></small></span></Link><p><InterfaceText source="Keeping Dholuo and Luo cultural knowledge close, wherever life takes you." /></p></div><nav aria-label="Heritage footer"><Link href="/explore"><InterfaceText source="Collections" /></Link><Link href="/learn"><InterfaceText source="Learn Dholuo" /></Link><Link href="/contribute"><InterfaceText source="Contribute" /></Link><Link href="/help"><InterfaceText source="Help & training" /></Link></nav><PartnerBranding variant="footer" request={request} /></div><div className="heritage-footer-bottom"><span><InterfaceText source="Community knowledge. Shared with care." /></span><nav aria-label="Legal information"><Link href="/privacy"><InterfaceText source="Privacy Policy" /></Link><Link href="/terms"><InterfaceText source="Terms and Conditions" /></Link></nav></div></div></footer>
    {selected && <Suspense fallback={<p role="status" className="heritage-details-loading"><InterfaceText source="Opening item details" /></p>}><ItemDetails downloadOrigin={downloadOrigin} item={selected} items={items} onRelated={setSelected} languageCode={languageCode} viewLanguageCode={languageCode} onClose={() => setSelected(null)} /></Suspense>}
  </div>;
}
