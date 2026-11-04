import type { Metadata } from "next";
import { PublicHeritageHome } from "@/components/shared/public-heritage-home";

export const metadata: Metadata = {
  title: "Luo Heritage | Dholuo language and living culture",
  description: "Explore Dholuo words, Luo stories, songs, cultural artifacts and living knowledge. Learn, ask questions and share heritage with care.",
};

export default function HomePage() {
  return <PublicHeritageHome />;
}
