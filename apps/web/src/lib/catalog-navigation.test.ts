import assert from "node:assert/strict";
import test from "node:test";
import { catalogReturn, listingHref } from "./catalog-navigation";

test("the listing carries the search, sort, page and original card through navigation", () => {
  const from = "/imoveis?q=Tim%C3%B3teo&categoria=venda&precoMax=500000&ordem=price_asc&pagina=2#imovel-casa";
  const link = new URL(listingHref("casa", from), "https://example.test");
  assert.equal(catalogReturn(link.searchParams.get("retorno")), from);
  assert.equal(catalogReturn(undefined), "/imoveis");
  assert.equal(catalogReturn("//example.test/outside"), "/imoveis");
  assert.equal(catalogReturn("/empresa"), "/imoveis");
  assert.equal(catalogReturn("/imoveis?openChat=true#recente-123"), "/imoveis#recente-123");
});
