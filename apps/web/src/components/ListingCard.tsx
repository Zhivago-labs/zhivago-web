"use client";

import { useState } from "react";
import Link from "next/link";
import { BedDouble, Droplet, Car, Maximize2, BadgeCheck, ChevronLeft, ChevronRight, Images } from "@/components/icons";
import type { Listing } from "@zhivago/shared";
import { formatPrice } from "@/lib/api";
import { catalogRegion } from "@/lib/catalog-region";
import { listingHref, rememberCatalogCard } from "@/lib/catalog-navigation";
import { thumbnailImgProps, thumbnailUrl } from "@/lib/images";
import { useSmoothImage } from "@/lib/useSmoothImage";
import { ImageLoadingIndicator } from "@/components/listing/ImageLoadingIndicator";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { ModerateListingTrigger } from "@/components/admin/ModerateListingModal";
import { PropertyPhotoViewer } from "@/components/listing/PropertyPhotoViewer";
import styles from "./ListingCard.module.css";

const TYPE_LABELS: Record<Listing["type"], string> = {
  casa: "Casa",
  apartamento: "Apartamento",
};

// Rótulo pela operação real (operationType) — diária aparece como Temporada, não como Aluguel.
const OPERATION_LABELS: Record<Listing["operationType"], string> = {
  SALE: "Venda",
  MONTHLY_RENT: "Aluguel",
  DAILY_RENT: "Temporada",
};

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function ListingCard({
  listing,
  isAdmin = false,
  priority = false,
  explore = false,
  returnTo,
}: {
  listing: Listing;
  isAdmin?: boolean;
  // Primeiros cards da tela: foto baixa na hora, com prioridade, em vez de esperar o lazy loading.
  priority?: boolean;
  explore?: boolean;
  returnTo?: string;
}) {
  // Garantir fallback idêntico ao do mobile
  const bedrooms = listing.bedrooms || 0;
  const bathrooms = listing.bathrooms || 0;
  const parking = listing.parking || 0;

  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const [modalOpen, setModalOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const prevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handleOpenPhotos = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 0) {
      setModalOpen(true);
    }
  };

  const hasDiscount = Boolean(
    listing.originalPrice && Number(listing.originalPrice) > listing.price
  );
  const discountPercent = hasDiscount
    ? Math.round(((Number(listing.originalPrice) - listing.price) / Number(listing.originalPrice)) * 100)
    : 0;

  // Mesma regra da página de detalhes: só existe selo de verificação para imobiliária
  // (dono pessoa física verificado não é exibido como "verificado" — sem base para isso).
  const isVerified = Boolean(
    (listing.owner?.accountType === "AGENCY" && listing.owner?.verified) || listing.organization?.verified
  );

  const currentImage = images[activeImageIndex] ?? images[0];
  const hasMultiple = images.length > 1;

  // Só pré-carrega as vizinhas depois que o usuário mostra interesse no card (passou o mouse ou
  // já trocou de foto) — a exploração tem dezenas de cards e não vale baixar fotos de todos.
  const [warm, setWarm] = useState(false);
  const interested = warm || activeImageIndex !== 0;
  const neighborThumbs =
    hasMultiple && interested
      ? [
          thumbnailUrl(images[(activeImageIndex + 1) % images.length]?.url),
          thumbnailUrl(images[(activeImageIndex - 1 + images.length) % images.length]?.url),
        ]
      : [];
  // Mantém a miniatura anterior na tela até a próxima estar baixada.
  const { shownSrc, loading: photoLoading } = useSmoothImage(thumbnailUrl(currentImage?.url), neighborThumbs);
  const shownImage = images.find((img) => thumbnailUrl(img.url) === shownSrc) ?? currentImage;

  // ── Dados do card de exploração ──
  const operationLabel = OPERATION_LABELS[listing.operationType] ?? (listing.category === "venda" ? "Venda" : "Aluguel");
  const periodLabel = listing.operationType === "MONTHLY_RENT" ? "mês" : listing.operationType === "DAILY_RENT" ? "noite" : null;
  const area = listing.privateArea ?? listing.totalArea;
  const kicker = [TYPE_LABELS[listing.type], area ? `${area.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m²` : null]
    .filter(Boolean)
    .join(" · ");
  const features = [
    `${bedrooms} ${bedrooms === 1 ? "quarto" : "quartos"}`,
    `${bathrooms} ${bathrooms === 1 ? "banheiro" : "banheiros"}`,
    parking > 0 ? `${parking} ${parking === 1 ? "vaga" : "vagas"}` : null,
  ].filter((feature): feature is string => Boolean(feature));
  // Custo real além do preço anunciado — o que os portais mostram logo abaixo do valor.
  const iptuMonthly = listing.iptuMonthly ?? (listing.iptuAnnual ? listing.iptuAnnual / 12 : null);
  const costNote =
    listing.operationType === "MONTHLY_RENT" && (listing.condoFee || iptuMonthly)
      ? `Total ${brl(listing.price + (listing.condoFee ?? 0) + (iptuMonthly ?? 0))}/mês com ${[listing.condoFee && "condomínio", iptuMonthly && "IPTU"].filter(Boolean).join(" e ")}`
      : listing.operationType === "SALE" && (listing.condoFee || listing.iptuAnnual)
        ? [listing.condoFee && `Condomínio ${brl(listing.condoFee)}`, listing.iptuAnnual && `IPTU ${brl(listing.iptuAnnual)}/ano`].filter(Boolean).join(" · ")
        : listing.operationType === "DAILY_RENT" && listing.cleaningFee
          ? `+ ${brl(listing.cleaningFee)} de taxa de limpeza`
          : null;
  const advertiser =
    listing.organization?.name ??
    (listing.owner?.accountType === "AGENCY" ? listing.owner.companyName || listing.owner.name : "Direto com o proprietário");
  // Até 5 pontinhos, deslizando junto com a foto atual.
  const dotStart = Math.min(Math.max(0, activeImageIndex - 2), Math.max(0, images.length - 5));
  const dotWindow = Array.from({ length: Math.min(5, images.length) }, (_, i) => dotStart + i);

  if (explore) {
    return (
      <>
        <article className={styles.ex}>
          <div
            className={styles.exMedia}
            onClick={handleOpenPhotos}
            onMouseEnter={hasMultiple && !warm ? () => setWarm(true) : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {images.length > 0 ? <img
              {...thumbnailImgProps(shownImage?.url)}
              alt={listing.name}
              className={styles.exImage}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
            /> : <div className={styles.noPhoto}>Foto indisponível</div>}
            <ImageLoadingIndicator visible={photoLoading} size={28} />

            {isAdmin && (
              <ModerateListingTrigger listingId={listing.id} listingName={listing.name} status={listing.status} />
            )}

            <div className={styles.exBadges}>
              {listing.status === "SOLD" ? (
                <span className={`${styles.exBadge} ${styles.exBadgeDark}`}>Vendido</span>
              ) : (
                <span className={styles.exBadge}>{operationLabel}</span>
              )}
              {hasDiscount && listing.status !== "SOLD" && (
                <span className={`${styles.exBadge} ${styles.exBadgeDeal}`}>-{discountPercent}%</span>
              )}
            </div>

            <div className={styles.favoriteWrap} onClick={(e) => e.stopPropagation()}>
              <FavoriteButton listingId={listing.id} />
            </div>

            {hasMultiple && (
              <>
                <button type="button" className={`${styles.exArrow} ${styles.exArrowLeft}`} onClick={prevPhoto} aria-label="Foto anterior">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className={`${styles.exArrow} ${styles.exArrowRight}`} onClick={nextPhoto} aria-label="Próxima foto">
                  <ChevronRight size={18} />
                </button>
                <div className={styles.exDots} aria-hidden="true">
                  {dotWindow.map((i) => (
                    <span key={i} className={`${styles.exDot} ${i === activeImageIndex ? styles.exDotActive : ""}`} />
                  ))}
                </div>
              </>
            )}

            {images.length > 0 && (
              <button type="button" className={styles.exGallery} onClick={handleOpenPhotos}
                aria-label={`Ver ${images.length === 1 ? "a foto" : `as ${images.length} fotos`} de ${listing.name}`}>
                <Images size={14} aria-hidden="true" />
                <span>{images.length}</span>
              </button>
            )}
          </div>

          <Link id={returnTo ? "imovel-" + listing.id : undefined} href={listingHref(listing.id, returnTo)} prefetch={returnTo ? false : undefined}
            onNavigate={returnTo ? () => rememberCatalogCard("imovel-" + listing.id) : undefined} className={styles.exInfo}>
            <p className={styles.exKicker}>{kicker}</p>
            <h3 className={styles.exRegion}>{catalogRegion(listing) || "Região não informada"}</h3>
            <p className={styles.exName}>{listing.name}</p>
            <p className={styles.exFeatures}>
              {features.map((feature, i) => (
                <span key={feature}>{i > 0 && <span className={styles.exSep} aria-hidden="true">·</span>}{feature}</span>
              ))}
            </p>
            <div className={styles.exPriceRow}>
              {hasDiscount && <s className={styles.exOldPrice}>{brl(Number(listing.originalPrice))}</s>}
              <span className={styles.exPrice}>{brl(listing.price)}</span>
              {periodLabel && <span className={styles.exPeriod}>/{periodLabel}</span>}
            </div>
            {costNote && <p className={styles.exCost}>{costNote}</p>}
            <p className={styles.exAdvertiser}>
              {isVerified && <BadgeCheck size={14} className={styles.exVerified} aria-label="Anunciante verificado" />}
              <span>{advertiser}</span>
            </p>
          </Link>
        </article>

        <PropertyPhotoViewer
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          images={images}
          initialIndex={activeImageIndex}
          title={listing.name}
          location={listing.location}
          priceLabel={formatPrice(listing)}
          listingId={listing.id}
          returnTo={returnTo}
        />
      </>
    );
  }

  const priceContent = (
    <div className={styles.priceRow}>
            {hasDiscount && (
              <span className={styles.oldPrice}>
                {Number(listing.originalPrice).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })}
              </span>
            )}
            <span className={styles.price}>{formatPrice(listing)}</span>
            {hasDiscount && <span className={styles.discountTag}>{discountPercent}% OFF</span>}
          </div>
  );

  return (
    <>
      <div className={styles.card}>
        <div
          className={styles.imageWrap}
          onClick={handleOpenPhotos}
          onMouseEnter={hasMultiple && !warm ? () => setWarm(true) : undefined}
          title={images.length ? "Clique para abrir as fotos" : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {images.length > 0 ? <img
            {...thumbnailImgProps(shownImage?.url)}
            alt={listing.name}
            className={styles.image}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          /> : <div className={styles.noPhoto}>Foto indisponível</div>}
          <ImageLoadingIndicator visible={photoLoading} size={28} />

          {isAdmin && (
            <ModerateListingTrigger listingId={listing.id} listingName={listing.name} status={listing.status} />
          )}

          {listing.status === "SOLD" ? (
            <span className={styles.soldBadge}>VENDIDO</span>
          ) : hasDiscount ? (
            <span className={styles.discountBadge}>{discountPercent}% OFF</span>
          ) : null}

          {/* Setas de navegação inline no card (estilo clássico Airbnb) */}
          {hasMultiple && (
            <>
              <button
                type="button"
                className={`${styles.cardArrow} ${styles.cardArrowLeft}`}
                onClick={prevPhoto}
                aria-label="Foto anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className={`${styles.cardArrow} ${styles.cardArrowRight}`}
                onClick={nextPhoto}
                aria-label="Próxima foto"
              >
                <ChevronRight size={16} />
              </button>

              {/* Indicadores de pontinhos (dots pagination) */}
              <div className={styles.dotsPagination}>
                {images.slice(0, 5).map((_, i) => (
                  <span
                    key={i}
                    className={`${styles.dot} ${i === activeImageIndex % 5 ? styles.dotActive : ""}`}
                  />
                ))}
              </div>
            </>
          )}

          {images.length > 0 && <button
            type="button"
            className={styles.imageOverlayBadge}
            onClick={handleOpenPhotos}
            aria-label="Ver todas as fotos"
          >
            <Maximize2 size={12} />
            <span>{hasMultiple ? `${activeImageIndex + 1}/${images.length}` : "Ver foto"}</span>
          </button>}

          <div className={styles.favoriteWrap} onClick={(e) => e.stopPropagation()}>
            <FavoriteButton listingId={listing.id} />
          </div>
        </div>

        <Link id={returnTo ? "imovel-" + listing.id : undefined} href={listingHref(listing.id, returnTo)} prefetch={returnTo ? false : undefined}
          onNavigate={returnTo ? () => rememberCatalogCard("imovel-" + listing.id) : undefined} className={styles.info}>
          <div className={styles.tagRow}>
            <span className={styles.typeTag}>{TYPE_LABELS[listing.type]}</span>
            <span className={styles.categoryTag}>{operationLabel}</span>
            {isVerified && (
              <span className={styles.verifiedTag}>
                <BadgeCheck size={12} />
                Verificado
              </span>
            )}
          </div>
          <h3 className={styles.name}>{listing.name}</h3>
          <p className={styles.location}>{catalogRegion(listing) || "Região não informada"}</p>
          <div className={styles.amenities}>
            <span className={styles.amenityItem} title={`${bedrooms} quartos`}>
              <BedDouble size={15} />
              <span>{bedrooms}</span>
            </span>
            <span className={styles.amenityItem} title={`${bathrooms} banheiros`}>
              <Droplet size={15} />
              <span>{bathrooms}</span>
            </span>
            <span className={styles.amenityItem} title={`${parking} vagas`}>
              <Car size={15} />
              <span>{parking}</span>
            </span>
          </div>

          {priceContent}
        </Link>
      </div>

      {/* ── VISUALIZADOR CINEMATOGRÁFICO DE FOTOS EM TELA CHEIA ── */}
      <PropertyPhotoViewer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        images={images}
        initialIndex={activeImageIndex}
        title={listing.name}
        location={listing.location}
        priceLabel={formatPrice(listing)}
        listingId={listing.id}
        returnTo={returnTo}
      />
    </>
  );
}

