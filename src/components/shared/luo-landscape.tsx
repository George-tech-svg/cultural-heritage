import { useId } from "react";

/** An illustration, not an archival photograph or a documented cultural object. */
export function LuoLandscape({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return <svg className={className} viewBox="0 0 720 780" role="img" aria-label="An illustrated lakeshore with papyrus, a canoe and the setting sun">
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#d7e1d0" /><stop offset="1" stopColor="#f3d5a0" /></linearGradient>
      <linearGradient id={`${id}-water`} x2="0" y2="1"><stop stopColor="#44766e" /><stop offset="1" stopColor="#153f3c" /></linearGradient>
      <pattern id={`${id}-weave`} width="32" height="32" patternUnits="userSpaceOnUse"><path d="m0 16 16-16 16 16-16 16Z" fill="none" stroke="#e4c58b" strokeWidth=".7" opacity=".3" /></pattern>
    </defs>
    <rect width="720" height="780" rx="12" fill={`url(#${id}-sky)`} />
    <circle cx="496" cy="244" r="92" fill="#d6a955" />
    <circle cx="496" cy="244" r="116" fill="none" stroke="#f9e8c0" strokeWidth="1.5" />
    <path d="M0 369Q90 319 170 348T340 334T520 354T720 321V445H0Z" fill="#708f7b" />
    <path d="M0 394Q130 361 260 392T510 375T720 392V780H0Z" fill={`url(#${id}-water)`} />
    <g fill="none" stroke="#c4d4b8" opacity=".4" strokeLinecap="round"><path d="M338 434h201m-251 22h294m-193 22h112m-280 50h247m-186 27h321M165 604h239m-90 31h272m-385 35h303" /><path d="m90 277 13-7 13 7m27-29 11-6 11 6" stroke="#315c50" strokeWidth="2" /></g>
    <path d="M275 512q114 27 232-8-23 34-112 39-83 1-120-31" fill="#102f2d" />
    <path d="m366 462 18 51m49-56-13 60" stroke="#173c34" strokeWidth="5" strokeLinecap="round" />
    <circle cx="369" cy="453" r="9" fill="#173c34" /><circle cx="437" cy="448" r="9" fill="#173c34" />
    <path d="m372 470 22 14 31-6m14-12-18 16-35 3m-4-17-41 79" fill="none" stroke="#173c34" strokeWidth="6" strokeLinecap="round" />
    <path d="M0 666q91-60 200-9t224 72 296-37v88H0Z" fill="#193f35" />
    <g fill="none" stroke="#2c5642" strokeWidth="4"><path d="M80 756Q118 563 88 414m25 344q49-143 45-268M47 760Q46 621 20 540m590 212q-8-167 32-296m-5 304q26-147 66-209" /></g>
    <g fill="#2c5642"><path d="m88 414-48 43 48-20 45 19Zm70 76-46 31 45-9 39 18ZM20 540l-20 29 21-13 34 19Zm622-84-48 36 47-15 46 21Zm61 95-43 32 43-13 17 14Z" /></g>
    <rect x="16" y="16" width="688" height="748" rx="8" fill="none" stroke="#fff8e0" opacity=".4" />
    <path d="M0 750h720v30H0Z" fill={`url(#${id}-weave)`} />
  </svg>;
}
