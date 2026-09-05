"use client";

import { useMemo, useState } from "react";
import { Search, Home, Building2, ArrowDown, ArrowUp, X, SlidersHorizontal, BedDouble, Bath, Car, Filter } from "lucide-react";
import type { Listing, ListingType } from "@zhivago/shared";
import { ListingCard } from "./ListingCard";
import styles from "./ListingsExplorer.module.css";

type Category = "todos" | "aluguel" | "venda";
type SortOption = "newest" | "price_asc" | "price_desc" | null;

function FilterChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${active ? styles.chipActive : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function ListingsExplorer({ listings, isAdmin = false }: { listings: Listing[]; isAdmin?: boolean }) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<ListingType | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("todos");
  const [minBedrooms, setMinBedrooms] = useState<number | null>(null);
  const [minBathrooms, setMinBathrooms] = useState<number | null>(null);
  const [minParking, setMinParking] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Contagem de filtros avançados ativos
  const activeAdvancedCount =
    (minBedrooms !== null ? 1 : 0) +
    (minBathrooms !== null ? 1 : 0) +
    (minParking !== null ? 1 : 0) +
    (minPrice !== "" || maxPrice !== "" ? 1 : 0);

  const hasActiveFilters =
    activeType !== null ||
    activeCategory !== "todos" ||
    activeAdvancedCount > 0 ||
    sortOption !== null;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const minP = minPrice ? Number(minPrice) : null;
    const maxP = maxPrice ? Number(maxPrice) : null;

    let data = listings.filter((item) => {
      const matchesType = !activeType || item.type === activeType;
      const matchesCategory = activeCategory === "todos" || item.category === activeCategory;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);

      const matchesBedrooms = minBedrooms === null || (item.bedrooms || 0) >= minBedrooms;
      const matchesBathrooms = minBathrooms === null || (item.bathrooms || 0) >= minBathrooms;
      const matchesParking = minParking === null || (item.parking || 0) >= minParking;

      const matchesMinPrice = minP === null || item.price >= minP;
      const matchesMaxPrice = maxP === null || item.price <= maxP;

      return (
        matchesType &&
        matchesCategory &&
        matchesQuery &&
        matchesBedrooms &&
        matchesBathrooms &&
        matchesParking &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });

    if (sortOption === "price_asc") {
      data = [...data].sort((a, b) => a.price - b.price);
    } else if (sortOption === "price_desc") {
      data = [...data].sort((a, b) => b.price - a.price);
    } else if (sortOption === "newest") {
      data = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return data;
  }, [listings, query, activeType, activeCategory, minBedrooms, minBathrooms, minParking, minPrice, maxPrice, sortOption]);

  const clearFilters = () => {
    setQuery("");
    setActiveType(null);
    setActiveCategory("todos");
    setMinBedrooms(null);
    setMinBathrooms(null);
    setMinParking(null);
    setMinPrice("");
    setMaxPrice("");
    setSortOption(null);
  };

  return (
    <div className={styles.explorerContainer}>
      {/* ── CARD HERO DE PESQUISA ESTILO AIRBNB ── */}
      <div className={styles.searchHeroCard}>
        <div className={styles.searchInputGroup}>
          <Search size={20} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Para onde vamos? Busque por cidade, bairro ou imóvel..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className={styles.clearQueryBtn} onClick={() => setQuery("")} aria-label="Limpar busca">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" className={styles.searchSubmitBtn}>
          <span>Buscar</span>
        </button>
      </div>

      {/* ── BARRA DE FILTROS & SELETORES ── */}
      <div className={styles.filtersRow}>
        <div className={styles.filtersBar}>
          {/* Tipo de Imóvel */}
          <div className={styles.filterGroup}>
            <FilterChip
              label="Casa"
              icon={<Home size={15} />}
              active={activeType === "casa"}
              onClick={() => setActiveType(activeType === "casa" ? null : "casa")}
            />
            <FilterChip
              label="Apartamento"
              icon={<Building2 size={15} />}
              active={activeType === "apartamento"}
              onClick={() => setActiveType(activeType === "apartamento" ? null : "apartamento")}
            />
          </div>

          <span className={styles.filterSeparator} />

          {/* Modalidade */}
          <div className={styles.filterGroup}>
            <FilterChip
              label="Alugar"
              active={activeCategory === "aluguel"}
              onClick={() => setActiveCategory(activeCategory === "aluguel" ? "todos" : "aluguel")}
            />
            <FilterChip
              label="Comprar"
              active={activeCategory === "venda"}
              onClick={() => setActiveCategory(activeCategory === "venda" ? "todos" : "venda")}
            />
          </div>

          <span className={styles.filterSeparator} />

          {/* Ordenação por Preço */}
          <div className={styles.filterGroup}>
            <FilterChip
              label="Menor Preço"
              icon={<ArrowDown size={15} />}
              active={sortOption === "price_asc"}
              onClick={() => setSortOption(sortOption === "price_asc" ? null : "price_asc")}
            />
            <FilterChip
              label="Maior Preço"
              icon={<ArrowUp size={15} />}
              active={sortOption === "price_desc"}
              onClick={() => setSortOption(sortOption === "price_desc" ? null : "price_desc")}
            />
          </div>

          {/* Botão Mais Filtros */}
          <button
            type="button"
            className={`${styles.advancedToggleBtn} ${showAdvanced ? styles.advancedToggleActive : ""}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SlidersHorizontal size={15} className={`${styles.toggleIcon} ${showAdvanced ? styles.toggleIconActive : ""}`} />
            <span>Mais Filtros</span>
            {activeAdvancedCount > 0 && <span className={styles.activeBadge}>{activeAdvancedCount}</span>}
          </button>

          <button
            type="button"
            className={`${styles.clearBtn} ${hasActiveFilters ? styles.clearBtnVisible : ""}`}
            onClick={clearFilters}
          >
            <X size={14} />
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* ── PAINEL DE FILTROS AVANÇADOS ── */}
      <div className={`${styles.advancedPanelWrapper} ${showAdvanced ? styles.advancedPanelOpen : ""}`}>
        <div className={styles.advancedPanel}>
          <div className={styles.advancedGrid}>
            <div className={styles.advancedGroup}>
              <label className={styles.advancedLabel}>Faixa de Preço (R$)</label>
              <div className={styles.priceRow}>
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className={styles.priceInput}
                />
                <span className={styles.priceDash}>até</span>
                <input
                  type="number"
                  placeholder="Máximo"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className={styles.priceInput}
                />
              </div>
            </div>

            <div className={styles.advancedGroup}>
              <label className={styles.advancedLabel}>
                <BedDouble size={14} /> Mínimo de Quartos
              </label>
              <div className={styles.numButtons}>
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`${styles.numBtn} ${minBedrooms === num ? styles.numBtnActive : ""}`}
                    onClick={() => setMinBedrooms(minBedrooms === num ? null : num)}
                  >
                    {num}+
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.advancedGroup}>
              <label className={styles.advancedLabel}>
                <Bath size={14} /> Mínimo de Banheiros
              </label>
              <div className={styles.numButtons}>
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`${styles.numBtn} ${minBathrooms === num ? styles.numBtnActive : ""}`}
                    onClick={() => setMinBathrooms(minBathrooms === num ? null : num)}
                  >
                    {num}+
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.advancedGroup}>
              <label className={styles.advancedLabel}>
                <Car size={14} /> Mínimo de Vagas
              </label>
              <div className={styles.numButtons}>
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`${styles.numBtn} ${minParking === num ? styles.numBtnActive : ""}`}
                    onClick={() => setMinParking(minParking === num ? null : num)}
                  >
                    {num}+
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CABEÇALHO DE RESULTADOS & GRID DE IMÓVEIS ── */}
      <div className={styles.resultsHeader}>
        <span className={styles.resultsCount}>
          {filtered.length} {filtered.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyStateContainer}>
          <Filter size={36} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nenhum imóvel encontrado</p>
          <p className={styles.emptySubtitle}>Tente ajustar seus termos de busca ou remover alguns filtros aplicados.</p>
          {hasActiveFilters && (
            <button type="button" className={styles.emptyResetBtn} onClick={clearFilters}>
              Limpar todos os filtros
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
