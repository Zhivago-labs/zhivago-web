import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  CalendarClock,
  CalendarRange,
  Car,
  Check,
  ExternalLink,
  Handshake,
  Hash,
  House,
  Landmark,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Receipt,
  Repeat,
  Ruler,
  ShieldCheck,
  ShowerHead,
  Sofa,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import type { Listing } from "@zhivago/shared";
import { getListing, getSimilarListings, formatPrice } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { BookingRequestForm } from "@/components/listing/BookingRequestForm";
import { MobileRentTrigger } from "@/components/listing/MobileRentTrigger";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingTabs, type ListingTab } from "@/components/listing/ListingTabs";
import { ListingAbout, ListingDifferentials } from "@/components/listing/ListingOverview";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { ListingReviews } from "@/components/listing/ListingReviews";
import { HouseRules } from "@/components/listing/HouseRules";
import { RecordRecentView } from "@/components/listing/RecordRecentView";
import { MapEmbed } from "@/components/listing/MapEmbed";
import styles from "./page.module.css";

type Params = { params: Promise<{ id: string }> };
type Row = { icon: typeof Building2; label: string; value: string };

const OPERATION_BADGE: Record<string, string> = {
  SALE: "À venda",
  MONTHLY_RENT: "Aluguel",
  DAILY_RENT: "Temporada",
};

const OPERATION_LABEL: Record<string, string> = {
  SALE: "Venda",
  MONTHLY_RENT: "Aluguel mensal",
  DAILY_RENT: "Temporada (diária)",
};

const CONDITIONS_TITLE: Record<string, string> = {
  SALE: "Condições da venda",
  MONTHLY_RENT: "Condições do aluguel",
  DAILY_RENT: "Condições da estadia",
};

const GUARANTEE_LABELS: Record<string, string> = {
  CAUCAO: "Caução",
  SEGURO_FIANCA: "Seguro-fiança",
  FIADOR: "Fiador",
};

const CANCELLATION_LABELS: Record<string, string> = {
  FLEXIBLE: "Flexível — reembolso total até 48h antes do check-in",
  MODERATE: "Moderada — reembolso total até 5 dias antes do check-in",
  STRICT: "Rigorosa — 50% de reembolso até 7 dias antes do check-in",
};

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function compact<T>(items: (T | false | null | undefined)[]): T[] {
  return items.filter((item): item is T => Boolean(item));
}

/** Condições comerciais — só o que existe de verdade no anúncio, por modalidade (seções 66/67). */
function conditionRows(listing: Listing): Row[] {
  if (listing.operationType === "SALE") {
    return compact<Row>([
      { icon: Tag, label: "Valor do imóvel", value: brl(listing.price) },
      listing.condoFee != null && { icon: Building2, label: "Condomínio", value: `${brl(listing.condoFee)}/mês` },
      listing.iptuAnnual != null && { icon: Receipt, label: "IPTU", value: `${brl(listing.iptuAnnual)}/ano` },
      listing.acceptsFinancing != null && {
        icon: Landmark,
        label: "Financiamento",
        value: listing.acceptsFinancing ? "Aceita" : "Não aceita",
      },
      listing.acceptsExchange != null && {
        icon: Repeat,
        label: "Permuta",
        value: listing.acceptsExchange ? "Estuda proposta" : "Não aceita",
      },
      listing.acceptsNegotiation && { icon: Handshake, label: "Negociação", value: "Aceita negociar pelo chat" },
    ]);
  }

  if (listing.operationType === "MONTHLY_RENT") {
    const guarantees = parseJsonArray(listing.guaranteeTypes);
    return compact<Row>([
      { icon: Tag, label: "Aluguel", value: `${brl(listing.price)}/mês` },
      listing.condoFee != null && { icon: Building2, label: "Condomínio", value: `${brl(listing.condoFee)}/mês` },
      listing.iptuMonthly != null && { icon: Receipt, label: "IPTU", value: `${brl(listing.iptuMonthly)}/mês` },
      !!listing.availableFrom && {
        icon: CalendarClock,
        label: "Disponível a partir de",
        value: new Date(listing.availableFrom).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
      },
      listing.minimumLeaseMonths != null && {
        icon: CalendarClock,
        label: "Prazo mínimo",
        value: plural(listing.minimumLeaseMonths, "mês", "meses"),
      },
      guarantees.length > 0 && {
        icon: Landmark,
        label: "Garantias",
        value: guarantees.map((g) => GUARANTEE_LABELS[g] ?? g).join(", "),
      },
      listing.allowPets != null && { icon: Sparkles, label: "Animais de estimação", value: listing.allowPets ? "Aceita" : "Não aceita" },
      listing.acceptsNegotiation && { icon: Handshake, label: "Negociação", value: "Aceita negociar pelo chat" },
    ]);
  }

  return compact<Row>([
    { icon: Tag, label: "Diária", value: brl(listing.price) },
    listing.cleaningFee != null && { icon: Sparkles, label: "Taxa de limpeza", value: brl(listing.cleaningFee) },
    listing.minimumNights != null && {
      icon: CalendarClock,
      label: "Estadia mínima",
      value: plural(listing.minimumNights, "noite", "noites"),
    },
    listing.customMaxGuests != null && {
      icon: Users,
      label: "Hóspedes",
      value: `Até ${listing.customMaxGuests}`,
    },
    !!listing.cancellationPolicy && {
      icon: CalendarRange,
      label: "Cancelamento",
      value: CANCELLATION_LABELS[listing.cancellationPolicy] ?? listing.cancellationPolicy,
    },
    listing.acceptsNegotiation && { icon: Handshake, label: "Negociação", value: "Aceita negociar pelo chat" },
  ]);
}

