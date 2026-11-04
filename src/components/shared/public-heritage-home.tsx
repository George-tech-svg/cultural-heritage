"use client";
import { HeritageHome } from "./heritage-home";
import { applicationScreenHref } from "@/lib/app-navigation";
import type { AppLink } from "./module-content-view";

const PublicLink: AppLink = ({ href, children, className }) => {
  const screen = applicationScreenHref(href);
  return <a href={href === "/welcome" ? "/" : screen ? `/application#${screen}` : href} className={className}>{children}</a>;
};
export function PublicHeritageHome() {
  return <HeritageHome Link={PublicLink} onSearch={query => { window.location.assign(`/application#/dashboard${query ? `?q=${encodeURIComponent(query)}` : ""}`); }} />;
}
