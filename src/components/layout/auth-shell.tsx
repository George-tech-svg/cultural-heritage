import { APP_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/shared/brand-mark";
import { InterfaceText } from "@/components/shared/interface-language";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="auth-page auth-compact min-h-dvh">
    <header className="auth-compact-header"><Link href="/" className="auth-brand"><BrandMark /><span>{APP_NAME}</span></Link><Link href="/" className="auth-home-link"><ArrowLeft size={18} aria-hidden="true" /><InterfaceText source="Back to Luo Heritage" /></Link></header>
    <main className="auth-compact-main"><div className="auth-form-surface w-full max-w-md"><div className="auth-form-content">{children}</div></div></main>
  </div>;
}
