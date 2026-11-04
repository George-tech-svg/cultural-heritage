import type { Metadata } from "next";
import { PublicHeritageHome } from "@/components/shared/public-heritage-home";
import { auth } from "@/lib/auth";
import { loginDestination } from "@/lib/login-destination";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Luo Heritage | Dholuo language and living culture",
  description: "Explore Dholuo words, Luo stories, songs, cultural artifacts and living knowledge. Learn, ask questions and share heritage with care.",
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) redirect(loginDestination(session));
  return <PublicHeritageHome />;
}