/** Destaques do imóvel — derivados só de campos reais do anúncio (seção 88: nada inventado). */
function highlights(listing: Listing): string[] {
  const area = listing.privateArea ?? listing.totalArea;
  return compact<string>([
    (listing.suites ?? 0) > 0 && plural(listing.suites!, "suíte", "suítes"),
    listing.parking > 0 && `Garagem para ${plural(listing.parking, "carro", "carros")}`,
    area != null && `${listing.privateArea != null ? "Área privativa" : "Área total"} de ${area} m²`,
    listing.operationType === "DAILY_RENT" &&
      listing.customMaxGuests != null &&
      `Acomoda até ${plural(listing.customMaxGuests, "hóspede", "hóspedes")}`,
    listing.isFurnished && "Mobiliado",
    listing.operationType === "MONTHLY_RENT" && listing.allowPets && "Aceita animais de estimação",
    listing.operationType === "SALE" && listing.acceptsFinancing && "Aceita financiamento",
    listing.operationType === "SALE" && listing.acceptsExchange && "Aceita permuta",
    listing.acceptsNegotiation && "Valor negociável pelo chat",
  ]);
}

/** Ficha técnica — os dados estruturais do anúncio, lado a lado. */
function factRows(listing: Listing): Row[] {
  return compact<Row>([
    { icon: House, label: "Tipo", value: listing.type === "apartamento" ? "Apartamento" : "Casa" },
    { icon: Tag, label: "Modalidade", value: OPERATION_LABEL[listing.operationType] ?? listing.operationType },
    { icon: BedDouble, label: "Quartos", value: String(listing.bedrooms) },
    listing.suites != null && { icon: ShowerHead, label: "Suítes", value: String(listing.suites) },
    { icon: Bath, label: "Banheiros", value: String(listing.bathrooms) },
    { icon: Car, label: "Vagas", value: String(listing.parking) },
    listing.privateArea != null && { icon: Ruler, label: "Área privativa", value: `${listing.privateArea} m²` },
    listing.totalArea != null && { icon: Ruler, label: "Área total", value: `${listing.totalArea} m²` },
    listing.isFurnished != null && { icon: Sofa, label: "Mobília", value: listing.isFurnished ? "Mobiliado" : "Sem mobília" },
    { icon: Hash, label: "Código do anúncio", value: listing.id.slice(0, 8).toUpperCase() },
  ]);
}

