type Paging = { take: number; skip?: number; cursor?: { id: string } };
export const ROTATION_CURSOR = /^v1-(\d{1,9})-(\d{1,9})-(\d{1,9})$/;

/** Walk a stable circular ordering once. A new visit changes its starting point;
 * continuation keeps that visit's order without dropping or repeating records. */
export async function readLibraryPage<T extends { id: string }>({ cursor, rotation, limit, count, read }: {
  cursor?: string; rotation?: number; limit: number; count: () => Promise<number>; read: (paging: Paging) => Promise<T[]>;
}) {
  if (cursor === "end") return { items: [] as T[], continuation: null };
  if (rotation === undefined) {
    const items = await read({ take: limit, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    return { items, continuation: items.length === limit ? items[items.length - 1].id : null };
  }
  const match = cursor?.match(ROTATION_CURSOR);
  if (cursor && !match) throw new Error("Invalid discovery continuation.");
  const total = match ? Number(match[3]) : await count();
  if (!total) return { items: [] as T[], continuation: null };
  const offset = match ? Number(match[1]) : rotation % total;
  const remaining = match ? Number(match[2]) : total;
  if (total > 999999999 || offset >= total || remaining > total || !remaining) throw new Error("Invalid discovery continuation.");
  const take = Math.min(limit, remaining);
  const first = Math.min(take, total - offset);
  const items = await read({ skip: offset, take: first });
  if (take > first) items.push(...await read({ skip: 0, take: take - first }));
  return { items, continuation: remaining > take && items.length === take ? `v1-${(offset + take) % total}-${remaining - take}-${total}` : null };
}

// Store a visit number, never an account/password or a personalised profile.
export function nextDiscoveryVisit(storage?: Pick<Storage, "getItem" | "setItem">) {
  const random = Math.floor(Math.random() * 100000000);
  try {
    const old = storage?.getItem("luo-discovery-visit");
    const value = old && /^\d{1,9}$/.test(old) ? (Number(old) + 1) % 100000000 : random;
    storage?.setItem("luo-discovery-visit", String(value));
    return value;
  } catch { return random; }
}
