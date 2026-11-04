import { z } from "zod";

export const MuseumToursSchema = z.array(z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  url: z.string().trim().max(2048).url().refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Use a public HTTPS tour link."),
}).strict()).max(24);
export type MuseumTour = z.infer<typeof MuseumToursSchema>[number];
export function publishedMuseumTours(value = "") {
  try { const result = MuseumToursSchema.safeParse(JSON.parse(value)); return result.success ? result.data : []; }
  catch { return []; }
}
