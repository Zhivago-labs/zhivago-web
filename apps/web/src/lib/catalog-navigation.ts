import { safeRedirectTarget } from "./safe-redirect";

export const catalogFilters = ["q", "tipo", "categoria", "precoMin", "precoMax", "quartos", "banheiros", "vagas", "comodidades", "anunciante", "ordem", "pagina"] as const;

export function catalogReturn(value: unknown): string {
  const url = new URL(safeRedirectTarget(value, "/imoveis"), "https://zhivago.invalid");
  if (url.pathname !== "/imoveis") return "/imoveis";
  const filters = new URLSearchParams();
  for (const name of catalogFilters) {
    const term = url.searchParams.get(name);
    if (term) filters.set(name, term);
  }
  const anchor = /^#(?:imovel|recente)-[\w-]+$/.test(url.hash) ? url.hash : "";
  return "/imoveis" + (filters.size ? "?" + filters : "") + anchor;
}

export function listingHref(id: string, returnTo?: string) {
  const path = "/imovel/" + encodeURIComponent(id);
  return returnTo ? path + "?" + new URLSearchParams({ retorno: returnTo }) : path;
}

export function rememberCatalogCard(id: string) {
  if (window.location.pathname !== "/imoveis") return;
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.replaceState(window.history.state, "", url);
}
