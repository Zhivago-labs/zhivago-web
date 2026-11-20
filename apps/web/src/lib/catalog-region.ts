import type { Listing } from "@zhivago/shared";

export function catalogRegion(listing: Pick<Listing, "bairro" | "cidade" | "uf">) {
  const city = [listing.cidade?.trim(), listing.uf?.trim()].filter(Boolean).join(" - ");
  return [listing.bairro?.trim(), city].filter(Boolean).join(", ");
}
