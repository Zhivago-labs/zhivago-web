import assert from "node:assert/strict";
import test from "node:test";
import { activeView, clearFiltersHref, columnsStorageKey, kanbanHref, listOnly, sanitizeColumns, switchTableHref, viewHref, viewsFor, withChanges } from "./contacts-state";

const q = (s: string) => new URLSearchParams(s);

test("mudar filtro volta à 1ª página e preserva o resto do recorte", () => {
  assert.equal(withChanges(q("view=opportunities&search=ana&page=3"), { status: "NEW" }), "?view=opportunities&search=ana&status=NEW");
  assert.equal(withChanges(q("search=ana&page=3"), { page: "4" }), "?search=ana&page=4");
  assert.equal(withChanges(q("search=ana"), { search: undefined }), "");
});

test("prévia não entra no caminho de volta nem no Kanban", () => {
  assert.equal(listOnly(q("search=ana&pessoa=u1&oportunidade=l1&secao=imoveis&page=2")), "?search=ana&page=2");
  const href = kanbanHref(q("view=opportunities&stage=ACTIVE&brokerId=m1&pessoa=u1&page=2"));
  const params = new URL(href, "http://x").searchParams;
  assert.equal(params.get("brokerId"), "m1");
  assert.equal(params.get("hideClosed"), "1");
  assert.equal(params.get("back"), "/empresa/contatos?view=opportunities&stage=ACTIVE&brokerId=m1&page=2");
});

test("abas predefinidas e links antigos", () => {
  assert.equal(activeView("people", q(""), false)?.key, "all");
  assert.equal(activeView("people", q("stage=ACTIVE"), false)?.key, "open");
  assert.equal(activeView("people", q("stage=CLOSED"), false)?.key, "closed");
  // Link antigo do Início: Oportunidades › Novas.
  assert.equal(activeView("opportunities", q("view=opportunities&stage=NEW&sort=waiting"), true)?.key, "new");
  assert.equal(activeView("opportunities", q("stage=ACTIVE&unassigned=true"), true)?.key, "unassigned");
  // Corretor não tem a aba "Sem responsável".
  assert.ok(!viewsFor("opportunities", false).some((v) => v.key === "unassigned"));
  assert.equal(activeView("people", q("stage=NEW"), false), null);
  assert.equal(viewHref(q("stage=ACTIVE&unassigned=true&search=ana&page=2"), viewsFor("opportunities", true)[0]!), "?search=ana");
});

test("alternar para Contatos descarta o que só existe em Oportunidades", () => {
  assert.equal(switchTableHref(q("view=opportunities&stage=ACTIVE&unassigned=true&sort=waiting&search=ana"), "people"), "?stage=ACTIVE&search=ana");
  assert.equal(switchTableHref(q("search=ana&pessoa=u1"), "opportunities"), "?search=ana&view=opportunities");
});

test("limpar busca e filtros mantém visão e aba", () => {
  assert.equal(clearFiltersHref(q("view=opportunities&stage=ACTIVE&search=ana&source=CHAT&from=2026-01-01&page=2")), "?view=opportunities&stage=ACTIVE");
});

test("preferência de colunas: Nome sempre visível, ids desconhecidos ignorados, chave por usuário e imobiliária", () => {
  assert.deepEqual(sanitizeColumns("people", ["email", "x", 3]), ["name", "email"]);
  assert.deepEqual(sanitizeColumns("people", "lixo"), ["name", "phone", "email", "listings", "open", "activity"]);
  assert.deepEqual(sanitizeColumns("opportunities", []), ["customer"]);
  assert.notEqual(columnsStorageKey("u1", "org", "people"), columnsStorageKey("u1", "org", "opportunities"));
  assert.notEqual(columnsStorageKey("u1", "org", "people"), columnsStorageKey("u2", "org", "people"));
});