function addressLines(listing: Listing): [string, string | null] {
  const street = compact<string>([
    listing.logradouro && [listing.logradouro, listing.numero].filter(Boolean).join(", "),
    listing.complemento,
    listing.bairro,
  ]).join(" - ");
  const city = compact<string>([
    [listing.cidade, listing.uf].filter(Boolean).join(" - "),
    listing.cep,
  ]).join(", ");
  if (!street && !city) return [listing.location, null];
  return street ? [street, city || null] : [city, null];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Imóvel não encontrado" };

  const title = `${listing.name} — ${listing.location}`;
  const description = listing.description ?? `${formatPrice(listing)} em ${listing.location}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: listing.images[0] ? [{ url: listing.images[0].url }] : undefined,
    },
  };
}

function whatsAppLink(listing: Listing): string | null {
  if (!listing.owner?.phone) return null;
  const phone = listing.owner.phone.replace(/\D/g, "");
  const message = `Olá ${listing.owner.name}, tenho interesse no imóvel "${listing.name}"!`;
  return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
}

function memberSince(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function ListingPage({ params }: Params) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) notFound();

  // Calculado no backend (seção 94/95 da spec) — prioriza mesmo empreendimento, bairro, cidade e
  // faixa de preço, nunca sugere modalidade comercial incompatível.
  const similarListings = await getSimilarListings(listing.id);

  const whatsapp = whatsAppLink(listing);
  const user = await getSessionUser();
  const isOwner = user?.id === listing.owner?.id || (!!listing.agentId && user?.id === listing.agentId);

  // Imóvel de organização (B2B) não tem `owner` (fica null) — o "anunciante" público é a própria
  // organização, representada pelo corretor responsável (`agent`) como contato/link de perfil.
  const advertiser = listing.owner
    ? {
        name: listing.owner.accountType === "AGENCY" ? listing.owner.companyName || "Imobiliária" : listing.owner.name,
        avatar: listing.owner.accountType === "AGENCY" ? listing.owner.logoUrl ?? null : listing.owner.avatar,
        isAgency: listing.owner.accountType === "AGENCY",
        verified: listing.owner.verified ?? false,
        profileHref: `/imobiliaria/${listing.owner.id}`,
        since: memberSince(listing.owner.createdAt),
        activeListings: listing.owner._count?.listings ?? null,
        creci: listing.owner.creci ?? null,
      }
    : listing.organization && listing.agent
      ? {
          name: listing.organization.name,
          avatar: listing.organization.logo,
          isAgency: true,
          verified: listing.organization.verified,
          profileHref: `/imobiliaria/${listing.agent.id}`,
          since: memberSince(listing.organization.createdAt),
          activeListings: listing.organization._count?.listings ?? null,
          creci: null,
        }
      : null;

  const hasDiscount = Boolean(listing.originalPrice && Number(listing.originalPrice) > listing.price);
  const discountPercent = hasDiscount
    ? Math.round(((Number(listing.originalPrice) - listing.price) / Number(listing.originalPrice)) * 100)
    : 0;
  const priceSuffix =
    listing.operationType === "MONTHLY_RENT" ? "/mês" : listing.operationType === "DAILY_RENT" ? "/noite" : "";

  // Vendido/alugado: some das listas públicas, mas o link direto ainda abre com o selo.
  const closedLabel = listing.status === "SOLD" ? "Vendido" : listing.status === "RENTED" ? "Alugado" : null;
  const isDaily = listing.operationType === "DAILY_RENT";

  const place = listing.cidade ? [listing.cidade, listing.uf].filter(Boolean).join(", ") : listing.location;
  const area = listing.privateArea ?? listing.totalArea;
  const specs = compact<{ icon: typeof BedDouble; text: string }>([
    { icon: BedDouble, text: plural(listing.bedrooms, "quarto", "quartos") },
    (listing.suites ?? 0) > 0 && { icon: ShowerHead, text: plural(listing.suites!, "suíte", "suítes") },
    { icon: Bath, text: plural(listing.bathrooms, "banheiro", "banheiros") },
    area != null && { icon: House, text: `${area} m²` },
    listing.parking > 0 && { icon: Car, text: plural(listing.parking, "vaga", "vagas") },
  ]);

  const conditions = conditionRows(listing);
  const highlightItems = highlights(listing);
  const facts = factRows(listing);
  const features = parseJsonArray(listing.features);
  const hasDifferentials = parseJsonArray(listing.amenities).length > 0 || features.length > 0;
  const [addressLine, cityLine] = addressLines(listing);
  const mapQuery = encodeURIComponent([addressLine, cityLine].filter(Boolean).join(", "));
  const neighborhood = listing.neighborhood?.trim();
  const iptu = listing.operationType === "SALE" ? listing.iptuAnnual : listing.iptuMonthly;

  // CTA principal: diária reserva pelo formulário (que já abre o chat); venda e mensal abrem a conversa.
  const contactCta = !user ? (
    <Link href={`/login?next=/imovel/${id}`} className={styles.primaryButton}>
      {isDaily ? <CalendarRange size={18} /> : <MessageCircle size={18} />}
      {isDaily ? "Entrar para reservar" : "Entrar em contato"}
    </Link>
  ) : isOwner || user.role === "ADMIN" ? null : closedLabel ? (
    <span className={styles.disabledButton} title={`Este imóvel já foi ${closedLabel.toLowerCase()}`}>
      <MessageCircle size={18} />
      Imóvel {closedLabel.toLowerCase()}
    </span>
  ) : isDaily ? (
    listing.status === "APPROVED" && <BookingRequestForm listingId={listing.id} />
  ) : (
    <div className={styles.chatCta}>
      <StartChatButton listingId={listing.id} label="Entrar em contato" />
    </div>
  );

  // Contato direto na aba Anunciante: só conversa (a reserva da diária fica no card de preço).
  const advertiserContact = !user ? (
    <Link href={`/login?next=/imovel/${id}`} className={styles.primaryButton}>
      <MessageCircle size={18} />
      Entrar para conversar
    </Link>
  ) : isOwner || user.role === "ADMIN" || closedLabel ? null : (
    <div className={styles.chatCta}>
      <StartChatButton listingId={listing.id} label="Conversar com o anunciante" />
    </div>
  );

  const tabs = compact<ListingTab>([
    {
      id: "visao-geral",
      label: "Visão geral",
      content: (
        <div className={styles.overview}>
          <div className={styles.overviewMain}>
            <ListingAbout description={listing.description} />
            {highlightItems.length > 0 && (
              <div className={styles.highlights}>
                <h3 className={styles.boxTitle}>Destaques do imóvel</h3>
                <ul className={styles.highlightList}>
                  {highlightItems.map((item) => (
                    <li key={item}>
                      <Check size={15} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className={styles.overviewSide}>
            <div className={styles.box}>
              <h3 className={styles.boxTitle}>Ficha do imóvel</h3>
              <dl className={styles.facts}>
                {facts.map((row) => (
                  <div key={row.label} className={styles.fact}>
                    <dt><row.icon size={15} strokeWidth={1.7} aria-hidden="true" />{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      ),
    },
    hasDifferentials && {
      id: "diferenciais",
      label: "Diferenciais",
      content: <ListingDifferentials amenities={listing.amenities} features={features} />,
    },
    conditions.length > 0 && {
      id: "condicoes",
      label: CONDITIONS_TITLE[listing.operationType],
      content: (
        <div>
          <h3 className={styles.tabTitle}>{CONDITIONS_TITLE[listing.operationType]}</h3>
          <ul className={styles.conditionGrid}>
            {conditions.map((row) => (
              <li key={row.label} className={styles.condition}>
                <row.icon size={18} strokeWidth={1.6} aria-hidden="true" />
                <span>
                  <span className={styles.conditionLabel}>{row.label}</span>
                  <span className={styles.conditionValue}>{row.value}</span>
                </span>
              </li>
            ))}
          </ul>
          {isDaily && <p className={styles.tabNote}>Horários de entrada e saída, regras da casa e itens de segurança estão logo abaixo, em “Regras da casa”.</p>}
        </div>
      ),
    },
    {
      id: "localizacao",
      label: "Localização",
      content: (
        <div className={styles.locationTab}>
          <div className={styles.locationInfo}>
            <h3 className={styles.tabTitle}>Onde fica</h3>
            <p className={styles.address}>
              <MapPin size={16} aria-hidden="true" />
              <span>
                {addressLine}
                {cityLine && (
                  <>
                    <br />
                    {cityLine}
                  </>
                )}
              </span>
            </p>
            {neighborhood && (
              <div className={styles.neighborhood}>
                <h4>Sobre a região</h4>
                <p>{neighborhood}</p>
              </div>
            )}
            <div className={styles.mapActions}>
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer" className={styles.mapButton}>
                <ExternalLink size={15} aria-hidden="true" />
                Abrir no Google Maps
              </a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`} target="_blank" rel="noopener noreferrer" className={styles.mapButton}>
                <Navigation size={15} aria-hidden="true" />
                Como chegar
              </a>
            </div>
          </div>
          <MapEmbed
            title={`Mapa de ${listing.location}`}
            src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            className={styles.mapLarge}
          />
        </div>
      ),
    },
    advertiser && {
      id: "anunciante",
      label: "Anunciante",
      content: (
        <div className={styles.advertiserTab}>
          <div className={styles.advertiserHead}>
            {advertiser.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={advertiser.avatar} alt={advertiser.name} className={styles.avatarLarge} />
            ) : (
              <span className={styles.avatarLargeInitial}>{advertiser.name.charAt(0).toUpperCase()}</span>
            )}
            <div className={styles.advertiserInfo}>
              <span className={styles.advertiserTitle}>{advertiser.name}</span>
              <span className={styles.advertiserKind}>{advertiser.isAgency ? "Imobiliária" : "Anunciante particular"}</span>
              {advertiser.verified && (
                <span className={styles.verifiedPill}>
                  <ShieldCheck size={12} />
                  {advertiser.isAgency ? "Imobiliária verificada" : "Conta verificada"}
                </span>
              )}
            </div>
          </div>

          <dl className={styles.advertiserFacts}>
            {advertiser.since && (
              <div><dt>No Zhivago desde</dt><dd>{advertiser.since}</dd></div>
            )}
            {advertiser.activeListings != null && (
              <div><dt>Anúncios ativos</dt><dd>{advertiser.activeListings}</dd></div>
            )}
            {listing.organization && listing.agent && (
              <div><dt>Corretor responsável</dt><dd>{listing.agent.name}</dd></div>
            )}
            {advertiser.creci && (
              <div><dt>CRECI</dt><dd>{advertiser.creci}</dd></div>
            )}
          </dl>

          <div className={styles.advertiserActions}>
            {advertiserContact}
            <Link href={advertiser.profileHref} className={styles.secondaryButton}>
              {advertiser.isAgency ? "Ver perfil da imobiliária" : "Ver perfil do anunciante"}
              <ArrowRight size={16} />
            </Link>
          </div>

          {listing.owner?.phone && (
            <div className={styles.phoneList}>
              <a href={`tel:+55${listing.owner.phone.replace(/\D/g, "")}`} className={styles.phoneRow}>
                <Phone size={17} />
                <span>{listing.owner.phone}</span>
                <span className={styles.phoneAction}>Ligar</span>
              </a>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={styles.phoneRow}>
                  <MessageCircle size={17} />
                  <span>{listing.owner.phone}</span>
                  <span className={styles.phoneAction}>WhatsApp</span>
                </a>
              )}
            </div>
          )}

          <p className={styles.terms}>
            Ao entrar em contato, você concorda com os <Link href="/termos">Termos de Uso</Link> e a{" "}
            <Link href="/privacidade">Política de Privacidade</Link>.
          </p>
        </div>
      ),
    },
  ]);

  return (
    <main className={styles.main}>
      <RecordRecentView listingId={listing.id} />

      <div className={styles.layout}>
        <div className={styles.content}>
          <Link href="/imoveis" className={styles.backLink}>
            <ArrowLeft size={16} />
            Voltar para a busca
          </Link>

          <ListingGallery images={listing.images} alt={listing.name}>
            {closedLabel && <span className={styles.closedBadge}>{closedLabel.toUpperCase()}</span>}
          </ListingGallery>

          <header className={styles.header}>
            <p className={styles.place}>
              <MapPin size={17} />
              {place}
            </p>
            <h1 className={styles.title}>{listing.name}</h1>
          </header>

          <ul className={styles.specs}>
            {specs.map((spec) => (
              <li key={spec.text} className={styles.spec}>
                <spec.icon size={22} strokeWidth={1.5} />
                {spec.text}
              </li>
            ))}
          </ul>

          <section className={styles.panel}>
            <ListingTabs tabs={tabs} />
          </section>

          {/* Avaliações e regras da casa: conceitos de aluguel/hospedagem */}
          <ListingReviews listingId={id} category={listing.category} user={user} />
          {isDaily && <HouseRules listing={listing} />}
        </div>

        <aside className={styles.sidebar}>
          {/* ── Preço e contato ── */}
          <div className={styles.card}>
            <span className={`${styles.operationBadge} ${closedLabel ? styles.operationBadgeClosed : ""}`}>
              {closedLabel ?? OPERATION_BADGE[listing.operationType]}
            </span>

            {hasDiscount && <p className={styles.oldPrice}>{brl(Number(listing.originalPrice))}</p>}
            <p className={styles.price}>
              {brl(listing.price)}
              {priceSuffix && <span className={styles.priceSuffix}>{priceSuffix}</span>}
              {hasDiscount && <span className={styles.discountBadge}>{discountPercent}% de desconto</span>}
            </p>

            {(listing.condoFee != null || iptu != null) && (
              <ul className={styles.fees}>
                {listing.condoFee != null && (
                  <li>
                    <Building2 size={16} strokeWidth={1.6} />
                    Condomínio: {brl(listing.condoFee)}/mês
                  </li>
                )}
                {iptu != null && (
                  <li>
                    <Receipt size={16} strokeWidth={1.6} />
                    IPTU: {brl(iptu)}/{listing.operationType === "SALE" ? "ano" : "mês"}
                  </li>
                )}
              </ul>
            )}

            <div className={styles.cardActions}>
              {contactCta}
              <FavoriteButton listingId={listing.id} size={18} label="Favoritar" />
            </div>

            {advertiser && (
              <a href="#anunciante" className={styles.advertiserMini}>
                {advertiser.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={advertiser.avatar} alt="" className={styles.avatar} />
                ) : (
                  <span className={styles.avatarInitial} aria-hidden="true">{advertiser.name.charAt(0).toUpperCase()}</span>
                )}
                <span className={styles.advertiserMiniText}>
                  <span className={styles.advertiserMiniLabel}>Anunciado por</span>
                  <span className={styles.advertiserName}>{advertiser.name}</span>
                </span>
                {advertiser.verified && <ShieldCheck size={16} className={styles.advertiserMiniCheck} aria-label="Verificado" />}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>

          {/* ── Imóveis semelhantes ── */}
          {similarListings.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <h3 className={styles.cardTitle}>Imóveis semelhantes</h3>
                <Link href="/imoveis" className={styles.seeAll}>
                  Ver todos
                </Link>
              </div>
              <div className={styles.similarRow}>
                {similarListings.map((item) => {
                  const itemArea = item.privateArea ?? item.totalArea;
                  return (
                    <Link key={item.id} href={`/imovel/${item.id}`} className={styles.similarCard}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.images[0]?.url} alt={item.name} className={styles.similarImg} loading="lazy" />
                      <span className={styles.similarPrice}>{formatPrice(item)}</span>
                      <span className={styles.similarName}>{item.name}</span>
                      <span className={styles.similarSpecs}>
                        <span>
                          <BedDouble size={12} /> {item.bedrooms}
                        </span>
                        <span>
                          <Bath size={12} /> {item.bathrooms}
                        </span>
                        {itemArea != null && (
                          <span>
                            <House size={12} /> {itemArea} m²
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Barra fixa no celular: preço + ação principal */}
      <div className={styles.footer}>
        <div>
          <p className={styles.footerPrice}>
            {brl(listing.price)}
            {priceSuffix && <span className={styles.priceSuffix}>{priceSuffix}</span>}
          </p>
        </div>
        <div className={styles.footerActions}>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={styles.whatsappButton}>
              WhatsApp
            </a>
          )}
          {!user ? (
            <Link href={`/login?next=/imovel/${id}`} className={styles.footerButton}>
              {isDaily ? "Reservar" : "Contato"}
            </Link>
          ) : isOwner ? null : closedLabel ? (
            <span className={styles.disabledButton}>Imóvel {closedLabel.toLowerCase()}</span>
          ) : isDaily ? (
            listing.status === "APPROVED" && <MobileRentTrigger listingId={listing.id} />
          ) : (
            <StartChatButton listingId={listing.id} label="Contato" />
          )}
        </div>
      </div>
    </main>
  );
}
