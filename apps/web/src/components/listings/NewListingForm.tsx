"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import {
  Home,
  Building2,
  Calendar,
  CalendarDays,
  KeyRound,
  FileText,
  Tag,
  Sparkles,
  MapPin,
  Camera,
  BedDouble,
  Bath,
  Car,
  DoorClosed,
  Ruler,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  Check,
  ShieldCheck,
  Users,
  ArrowLeft,
  ArrowRight,
  Eye,
  CircleAlert,
  TriangleAlert,
  MessageCircle,
  Lightbulb,
  LoaderCircle,
  Wallet,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
  RotateCcw,
  Search,
} from "lucide-react";
import { useChatSocket } from "@/components/chat/ChatSocketProvider";
import { listingDraft } from "@/lib/listing-draft";
import type { MyOrganization } from "@/lib/organizations-api";
import { createOrganizationBuildingAction, type CreateBuildingState } from "@/lib/actions/organizations";
import { createListingAction, updateListingAction } from "@/lib/actions/listings";
import type { Listing } from "@zhivago/shared";
import { MultiImageInput, photoOrderTokens, type PhotoItem } from "./MultiImageInput";
import { AmenitiesSelector, AVAILABLE_AMENITIES } from "./AmenitiesSelector";
import styles from "./NewListingForm.module.css";

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

type Modality = "diaria" | "mensal" | "venda";
export type BuildingOption = { id: string; name: string; address: string | null };
type Icon = ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" }>;
type Issue = { field: string; message: string };
type CepStatus = "idle" | "loading" | "found" | "notfound" | "error";

const GUARANTEE_OPTIONS = [
  { value: "CAUCAO", label: "Caução" },
  { value: "SEGURO_FIANCA", label: "Seguro-fiança" },
  { value: "FIADOR", label: "Fiador" },
] as const;

const CANCELLATION_LABELS = { FLEXIBLE: "Flexível", MODERATE: "Moderada", STRICT: "Rigorosa" } as const;

const ALL_STEPS: { id: number; title: string; subtitle: string; lead: string; tip: string; icon: Icon; orgOnly?: boolean }[] = [
  {
    id: 1, title: "Tipo e objetivo", subtitle: "Modalidade, tipo e título", icon: Tag,
    lead: "Conte o que você quer fazer com o imóvel e dê um título a ele.",
    tip: "Um bom título cita o tipo, o principal diferencial e o bairro. Ex.: “Apartamento com varanda gourmet no Gonzaga”.",
  },
  {
    id: 2, title: "Sobre o imóvel", subtitle: "Cômodos, área e comodidades", icon: Sparkles,
    lead: "Informe a estrutura do imóvel e o que ele oferece.",
    tip: "Marque só as comodidades que você confirmou. Informações exatas evitam frustração e contatos perdidos.",
  },
  {
    id: 3, title: "Localização", subtitle: "Endereço do imóvel", icon: MapPin,
    lead: "Digite o CEP e completamos o endereço para você.",
    tip: "Na busca aparecem apenas bairro e cidade. Rua e número ficam visíveis só na página do anúncio.",
  },
  {
    id: 4, title: "Preço e condições", subtitle: "Valores e regras", icon: Wallet,
    lead: "Defina o valor e as condições da modalidade escolhida.",
    tip: "Compare com imóveis parecidos na região. Um preço coerente com o mercado acelera os contatos.",
  },
  // Só existe pra conta de organização (imobiliária) — seção 72 da spec.
  {
    id: 5, title: "Atendimento", subtitle: "Quem recebe os leads", icon: Users, orgOnly: true,
    lead: "Escolha quem atende os interessados neste imóvel.",
    tip: "Sem um responsável específico, os leads seguem as regras de distribuição da imobiliária.",
  },
  {
    id: 6, title: "Fotos", subtitle: "Imagens e capa", icon: Camera,
    lead: "Adicione as fotos do imóvel e escolha a capa.",
    tip: "Prefira fotos horizontais, claras e bem iluminadas. Comece pela fachada ou pelo ambiente mais bonito.",
  },
  {
    id: 7, title: "Revisão", subtitle: "Prévia e publicação", icon: Eye,
    lead: "Revise antes de publicar: é assim que os interessados verão o seu anúncio.",
    tip: "Toque em “Editar” em qualquer bloco para corrigir algo sem perder o que já foi preenchido.",
  },
];

const MODALITY_BADGE: Record<Modality, string> = { diaria: "Temporada", mensal: "Aluguel", venda: "Venda" };
const PERIOD: Record<Modality, string> = { diaria: "/noite", mensal: "/mês", venda: "" };
const AMENITY_LABELS = new Map(AVAILABLE_AMENITIES.map((a) => [a.id, a.label]));

const formatBRL = (value: string | number, fraction = 2) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: fraction });
const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ───────────────────────── Leitura de um anúncio salvo (modo edição) ───────────────────────── */

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return (JSON.parse(value) as T) ?? fallback; } catch { return fallback; }
}
/** Item de segurança só vale se foi respondido; ausente continua "não informado" (nada é inventado). */
const answered = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);
const numText = (value: number | null | undefined) => (value != null ? String(value) : "");

/* ───────────────────────── Peças de interface ───────────────────────── */

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.fieldError}>
      <CircleAlert size={14} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

function Field({ id, label, required, optional, hint, error, aside, children }: {
  id: string; label: string; required?: boolean; optional?: boolean; hint?: ReactNode; error?: string; aside?: ReactNode; children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
          {optional && <span className={styles.optional}> (opcional)</span>}
        </label>
        {aside}
      </div>
      {children}
      {hint && !error && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Atributos de acessibilidade de um campo conforme o erro atual. */
const describe = (id: string, error?: string, hasHint = false) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
});

function Card({ icon: CardIcon, title, subtitle, children }: { icon: Icon; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardIcon}><CardIcon size={20} aria-hidden="true" /></span>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle && <p className={styles.cardSub}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function ChoiceCard({ active, onClick, icon: ChoiceIcon, title, subtitle, row, disabled }: {
  active: boolean; onClick: () => void; icon?: Icon; title: string; subtitle?: string; row?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`${styles.choice} ${row ? styles.choiceRow : ""} ${active ? styles.choiceActive : ""}`}
    >
      {ChoiceIcon && <span className={styles.choiceIcon}><ChoiceIcon size={20} aria-hidden="true" /></span>}
      <span className={styles.choiceText}>
        <span className={styles.choiceTitle} data-choice-title="">{title}</span>
        {subtitle && <span className={styles.choiceSubtitle}>{subtitle}</span>}
      </span>
      <span className={styles.choiceCheck} aria-hidden="true">{active && <Check size={12} strokeWidth={3} />}</span>
    </button>
  );
}

function CounterRow({ icon: RowIcon, title, subtitle, value, onChange }: {
  icon: Icon; title: string; subtitle: string; value: number; onChange: (next: number) => void;
}) {
  const noun = title.toLowerCase();
  return (
    <div className={styles.counterRow}>
      <div className={styles.counterInfo}>
        <RowIcon size={20} aria-hidden="true" />
        <div>
          <p className={styles.counterTitle}>{title}</p>
          <p className={styles.counterSub}>{subtitle}</p>
        </div>
      </div>
      <div className={styles.counter}>
        <button type="button" className={styles.counterBtn} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`Diminuir ${noun}`}>
          <Minus size={16} />
        </button>
        <output className={styles.counterValue} aria-live="polite" aria-label={`${value} ${noun}`}>{value}</output>
        <button type="button" className={styles.counterBtn} onClick={() => onChange(value + 1)} aria-label={`Aumentar ${noun}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (next: boolean) => void; label: string; description?: string }) {
  return (
    <label className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}>
      <input type="checkbox" className={styles.toggleInput} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.switch} aria-hidden="true" />
      <span className={styles.toggleText}>
        <span className={styles.toggleLabel}>{label}</span>
        {description && <span className={styles.toggleDesc}>{description}</span>}
      </span>
    </label>
  );
}

function YesNo({ id, label, value, onChange, invalid }: { id: string; label: string; value: boolean | null; onChange: (next: boolean) => void; invalid: boolean }) {
  return (
    <div className={`${styles.yesNo} ${invalid ? styles.yesNoInvalid : ""}`} role="radiogroup" aria-labelledby={`${id}-label`} aria-invalid={invalid || undefined}>
      <span id={`${id}-label`} className={styles.yesNoLabel}>{label}</span>
      <span className={styles.segmented}>
        {([true, false] as const).map((option) => (
          <label key={String(option)} className={value === option ? styles.segOn : ""}>
            <input type="radio" name={`ui-${id}`} checked={value === option} onChange={() => onChange(option)} />
            {option ? "Possui" : "Não possui"}
          </label>
        ))}
      </span>
    </div>
  );
}

/** Mini-formulário "+ Novo empreendimento" (seção 63 da spec) — cria sem sair do wizard. */
function NewBuildingInlineForm({ onCreated, onCancel }: { onCreated: (b: BuildingOption) => void; onCancel: () => void }) {
  const [state, setState] = useState<CreateBuildingState>();
  const [pending, startTransition] = useTransition();
  const inlineRef = useRef<HTMLDivElement>(null);
  const createBuilding = () => {
    const inputs = inlineRef.current?.querySelectorAll<HTMLInputElement>("input");
    if (!inputs) return;
    const data = new FormData();
    inputs.forEach(input => data.set(input.name, input.value));
    startTransition(async () => {
      const result = await createOrganizationBuildingAction(undefined, data);
      if (result && "building" in result) onCreated(result.building);
      else setState(result);
    });
  };
  const error = state && "error" in state ? state.error : undefined;

  return (
    <div ref={inlineRef} className={styles.fields} style={{ marginTop: 16 }}>
      <div className={styles.grid2}>
        <Field id="newBuildingName" label="Nome do empreendimento" required error={error}>
          <input id="newBuildingName" name="name" type="text" placeholder="Ex.: Unique Tower" className={styles.input} {...describe("newBuildingName", error)} />
        </Field>
        <Field id="newBuildingAddress" label="Endereço" optional>
          <input id="newBuildingAddress" name="address" type="text" className={styles.input} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={createBuilding} className={`${styles.btnPrimary} ${styles.btnSmall}`} disabled={pending}>
          {pending ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {pending ? "Criando…" : "Criar empreendimento"}
        </button>
        <button type="button" className={`${styles.btnSecondary} ${styles.btnSmall}`} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

/* ───────────────────────── Formulário ───────────────────────── */

export function NewListingForm({ myOrg, buildings, userId, listing, returnTo }: {
  myOrg: MyOrganization | null;
  buildings: BuildingOption[];
  userId: string;
  /** Quando informado, o assistente edita este anúncio em vez de criar um novo. */
  listing?: Listing;
  /** Para onde voltar depois de salvar a edição. */
  returnTo?: string;
}) {
  const isEdit = !!listing;
  const [state, formAction, pending] = useActionState(isEdit ? updateListingAction : createListingAction, undefined);
  const initialModality: Modality = listing?.operationType === "SALE" ? "venda" : listing?.operationType === "MONTHLY_RENT" ? "mensal" : "diaria";
  const savedRules = parseJson<Record<string, unknown>>(listing?.houseRules, {});
  const savedSafety = parseJson<Record<string, unknown>>(listing?.safetyItems, {});
  const { openSidebar, unreadCount } = useChatSocket();

  // A barra de ações é fixa; o formulário reserva espaço igual à altura dela para nada ficar escondido.
  const footerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!footerRef.current || !formRef.current) return;
    const form = formRef.current;
    const observer = new ResizeObserver(([entry]) => form.style.setProperty("--wizard-footer-h", `${entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height}px`));
    observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  const [draftMessage, setDraftMessage] = useState("");
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [draftRevision, setDraftRevision] = useState(0);
  const filesRef = useRef<File[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [structureConfirmed, setStructureConfirmed] = useState(isEdit);

  // Controle de Etapa (Wizard)
  const [currentStep, updateCurrentStep] = useState(1);
  // Na edição o anúncio já está preenchido: todas as etapas contam como vistas (ficam ✓ se não houver pendência).
  const [visitedSteps, setVisitedSteps] = useState<number[]>(() => (isEdit ? ALL_STEPS.map((step) => step.id) : [1]));
  const setCurrentStep = (next: number) => {
    updateCurrentStep(next);
    setVisitedSteps(previous => previous.includes(next) ? previous : [...previous, next]);
  };
  // Erros aparecem quando a pessoa tenta avançar/publicar (etapa "tentada") ou sai de um campo
  // (campo "tocado"); a partir daí somem sozinhos assim que o dado fica válido.
  const [attemptedSteps, setAttemptedSteps] = useState<number[]>([]);
  const [touched, setTouched] = useState<string[]>([]);
  const touch = (field: string) => setTouched(previous => previous.includes(field) ? previous : [...previous, field]);
  const markAttempted = (step: number) => setAttemptedSteps(previous => previous.includes(step) ? previous : [...previous, step]);

  // Estados dos seletores
  const [type, setType] = useState<"casa" | "apartamento">(listing?.type === "apartamento" ? "apartamento" : "casa");
  const [modality, setModality] = useState<Modality>(initialModality);
  const category = modality === "venda" ? "venda" : "aluguel";
  const billingCycle = modality === "diaria" ? "noite" : modality === "mensal" ? "mês" : "noite";
  const operationType = modality === "venda" ? "SALE" : modality === "mensal" ? "MONTHLY_RENT" : "DAILY_RENT";

  const isOrg = !!myOrg;

  // A etapa 5 (Atendimento/CRM) só existe pra conta de organização.
  const steps = useMemo(
    () => ALL_STEPS.filter((step) => !(step.orgOnly && !isOrg)),
    [isOrg]
  );

  // Título e Descrição
  const [name, setName] = useState(listing?.name ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");

  // Características
  const [bedrooms, setBedrooms] = useState(listing?.bedrooms ?? 0);
  const [suites, setSuites] = useState(listing?.suites ?? 0);
  const [bathrooms, setBathrooms] = useState(listing?.bathrooms ?? 0);
  const [parking, setParking] = useState(listing?.parking ?? 0);
  const [privateArea, setPrivateArea] = useState(numText(listing?.privateArea));
  const [totalArea, setTotalArea] = useState(numText(listing?.totalArea));

  // Seção 61 da spec: nunca começar com comodidades pré-marcadas — o anunciante escolhe tudo.
  const [amenities, setAmenities] = useState<string[]>(() => parseJson<string[]>(listing?.amenities, []));

  // Estados de Regras e Segurança (só DAILY_RENT)
  const [checkInTime, setCheckInTime] = useState(listing?.checkInTime ?? "15:00");
  const [checkOutTime, setCheckOutTime] = useState(listing?.checkOutTime ?? "11:00");
  const [customMaxGuests, setCustomMaxGuests] = useState(listing?.customMaxGuests ?? 2);
  const [minimumNights, setMinimumNights] = useState(listing?.minimumNights != null ? String(listing.minimumNights) : "1");
  const [cleaningFee, setCleaningFee] = useState(numText(listing?.cleaningFee));
  const [allowPetsDaily, setAllowPetsDaily] = useState(savedRules.allowPets === true);
  const [allowSmoking, setAllowSmoking] = useState(savedRules.allowSmoking === true);
  const [allowParties, setAllowParties] = useState(savedRules.allowParties === true);
  const [quietHours, setQuietHours] = useState(typeof savedRules.quietHours === "string" ? savedRules.quietHours : "22:00 às 08:00");
  const [customNotes, setCustomNotes] = useState(typeof savedRules.customNotes === "string" ? savedRules.customNotes : "");

  const [externalCameras, setExternalCameras] = useState<boolean | null>(answered(savedSafety.externalCameras));
  const [smokeAlarm, setSmokeAlarm] = useState<boolean | null>(answered(savedSafety.smokeAlarm));
  const [fireExtinguisher, setFireExtinguisher] = useState<boolean | null>(answered(savedSafety.fireExtinguisher));
  const [doorman24h, setDoorman24h] = useState<boolean | null>(answered(savedSafety.doorman24h));
  const [firstAidKit, setFirstAidKit] = useState<boolean | null>(answered(savedSafety.firstAidKit));

  const [cancellationPolicy, setCancellationPolicy] = useState<"FLEXIBLE" | "MODERATE" | "STRICT">(listing?.cancellationPolicy === "MODERATE" || listing?.cancellationPolicy === "STRICT" ? listing.cancellationPolicy : "FLEXIBLE");

  // Condições de VENDA (seção 66)
  const [condoFee, setCondoFee] = useState(numText(listing?.condoFee));
  const [iptuAnnual, setIptuAnnual] = useState(numText(listing?.iptuAnnual));
  const [acceptsFinancing, setAcceptsFinancing] = useState(listing?.acceptsFinancing ?? false);
  const [acceptsExchange, setAcceptsExchange] = useState(listing?.acceptsExchange ?? false);

  // Condições de ALUGUEL MENSAL (seção 67) — condoFee é compartilhado com venda acima
  const [iptuMonthly, setIptuMonthly] = useState(numText(listing?.iptuMonthly));
  const [availableFrom, setAvailableFrom] = useState(listing?.availableFrom ? listing.availableFrom.slice(0, 10) : "");
  const [minimumLeaseMonths, setMinimumLeaseMonths] = useState(numText(listing?.minimumLeaseMonths));
  const [guaranteeTypes, setGuaranteeTypes] = useState<string[]>(() => parseJson<string[]>(listing?.guaranteeTypes, []));
  const [isFurnished, setIsFurnished] = useState(listing?.isFurnished ?? false);
  const [allowPetsMonthly, setAllowPetsMonthly] = useState(listing?.allowPets ?? false);

  // Preço e Endereço
  const [price, setPrice] = useState(listing?.price ? String(listing.price) : "");
  // Negociação de valor no chat — piso opcional e sigiloso
  const [acceptsNegotiation, setAcceptsNegotiation] = useState(listing?.acceptsNegotiation ?? false);
  const [minNegotiablePrice, setMinNegotiablePrice] = useState(numText(listing?.minNegotiablePrice));
  const [cep, setCep] = useState(listing?.cep ?? "");
  const [logradouro, setLogradouro] = useState(listing?.logradouro ?? "");
  const [numero, setNumero] = useState(listing?.numero ?? "");
  const [complemento, setComplemento] = useState(listing?.complemento ?? "");
  const [bairro, setBairro] = useState(listing?.bairro ?? "");
  const [cidade, setCidade] = useState(listing?.cidade ?? "");
  const [uf, setUf] = useState(listing?.uf ?? "");
  const [cepStatus, setCepStatus] = useState<CepStatus>("idle");
  const lastCepLookup = useRef("");

  // Empreendimento + Atendimento/CRM (seção 8/63/72 — só organização)
  const [buildingOptions, setBuildingOptions] = useState<BuildingOption[]>(buildings);
  const [buildingId, setBuildingId] = useState(listing?.buildingId ?? "");
  const [showNewBuildingForm, setShowNewBuildingForm] = useState(false);
  const [hasSpecificAgent, setHasSpecificAgent] = useState(!!listing?.agentId);
  const [assignedAgentId, setAssignedAgentId] = useState(listing?.agentId ?? "");
  const [assumeBuildingLeads, setAssumeBuildingLeads] = useState(false);
  const activeMembers = useMemo(
    () => (myOrg?.organization.members ?? []).filter((m) => m.status === "ACTIVE"),
    [myOrg]
  );
  const canPickAgent = !myOrg || ["OWNER", "ADMIN"].includes(myOrg.role);

  const visibleAmenities = amenities.filter(id => !["pet_friendly", "estacionamento", "cameras"].includes(id) && (modality === "diaria" || isFurnished || !["wifi", "tv", "cafeteira", "maquina_lavar", "cozinha"].includes(id)));
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const imageCount = photoItems.length;
  const initialPhotos = useMemo(() => (listing?.images ?? []).map((image) => ({ id: image.id, url: image.url })), [listing]);
  const photoOrder = photoOrderTokens(photoItems);
  const photosChanged = isEdit && JSON.stringify(photoOrder) !== JSON.stringify(initialPhotos.map((p) => `existing:${p.id}`));

  const photos = photoItems.map((item) => ({ url: item.url }));
  const [previewIndex, setPreviewIndex] = useState(0);

  const snapshot = () => ({ structureConfirmed, currentStep, type, modality, name, description, bedrooms, suites, bathrooms, parking, privateArea, totalArea, amenities, checkInTime, checkOutTime, customMaxGuests, minimumNights, cleaningFee, allowPetsDaily, allowSmoking, allowParties, quietHours, customNotes, externalCameras, smokeAlarm, fireExtinguisher, doorman24h, firstAidKit, cancellationPolicy, condoFee, iptuAnnual, acceptsFinancing, acceptsExchange, iptuMonthly, availableFrom, minimumLeaseMonths, guaranteeTypes, isFurnished, allowPetsMonthly, price, acceptsNegotiation, minNegotiablePrice, cep, logradouro, numero, complemento, bairro, cidade, uf, buildingId, hasSpecificAgent, assignedAgentId, assumeBuildingLeads, files: filesRef.current });
  type DraftSnapshot = ReturnType<typeof snapshot>;
  useEffect(() => { if (isEdit) return; listingDraft<DraftSnapshot>(userId).then(d => setDraftAvailable(!!d)).catch(() => setDraftMessage("Não foi possível consultar o rascunho neste navegador.")); }, [userId, isEdit]);
  const saveDraft = async () => {
    setSavingDraft(true);
    try { await listingDraft(userId, snapshot()); setDraftAvailable(true); setDraftMessage("Rascunho salvo neste navegador, incluindo as fotos. Retome por Anunciar imóvel nesta conta."); }
    catch { setDraftMessage("Não foi possível salvar o rascunho. Verifique o espaço e as permissões do navegador."); }
    finally { setSavingDraft(false); }
  };
  const restoreDraft = async () => {
    try {
      const draft = await listingDraft<DraftSnapshot>(userId);
      if (!draft) return;
      setStructureConfirmed(draft.structureConfirmed);
      setCurrentStep(draft.currentStep);
      setType(draft.type);
      setModality(draft.modality);
      setName(draft.name);
      setDescription(draft.description);
      setBedrooms(draft.bedrooms);
      setSuites(draft.suites);
      setBathrooms(draft.bathrooms);
      setParking(draft.parking);
      setPrivateArea(draft.privateArea);
      setTotalArea(draft.totalArea);
      setAmenities(draft.amenities);
      setCheckInTime(draft.checkInTime);
      setCheckOutTime(draft.checkOutTime);
      setCustomMaxGuests(draft.customMaxGuests);
      setMinimumNights(draft.minimumNights);
      setCleaningFee(draft.cleaningFee);
      setAllowPetsDaily(draft.allowPetsDaily);
      setAllowSmoking(draft.allowSmoking);
      setAllowParties(draft.allowParties);
      setQuietHours(draft.quietHours);
      setCustomNotes(draft.customNotes);
      setExternalCameras(draft.externalCameras);
      setSmokeAlarm(draft.smokeAlarm);
      setFireExtinguisher(draft.fireExtinguisher);
      setDoorman24h(draft.doorman24h);
      setFirstAidKit(draft.firstAidKit);
      setCancellationPolicy(draft.cancellationPolicy);
      setCondoFee(draft.condoFee);
      setIptuAnnual(draft.iptuAnnual);
      setAcceptsFinancing(draft.acceptsFinancing);
      setAcceptsExchange(draft.acceptsExchange);
      setIptuMonthly(draft.iptuMonthly);
      setAvailableFrom(draft.availableFrom);
      setMinimumLeaseMonths(draft.minimumLeaseMonths);
      setGuaranteeTypes(draft.guaranteeTypes);
      setIsFurnished(draft.isFurnished);
      setAllowPetsMonthly(draft.allowPetsMonthly);
      setPrice(draft.price);
      setAcceptsNegotiation(draft.acceptsNegotiation);
      setMinNegotiablePrice(draft.minNegotiablePrice);
      setCep(draft.cep);
      setLogradouro(draft.logradouro);
      setNumero(draft.numero);
      setComplemento(draft.complemento);
      setBairro(draft.bairro);
      setCidade(draft.cidade);
      setUf(draft.uf);
      setBuildingId(draft.buildingId);
      setHasSpecificAgent(draft.hasSpecificAgent);
      setAssignedAgentId(draft.assignedAgentId);
      setAssumeBuildingLeads(draft.assumeBuildingLeads);
      filesRef.current = draft.files; setDraftFiles(draft.files);
      setDraftRevision(previous => previous + 1);
      setDraftAvailable(false);
      setDraftMessage("Rascunho recuperado. Revise os dados antes de publicar.");
    } catch { setDraftMessage("Não foi possível recuperar o rascunho."); }
  };

  // Consulta o ViaCEP assim que o CEP tem 8 dígitos (e de novo ao sair do campo, se mudou).
  const lookupCep = async (value: string, force = false) => {
    const cleanCep = value.replace(/\D/g, "");
    if (cleanCep.length !== 8 || (!force && cleanCep === lastCepLookup.current)) return;
    lastCepLookup.current = cleanCep;
    setCepStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data: ViaCepResponse = await res.json();
      if (lastCepLookup.current !== cleanCep) return; // a pessoa já digitou outro CEP
      if (data.erro) {
        setCepStatus("notfound");
        return;
      }
      setLogradouro(data.logradouro ?? "");
      setBairro(data.bairro ?? "");
      setCidade(data.localidade ?? "");
      setUf(data.uf ?? "");
      setCepStatus("found");
    } catch {
      if (lastCepLookup.current === cleanCep) setCepStatus("error");
    }
  };

  const toggleGuaranteeType = (value: string) => {
    setGuaranteeTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  // Se a etapa selecionada não existir mais na lista filtrada, usa a próxima etapa disponível.
  const rawIndex = steps.findIndex((step) => step.id === currentStep);
  const stepIndex = rawIndex === -1 ? steps.length - 1 : rawIndex;
  const activeStep = steps[stepIndex].id;
  const activeMeta = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const photosStep = 6;
  const reviewStep = steps[steps.length - 1].id;

  const issuesForStep = (step: number): Issue[] => {
    if (step === 1) return !name.trim() ? [{ field: "name", message: "Informe o título do imóvel." }] : [];
    if (step === 2) return [
      ...(!structureConfirmed ? [{ field: "structureConfirmed", message: "Confirme as quantidades de cômodos e vagas, inclusive quando forem zero." }] : []),
      ...([privateArea, totalArea].some(value => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) ? [{ field: "privateArea", message: "Informe áreas com valores não negativos." }] : []),
    ];
    if (step === 3) return [
      ...(cep.replace(/\D/g, "").length !== 8 ? [{ field: "cep", message: "Informe um CEP com 8 dígitos." }] : []),
      ...(!cidade.trim() ? [{ field: "cidade", message: "Informe a cidade." }] : []),
      ...(!/^[A-Za-z]{2}$/.test(uf) ? [{ field: "uf", message: "Informe a UF com duas letras." }] : []),
    ];
    if (step === 4) return [
      ...(!(Number(price) > 0 && Number.isFinite(Number(price))) ? [{ field: "price", message: "Informe um preço maior que zero." }] : []),
      ...(modality === "diaria" && (!Number.isInteger(customMaxGuests) || customMaxGuests < 1) ? [{ field: "customMaxGuests", message: "Informe a capacidade de hóspedes." }] : []),
      ...(modality === "diaria" && (!Number.isInteger(Number(minimumNights)) || Number(minimumNights) < 1) ? [{ field: "minimumNights", message: "Informe a estadia mínima em noites." }] : []),
      ...((modality === "diaria" ? [cleaningFee] : modality === "venda" ? [condoFee, iptuAnnual] : [condoFee, iptuMonthly]).some(value => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) ? [{ field: "charges", message: "Encargos devem ter valores não negativos." }] : []),
      ...(modality === "diaria" && [externalCameras, smokeAlarm, fireExtinguisher, doorman24h, firstAidKit].some(v => v === null) ? [{ field: "safety", message: "Informe se o imóvel possui cada item de segurança." }] : []),
    ];
    if (step === photosStep) return imageCount === 0 && !(isEdit && listing?.status === "DRAFT") ? [{ field: "photos", message: "Adicione ao menos uma foto." }] : [];
    return [];
  };
  const pendingIssues = steps.flatMap(step => issuesForStep(step.id).map(issue => ({ ...issue, step: step.id })));
  const currentIssues = issuesForStep(activeStep);
  const showStepErrors = attemptedSteps.includes(activeStep);
  /** Mensagem a exibir para um campo da etapa atual (só depois de tentar avançar ou sair do campo). */
  const errorFor = (field: string) => {
    const issue = currentIssues.find(i => i.field === field);
    return issue && (showStepErrors || touched.includes(field)) ? issue.message : undefined;
  };

  const focusField = (field: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(field);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const goTo = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateAndNext = () => {
    if (currentIssues.length) {
      markAttempted(activeStep);
      focusField(currentIssues[0].field);
      return;
    }
    if (!isLastStep) goTo(steps[stepIndex + 1].id);
  };

  const handlePrev = () => {
    if (stepIndex > 0) goTo(steps[stepIndex - 1].id);
  };

  const jumpToIssue = (issue: Issue & { step: number }) => {
    markAttempted(issue.step);
    setCurrentStep(issue.step);
    focusField(issue.field);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "draft" ? "draft" : "publish";

    if (intent === "draft") {
      event.preventDefault();
      void saveDraft();
      return;
    }
    if (pendingIssues.length) {
      event.preventDefault();
      jumpToIssue(pendingIssues[0]);
    }
  };

  // Erro devolvido pelo servidor ao publicar: aviso em destaque, com foco, até a pessoa fechar.
  const [dismissedState, setDismissedState] = useState<typeof state>(undefined);
  const serverError = state?.error && dismissedState !== state ? state.error : null;
  const serverErrorIsPhoto = !!serverError && /imag|foto|arquivo/i.test(serverError);
  const serverErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.error) requestAnimationFrame(() => serverErrorRef.current?.focus());
  }, [state]);

  // Situação de cada etapa para a trilha e a barra de progresso.
  const stepStatus = (step: number) => {
    const issues = issuesForStep(step);
    if (issues.length && attemptedSteps.includes(step)) return { kind: "error" as const, count: issues.length };
    if (!issues.length && visitedSteps.includes(step) && step !== activeStep) return { kind: "done" as const, count: 0 };
    return { kind: step === activeStep ? ("current" as const) : ("todo" as const), count: issues.length };
  };

  const priceLabel = Number(price) > 0 ? formatBRL(price) : null;
  const locationLabel = bairro && cidade ? `${bairro}, ${cidade}${uf ? ` - ${uf}` : ""}` : cidade ? `${cidade}${uf ? ` - ${uf}` : ""}` : null;
  const cover = photos[0]?.url;
  const shownPhoto = photos[Math.min(previewIndex, Math.max(photos.length - 1, 0))];

  const cepError = errorFor("cep");
  const cepHint =
    cepStatus === "loading" ? <span className={`${styles.status} ${styles.statusLoading}`}><LoaderCircle size={14} className={styles.spin} aria-hidden="true" />Buscando endereço…</span>
    : cepStatus === "found" ? <span className={`${styles.status} ${styles.statusOk}`}><CheckCircle2 size={14} aria-hidden="true" />Endereço encontrado. Confira os dados abaixo.</span>
    : cepStatus === "notfound" ? <span className={`${styles.status} ${styles.statusWarn}`}><TriangleAlert size={14} aria-hidden="true" />CEP não encontrado. Confira o número ou preencha o endereço manualmente.</span>
    : cepStatus === "error" ? <span className={`${styles.status} ${styles.statusWarn}`}><TriangleAlert size={14} aria-hidden="true" />Não foi possível consultar o CEP agora. Preencha o endereço manualmente.</span>
    : "Digite os 8 números — rua, bairro, cidade e UF são preenchidos automaticamente.";

  const safetyItems: { id: string; label: string; value: boolean | null; set: (v: boolean) => void }[] = [
    { id: "externalCameras", label: "Câmeras externas", value: externalCameras, set: setExternalCameras },
    { id: "smokeAlarm", label: "Alarme de fumaça", value: smokeAlarm, set: setSmokeAlarm },
    { id: "fireExtinguisher", label: "Extintor de incêndio", value: fireExtinguisher, set: setFireExtinguisher },
    { id: "doorman24h", label: "Portaria 24h", value: doorman24h, set: setDoorman24h },
    { id: "firstAidKit", label: "Kit de primeiros socorros", value: firstAidKit, set: setFirstAidKit },
  ];
  const safetyError = errorFor("safety");

  const moneyInput = ({ id, label, value, onChange, suffix }: { id: string; label: string; value: string; onChange: (v: string) => void; suffix?: string }) => (
    <Field id={id} label={label} optional hint={value && Number(value) >= 0 ? `${formatBRL(value)}${suffix ?? ""}` : undefined}>
      <input id={id} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={value} onChange={(e) => onChange(e.target.value)} className={styles.input} />
    </Field>
  );

  return (
    <form ref={formRef} noValidate action={formAction} onSubmit={handleSubmit} className={styles.form} aria-busy={pending || savingDraft}>
      {/* Campos ocultos mantidos para envio total ao Server Action */}
      <input type="hidden" name="structureConfirmed" value={String(structureConfirmed)} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="billingCycle" value={billingCycle} />
      <input type="hidden" name="operationType" value={operationType} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="bedrooms" value={bedrooms} />
      <input type="hidden" name="suites" value={suites} />
      <input type="hidden" name="bathrooms" value={bathrooms} />
      <input type="hidden" name="parking" value={parking} />
      <input type="hidden" name="privateArea" value={privateArea} />
      <input type="hidden" name="totalArea" value={totalArea} />
      <input type="hidden" name="checkInTime" value={checkInTime} />
      <input type="hidden" name="checkOutTime" value={checkOutTime} />
      <input type="hidden" name="customMaxGuests" value={customMaxGuests} />
      <input type="hidden" name="minimumNights" value={minimumNights} />
      <input type="hidden" name="cleaningFee" value={cleaningFee} />
      <input
        type="hidden"
        name="houseRules"
        value={JSON.stringify({ allowPets: allowPetsDaily, allowSmoking, allowParties, quietHours, customNotes })}
      />
      <input
        type="hidden"
        name="safetyItems"
        value={JSON.stringify({ externalCameras, smokeAlarm, fireExtinguisher, doorman24h, firstAidKit })}
      />
      <input type="hidden" name="cancellationPolicy" value={cancellationPolicy} />
      <input type="hidden" name="condoFee" value={condoFee} />
      <input type="hidden" name="iptuAnnual" value={iptuAnnual} />
      <input type="hidden" name="acceptsFinancing" value={String(acceptsFinancing)} />
      <input type="hidden" name="acceptsExchange" value={String(acceptsExchange)} />
      <input type="hidden" name="iptuMonthly" value={iptuMonthly} />
      <input type="hidden" name="availableFrom" value={availableFrom} />
      <input type="hidden" name="minimumLeaseMonths" value={minimumLeaseMonths} />
      <input type="hidden" name="guaranteeTypes" value={JSON.stringify(guaranteeTypes)} />
      <input type="hidden" name="isFurnished" value={String(isFurnished)} />
      <input type="hidden" name="allowPets" value={String(allowPetsMonthly)} />
      <input type="hidden" name="buildingId" value={buildingId} />
      <input type="hidden" name="assumeBuildingLeads" value={String(assumeBuildingLeads)} />
      <input type="hidden" name="assignedAgentId" value={hasSpecificAgent ? assignedAgentId : ""} />
      {/* Título, descrição, endereço e comodidades precisam sobreviver à troca de etapa —
          seus campos visíveis só existem no DOM enquanto a etapa correspondente está ativa. */}
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="price" value={price} />
      <input type="hidden" name="acceptsNegotiation" value={String(acceptsNegotiation)} />
      <input type="hidden" name="minNegotiablePrice" value={minNegotiablePrice} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="cep" value={cep} />
      <input type="hidden" name="logradouro" value={logradouro} />
      <input type="hidden" name="numero" value={numero} />
      <input type="hidden" name="complemento" value={complemento} />
      <input type="hidden" name="bairro" value={bairro} />
      <input type="hidden" name="cidade" value={cidade} />
      <input type="hidden" name="uf" value={uf} />
      <input type="hidden" name="amenities" value={JSON.stringify(amenities)} />
      {isEdit && (
        <>
          <input type="hidden" name="id" value={listing.id} />
          <input type="hidden" name="hasOrgCrmStep" value={String(isOrg)} />
          <input type="hidden" name="photoOrder" value={JSON.stringify(photoOrder)} />
          <input type="hidden" name="photosChanged" value={String(photosChanged)} />
          {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
        </>
      )}

      {/* ── TRILHA DE ETAPAS + PRÉVIA AO VIVO (desktop) ── */}
      <aside className={styles.rail} aria-label="Etapas do anúncio">
        <ol className={styles.stepList}>
          {steps.map((step, index) => {
            const status = stepStatus(step.id);
            const isActive = step.id === activeStep;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${index + 1}. ${step.title}: ${status.kind === "error" ? `${status.count} pendência(s)` : issuesForStep(step.id).length === 0 ? "requisitos atendidos" : visitedSteps.includes(step.id) ? "visitada, incompleta" : "não visitada, incompleta"}`}
                  className={`${styles.stepperTab} ${isActive ? styles.stepActive : ""} ${status.kind === "done" ? styles.stepDone : ""} ${status.kind === "error" ? styles.stepError : ""}`}
                  onClick={() => goTo(step.id)}
                >
                  <span className={styles.stepDot} aria-hidden="true">
                    {status.kind === "done" ? <Check size={14} strokeWidth={3} /> : status.kind === "error" ? "!" : index + 1}
                  </span>
                  <span className={styles.stepText}>
                    <span className={styles.stepName}>{step.title}</span>
                    <span className={styles.stepInfo}>{status.kind === "error" ? (status.count === 1 ? "1 item a corrigir" : `${status.count} itens a corrigir`) : step.subtitle}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {activeStep !== reviewStep && (
          <div className={styles.mini} aria-label="Prévia rápida do anúncio">
            <p className={styles.miniLabel}><Eye size={14} aria-hidden="true" />Prévia ao vivo</p>
            <div className={`${styles.miniCover} ${cover ? styles.miniCoverFilled : ""}`}>
              {/* Local object URLs cannot be optimized by next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cover ? <img src={cover} alt="" /> : <span>A capa aparece aqui<br />quando você adicionar fotos</span>}
              <span className={styles.badge}>{MODALITY_BADGE[modality]}</span>
            </div>
            <div className={styles.miniBody}>
              <p className={styles.miniPrice}>{priceLabel ? <>{priceLabel}<small> {PERIOD[modality]}</small></> : <span className={styles.placeholder}>R$ —</span>}</p>
              <p className={styles.miniLoc}>{locationLabel ?? <span className={styles.placeholder}>Bairro, cidade</span>}</p>
              <p className={styles.miniTitle}>{name.trim() || <span className={styles.placeholder}>Título do anúncio</span>}</p>
            </div>
          </div>
        )}

        <p className={styles.railNote}>{isEdit ? "Você pode salvar as alterações em qualquer etapa." : "O rascunho fica salvo neste navegador e nesta conta. Salve antes de sair."}</p>
      </aside>

      <div className={styles.content}>
        {/* ── CABEÇALHO DA ETAPA ── */}
        <header className={styles.stepHead}>
          <p className={styles.eyebrow}>Etapa {stepIndex + 1} de {steps.length}</p>
          <h2 className={styles.stepHeading}>{activeMeta.title}</h2>
          <p className={styles.stepLead}>{isEdit && activeStep === reviewStep ? "Revise antes de salvar: é assim que os interessados verão o seu anúncio." : activeMeta.lead}</p>
          <div className={styles.progress} aria-hidden="true">
            {steps.map((step) => {
              const status = stepStatus(step.id);
              return <span key={step.id} className={`${styles.progressSeg} ${status.kind === "done" ? styles.segDone : status.kind === "error" ? styles.segError : status.kind === "current" ? styles.segCurrent : ""}`} />;
            })}
          </div>
        </header>

        {draftAvailable && (
          <div className={styles.banner}>
            <RotateCcw size={18} aria-hidden="true" />
            <span className={styles.bannerText}>Você tem um rascunho salvo neste navegador.</span>
            <button type="button" className={`${styles.btnSecondary} ${styles.btnSmall}`} onClick={restoreDraft}>Recuperar rascunho deste navegador</button>
          </div>
        )}

        {serverError && (
          <div ref={serverErrorRef} tabIndex={-1} className={styles.serverError} role="alert">
            <TriangleAlert size={20} aria-hidden="true" />
            <div className={styles.serverErrorBody}>
              <p className={styles.serverErrorTitle}>{isEdit ? "Não foi possível salvar as alterações" : "Não foi possível publicar o anúncio"}</p>
              <p>{serverError}</p>
              <p className={styles.serverErrorHelp}>
                Seus dados e fotos continuam aqui. {serverErrorIsPhoto ? (isEdit ?"Revise as fotos e tente salvar de novo." : "Revise as fotos e tente publicar de novo.") : (isEdit ? "Confira as informações e tente salvar de novo." : "Confira as informações e tente publicar de novo.")}
              </p>
              {serverErrorIsPhoto && activeStep !== photosStep && (
                <div className={styles.serverErrorActions}>
                  <button type="button" className={`${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => goTo(photosStep)}>
                    <Camera size={16} aria-hidden="true" />Revisar fotos
                  </button>
                </div>
              )}
            </div>
            <button type="button" className={styles.iconClose} onClick={() => setDismissedState(state)} aria-label="Fechar aviso">
              <X size={18} />
            </button>
          </div>
        )}

        {showStepErrors && currentIssues.length > 0 && (
          <div className={styles.summary} role="alert">
            <CircleAlert size={20} aria-hidden="true" />
            <div>
              <p className={styles.summaryTitle}>
                {currentIssues.length === 1 ? "Falta 1 item para continuar" : `Faltam ${currentIssues.length} itens para continuar`}
              </p>
              <ul className={styles.summaryList}>
                {currentIssues.map((issue) => (
                  <li key={issue.field + issue.message}>
                    <button type="button" className={styles.linkButton} onClick={() => focusField(issue.field)}>{issue.message}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeStep !== reviewStep && (
          <p className={styles.tip}><Lightbulb size={16} aria-hidden="true" /><span>{activeMeta.tip}</span></p>
        )}

        {/* ── ETAPA 1: TIPO & OBJETIVO ── */}
        {activeStep === 1 && (
          <div key="step-1" className={styles.stepEnter}>
            {isEdit && modality !== initialModality && (
              <p className={styles.modalityWarning} role="status">
                <TriangleAlert size={16} aria-hidden="true" />
                <span>Ao salvar, as condições exclusivas de <strong>{MODALITY_BADGE[initialModality].toLowerCase()}</strong> serão removidas e passam a valer as de <strong>{MODALITY_BADGE[modality].toLowerCase()}</strong>.</span>
              </p>
            )}
            <Card icon={Tag} title="O que você quer fazer?" subtitle="A modalidade define o restante do formulário. Se mudar depois, suas respostas ficam guardadas; só o que vale para a modalidade escolhida é enviado.">
              <div className={styles.choices}>
                <ChoiceCard active={modality === "diaria"} onClick={() => setModality("diaria")} icon={Calendar} title="Aluguel por Diária" subtitle="Hospedagens curtas e temporada, cobradas por noite" />
                <ChoiceCard active={modality === "mensal"} onClick={() => setModality("mensal")} icon={CalendarDays} title="Aluguel Mensal" subtitle="Contrato de locação com cobrança mensal" />
                <ChoiceCard active={modality === "venda"} onClick={() => setModality("venda")} icon={KeyRound} title="Venda do Imóvel" subtitle="Negociação direta com compradores interessados" />
              </div>
            </Card>

            <Card icon={Home} title="Qual o tipo do seu imóvel?">
              <div className={styles.choices}>
                <ChoiceCard row active={type === "casa"} onClick={() => setType("casa")} icon={Home} title="Casa" subtitle="Térrea, sobrado ou casa de condomínio" />
                <ChoiceCard row active={type === "apartamento"} onClick={() => setType("apartamento")} icon={Building2} title="Apartamento" subtitle="Flat, studio, cobertura ou apartamento" />
              </div>
            </Card>

            <Card icon={FileText} title="Título e descrição" subtitle="Destaque o que torna seu imóvel único.">
              <div className={styles.fields}>
                <Field id="name" label="Título do anúncio" required error={errorFor("name")} aside={<span className={styles.counterText}>{name.length} caracteres</span>}>
                  <input
                    id="name"
                    type="text"
                    placeholder="Ex.: Loft aconchegante com varanda gourmet e vista para o mar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => touch("name")}
                    className={styles.input}
                    {...describe("name", errorFor("name"))}
                  />
                </Field>
                <Field id="description" label="Descrição detalhada" optional aside={<span className={styles.counterText}>{description.length} caracteres</span>} hint="Fale do ambiente, da vizinhança, do acesso e dos diferenciais.">
                  <textarea
                    id="description"
                    rows={6}
                    placeholder="Descreva a atmosfera do local, comodidades próximas, facilidade de acesso e destaques…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={styles.textarea}
                    {...describe("description", undefined, true)}
                  />
                </Field>
              </div>
            </Card>
          </div>
        )}

        {/* ── ETAPA 2: SOBRE O IMÓVEL ── */}
        {activeStep === 2 && (
          <div key="step-2" className={styles.stepEnter}>
            <Card icon={Sparkles} title="Capacidade & Estrutura" subtitle="Ajuste cômodos e área do imóvel.">
              <div className={styles.fields}>
                <div className={styles.grid2}>
                  <Field id="privateArea" label="Área privativa (m²)" optional error={errorFor("privateArea")}>
                    <input id="privateArea" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Ex.: 68" value={privateArea} onChange={(e) => setPrivateArea(e.target.value)} onBlur={() => touch("privateArea")} className={styles.input} {...describe("privateArea", errorFor("privateArea"))} />
                  </Field>
                  <Field id="totalArea" label="Área total (m²)" optional>
                    <input id="totalArea" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Ex.: 75" value={totalArea} onChange={(e) => setTotalArea(e.target.value)} onBlur={() => touch("privateArea")} className={styles.input} aria-invalid={errorFor("privateArea") ? true : undefined} />
                  </Field>
                </div>

                <div className={styles.counters}>
                  <CounterRow icon={BedDouble} title="Quartos" subtitle="Quantos quartos possui o imóvel?" value={bedrooms} onChange={(v) => { setStructureConfirmed(false); setBedrooms(v); }} />
                  <CounterRow icon={DoorClosed} title="Suítes" subtitle="Quantas suítes possui o imóvel?" value={suites} onChange={(v) => { setStructureConfirmed(false); setSuites(v); }} />
                  <CounterRow icon={Bath} title="Banheiros" subtitle="Quantidade de banheiros" value={bathrooms} onChange={(v) => { setStructureConfirmed(false); setBathrooms(v); }} />
                  <CounterRow icon={Car} title="Vagas de garagem" subtitle="Quantidade de vagas" value={parking} onChange={(v) => { setStructureConfirmed(false); setParking(v); }} />
                </div>

                <div className={styles.field}>
                  <label className={`${styles.confirm} ${structureConfirmed ? styles.confirmOn : errorFor("structureConfirmed") ? styles.confirmInvalid : ""}`}>
                    <input
                      id="structureConfirmed"
                      type="checkbox"
                      checked={structureConfirmed}
                      onChange={(e) => setStructureConfirmed(e.target.checked)}
                      {...describe("structureConfirmed", errorFor("structureConfirmed"))}
                    />
                    <span>
                      Confirmo as quantidades informadas: <strong>{plural(bedrooms, "quarto", "quartos")}, {plural(suites, "suíte", "suítes")}, {plural(bathrooms, "banheiro", "banheiros")} e {plural(parking, "vaga", "vagas")}</strong>.
                    </span>
                  </label>
                  <FieldError id="structureConfirmed-error" message={errorFor("structureConfirmed")} />
                </div>
              </div>
            </Card>

            <Card icon={CheckCircle2} title="Comodidades" subtitle="O que o imóvel oferece.">
              <div className={styles.fields}>
                <Toggle checked={isFurnished} onChange={setIsFurnished} label="Mobiliado" description="Ative para informar equipamentos incluídos" />
                <AmenitiesSelector value={amenities} onChange={setAmenities} modality={modality} furnished={isFurnished} />
              </div>
            </Card>
          </div>
        )}

        {/* ── ETAPA 3: LOCALIZAÇÃO ── */}
        {activeStep === 3 && (
          <div key="step-3" className={styles.stepEnter}>
            <Card icon={MapPin} title="Onde fica o seu imóvel?" subtitle="Comece pelo CEP.">
              <div className={styles.fields}>
                <div className={styles.grid2}>
                  <Field id="cep" label="CEP" required error={cepError} hint={cepHint}>
                    <div className={styles.cepRow}>
                    <input
                      id="cep"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      maxLength={9}
                      value={cep}
                      onChange={(e) => { const next = formatCep(e.target.value); setCep(next); if (next.replace(/\D/g, "").length < 8) { setCepStatus("idle"); lastCepLookup.current = ""; } else void lookupCep(next); }}
                      onBlur={() => { touch("cep"); void lookupCep(cep); }}
                      className={`${styles.input} ${cepStatus === "found" && !cepError ? styles.inputValid : ""}`}
                      {...describe("cep", cepError, true)}
                    />
                    {/* Busca manual: força nova consulta ao ViaCEP (ex.: a automática falhou ou o endereço foi apagado). */}
                    <button
                      type="button"
                      className={`${styles.btnSecondary} ${styles.cepButton}`}
                      disabled={cepStatus === "loading"}
                      onClick={() => {
                        touch("cep");
                        if (cep.replace(/\D/g, "").length !== 8) { focusField("cep"); return; }
                        void lookupCep(cep, true);
                      }}
                    >
                      {cepStatus === "loading" ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
                      {cepStatus === "loading" ? "Buscando…" : "Buscar CEP"}
                    </button>
                    </div>
                  </Field>
                </div>

                <div className={styles.gridAddress}>
                  <Field id="logradouro" label="Rua / Avenida">
                    <input id="logradouro" type="text" autoComplete="address-line1" placeholder="Rua, avenida, alameda…" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className={styles.input} />
                  </Field>
                  <Field id="numero" label="Número">
                    <input id="numero" type="text" placeholder="123 ou S/N" value={numero} onChange={(e) => setNumero(e.target.value)} className={styles.input} />
                  </Field>
                </div>

                <div className={styles.grid2}>
                  <Field id="complemento" label="Complemento" optional>
                    <input id="complemento" type="text" placeholder="Apto, bloco, casa…" value={complemento} onChange={(e) => setComplemento(e.target.value)} className={styles.input} />
                  </Field>
                  <Field id="bairro" label="Bairro">
                    <input id="bairro" type="text" placeholder="Nome do bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className={styles.input} />
                  </Field>
                </div>

                <div className={styles.gridAddress}>
                  <Field id="cidade" label="Cidade" required error={errorFor("cidade")}>
                    <input id="cidade" type="text" autoComplete="address-level2" placeholder="Nome da cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} onBlur={() => touch("cidade")} className={styles.input} {...describe("cidade", errorFor("cidade"))} />
                  </Field>
                  <Field id="uf" label="UF" required error={errorFor("uf")}>
                    <input id="uf" type="text" autoComplete="address-level1" maxLength={2} placeholder="SP" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} onBlur={() => touch("uf")} className={styles.input} {...describe("uf", errorFor("uf"))} />
                  </Field>
                </div>
              </div>
            </Card>

            {isOrg && (
              <Card icon={Building2} title="Empreendimento" subtitle="Vincule este imóvel a um empreendimento já cadastrado, se houver.">
                <Field id="buildingSelect" label="Empreendimento" optional>
                  <select id="buildingSelect" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className={styles.input}>
                    <option value="">Nenhum</option>
                    {buildingOptions.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>
                {!showNewBuildingForm ? (
                  <button type="button" className={`${styles.btnSecondary} ${styles.btnSmall}`} style={{ marginTop: 12 }} onClick={() => setShowNewBuildingForm(true)}>
                    <Plus size={16} aria-hidden="true" />Novo empreendimento
                  </button>
                ) : (
                  <NewBuildingInlineForm
                    onCreated={(b) => {
                      setBuildingOptions((prev) => [...prev, b]);
                      setBuildingId(b.id);
                      setShowNewBuildingForm(false);
                    }}
                    onCancel={() => setShowNewBuildingForm(false)}
                  />
                )}
              </Card>
            )}
          </div>
        )}

        {/* ── ETAPA 4: CONDIÇÕES (por modalidade) ── */}
        {activeStep === 4 && (
          <div key="step-4" className={styles.stepEnter}>
            <Card
              icon={Wallet}
              title={modality === "diaria" ? "Preço por noite" : modality === "mensal" ? "Preço mensal" : "Preço de venda"}
              subtitle={modality === "diaria" ? "Valor cobrado por noite de hospedagem." : modality === "mensal" ? "Valor do aluguel cobrado por mês." : "Valor total de venda do imóvel."}
            >
              <div className={styles.fields}>
                <div className={styles.field}>
                  <div className={`${styles.priceBox} ${errorFor("price") ? styles.priceInvalid : ""}`}>
                    <span className={styles.priceSymbol} aria-hidden="true">R$</span>
                    <input
                      id="price"
                      aria-label={modality === "diaria" ? "Diária em reais" : modality === "mensal" ? "Aluguel mensal em reais" : "Preço de venda em reais"}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      onBlur={() => touch("price")}
                      className={styles.priceInput}
                      {...describe("price", errorFor("price"), !!priceLabel)}
                    />
                    {PERIOD[modality] && <span className={styles.pricePeriod}>{PERIOD[modality]}</span>}
                  </div>
                  {priceLabel && !errorFor("price") && <p id="price-hint" className={styles.hint}>Os interessados verão: <strong>{priceLabel}{PERIOD[modality] && ` ${PERIOD[modality]}`}</strong></p>}
                  <FieldError id="price-error" message={errorFor("price")} />
                </div>

                <Toggle checked={acceptsNegotiation} onChange={setAcceptsNegotiation} label="Aceita negociação de valor pelo chat" description="Interessados podem enviar propostas pelo chat." />
                {acceptsNegotiation && (
                  <Field
                    id="minNegotiablePrice"
                    label={`Valor mínimo aceito (R$${modality === "diaria" ? " por noite" : modality === "mensal" ? "/mês" : ""})`}
                    optional
                    hint="Nunca aparece para o cliente. Propostas abaixo dele são recusadas automaticamente."
                  >
                    <input id="minNegotiablePrice" type="number" inputMode="decimal" min="0" step="0.01" value={minNegotiablePrice} onChange={(e) => setMinNegotiablePrice(e.target.value)} className={styles.input} {...describe("minNegotiablePrice", undefined, true)} />
                  </Field>
                )}
              </div>
            </Card>

            {/* ── VENDA (seção 66) ── */}
            {modality === "venda" && (
              <Card icon={Ruler} title="Condições da venda" subtitle="Condomínio, IPTU, financiamento e permuta.">
                <div className={styles.fields}>
                  <div id="charges" tabIndex={-1} className={styles.grid2}>
                    {moneyInput({ id: "condoFeeSale", label: "Condomínio (R$/mês)", value: condoFee, onChange: setCondoFee, suffix: " por mês" })}
                    {moneyInput({ id: "iptuAnnual", label: "IPTU (R$/ano)", value: iptuAnnual, onChange: setIptuAnnual, suffix: " por ano" })}
                  </div>
                  <FieldError id="charges-error" message={errorFor("charges")} />
                  <div className={styles.toggles}>
                    <Toggle checked={acceptsFinancing} onChange={setAcceptsFinancing} label="Aceita financiamento" />
                    <Toggle checked={acceptsExchange} onChange={setAcceptsExchange} label="Aceita permuta" />
                  </div>
                </div>
              </Card>
            )}

            {/* ── ALUGUEL MENSAL (seção 67) ── */}
            {modality === "mensal" && (
              <Card icon={CalendarDays} title="Condições do aluguel mensal" subtitle="Condomínio, IPTU, disponibilidade e garantias.">
                <div className={styles.fields}>
                  <div id="charges" tabIndex={-1} className={styles.grid2}>
                    {moneyInput({ id: "condoFeeMonthly", label: "Condomínio (R$/mês)", value: condoFee, onChange: setCondoFee, suffix: " por mês" })}
                    {moneyInput({ id: "iptuMonthly", label: "IPTU (R$/mês)", value: iptuMonthly, onChange: setIptuMonthly, suffix: " por mês" })}
                  </div>
                  <FieldError id="charges-error" message={errorFor("charges")} />
                  <div className={styles.grid2}>
                    <Field id="availableFrom" label="Disponível a partir de" optional>
                      <input id="availableFrom" type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={styles.input} />
                    </Field>
                    <Field id="minimumLeaseMonths" label="Prazo mínimo (meses)" optional>
                      <input id="minimumLeaseMonths" type="number" inputMode="numeric" min="0" value={minimumLeaseMonths} onChange={(e) => setMinimumLeaseMonths(e.target.value)} className={styles.input} />
                    </Field>
                  </div>
                  <div>
                    <h4 className={styles.subHeading}>Garantias aceitas</h4>
                    <div className={styles.toggles}>
                      {GUARANTEE_OPTIONS.map((opt) => (
                        <Toggle key={opt.value} checked={guaranteeTypes.includes(opt.value)} onChange={() => toggleGuaranteeType(opt.value)} label={opt.label} />
                      ))}
                    </div>
                  </div>
                  <div className={styles.toggles}>
                    <Toggle checked={isFurnished} onChange={setIsFurnished} label="Mobiliado" />
                    <Toggle checked={allowPetsMonthly} onChange={setAllowPetsMonthly} label="Aceita animais de estimação" />
                  </div>
                </div>
              </Card>
            )}

            {/* ── DIÁRIA (seção 68) — regras, segurança e cancelamento ── */}
            {modality === "diaria" && (
              <>
                <Card icon={CalendarDays} title="Estadia" subtitle="Horários, capacidade e taxas para seus hóspedes.">
                  <div className={styles.fields}>
                    <div className={styles.grid2}>
                      <Field id="checkInTime" label="Check-in a partir das">
                        <input id="checkInTime" type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={styles.input} />
                      </Field>
                      <Field id="checkOutTime" label="Checkout antes das">
                        <input id="checkOutTime" type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={styles.input} />
                      </Field>
                    </div>
                    <div className={styles.grid2}>
                      <Field id="customMaxGuests" label="Máximo de hóspedes" required error={errorFor("customMaxGuests")}>
                        <input id="customMaxGuests" type="number" inputMode="numeric" min="1" max="50" value={customMaxGuests} onChange={(e) => setCustomMaxGuests(Number(e.target.value))} onBlur={() => touch("customMaxGuests")} className={styles.input} {...describe("customMaxGuests", errorFor("customMaxGuests"))} />
                      </Field>
                      <Field id="minimumNights" label="Estadia mínima (noites)" required error={errorFor("minimumNights")}>
                        <input id="minimumNights" type="number" inputMode="numeric" min="1" value={minimumNights} onChange={(e) => setMinimumNights(e.target.value)} onBlur={() => touch("minimumNights")} className={styles.input} {...describe("minimumNights", errorFor("minimumNights"))} />
                      </Field>
                    </div>
                    <div id="charges" tabIndex={-1} className={styles.grid2}>
                      {moneyInput({ id: "cleaningFee", label: "Taxa de limpeza (R$)", value: cleaningFee, onChange: setCleaningFee, suffix: " por estadia" })}
                    </div>
                    <FieldError id="charges-error" message={errorFor("charges")} />
                  </div>
                </Card>

                <Card icon={ShieldCheck} title="Regras da acomodação" subtitle="O que é permitido durante a estadia.">
                  <div className={styles.fields}>
                    <div className={styles.toggles}>
                      <Toggle checked={allowPetsDaily} onChange={setAllowPetsDaily} label="Animais de estimação permitidos" />
                      <Toggle checked={allowSmoking} onChange={setAllowSmoking} label="Permitido fumar" />
                      <Toggle checked={allowParties} onChange={setAllowParties} label="Eventos / festas permitidos" />
                    </div>
                    <div className={styles.grid2}>
                      <Field id="quietHours" label="Horário de silêncio">
                        <input id="quietHours" type="text" placeholder="Ex.: 22:00 às 08:00" value={quietHours} onChange={(e) => setQuietHours(e.target.value)} className={styles.input} />
                      </Field>
                      <Field id="customNotes" label="Observação adicional" optional>
                        <input id="customNotes" type="text" placeholder="Ex.: Retirar os sapatos na entrada" value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} className={styles.input} />
                      </Field>
                    </div>
                  </div>
                </Card>

                <Card icon={ShieldCheck} title="Segurança & Proteção" subtitle="Responda para cada item — essa informação aparece para os hóspedes.">
                  <div className={styles.fields}>
                    <div id="safety" role="group" aria-label="Itens de segurança" aria-describedby={safetyError ? "safety-error" : undefined} tabIndex={-1} className={styles.safetyGrid}>
                      {safetyItems.map((item) => (
                        <YesNo key={item.id} id={item.id} label={item.label} value={item.value} onChange={item.set} invalid={!!safetyError && item.value === null} />
                      ))}
                    </div>
                    <FieldError id="safety-error" message={safetyError} />
                  </div>
                </Card>

                <Card icon={FileText} title="Política de cancelamento">
                  <div className={styles.choices}>
                    <ChoiceCard active={cancellationPolicy === "FLEXIBLE"} onClick={() => setCancellationPolicy("FLEXIBLE")} title="Flexível" subtitle="Reembolso total até 48h antes do check-in." />
                    <ChoiceCard active={cancellationPolicy === "MODERATE"} onClick={() => setCancellationPolicy("MODERATE")} title="Moderada" subtitle="Reembolso total até 5 dias antes do check-in." />
                    <ChoiceCard active={cancellationPolicy === "STRICT"} onClick={() => setCancellationPolicy("STRICT")} title="Rigorosa" subtitle="50% de reembolso até 7 dias antes do check-in." />
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── ETAPA 5: ATENDIMENTO/CRM (só organização) ── */}
        {activeStep === 5 && isOrg && (
          <div key="step-5" className={styles.stepEnter}>
            <Card icon={Users} title="Atendimento de leads" subtitle="Quem recebe os contatos gerados por este imóvel?">
              <div className={styles.choices}>
                <ChoiceCard active={!hasSpecificAgent} onClick={() => setHasSpecificAgent(false)} title="Distribuição da imobiliária" subtitle="Segue as regras de distribuição da organização" />
                <ChoiceCard active={hasSpecificAgent} disabled={!canPickAgent} onClick={() => setHasSpecificAgent(true)} title="Responsável por este imóvel" subtitle={canPickAgent ? "Escolha uma pessoa específica da equipe" : "Disponível para dono ou administrador da imobiliária"} />
              </div>

              {hasSpecificAgent && (
                <div style={{ marginTop: 16 }}>
                  <Field id="assignedAgentSelect" label="Responsável">
                    <select id="assignedAgentSelect" disabled={!canPickAgent} value={assignedAgentId} onChange={(e) => setAssignedAgentId(e.target.value)} className={styles.input}>
                      <option value="">Selecione…</option>
                      {activeMembers.map((m) => (
                        <option key={m.id} value={m.user?.id ?? ""}>{m.user?.name ?? "Membro"} ({m.role})</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {buildingId && (
                <>
                  <hr className={styles.divider} />
                  <Toggle checked={assumeBuildingLeads} onChange={setAssumeBuildingLeads} label="Assumir todos os leads deste empreendimento" />
                </>
              )}
            </Card>
          </div>
        )}

        {/* ── ETAPA 6: FOTOS — sempre montada: o <input type="file"> guarda os arquivos enviados ao publicar ── */}
        <div className={styles.stepEnter} hidden={activeStep !== photosStep}>
          <Card icon={Camera} title="Adicione as fotos" subtitle="Fotos de qualidade atraem mais interessados. A primeira é a capa; use “Usar como capa” ou as setas para reordenar.">
            <MultiImageInput
              key={draftRevision}
              name="images"
              initialFiles={draftFiles}
              error={activeStep === photosStep ? errorFor("photos") : undefined}
              existingPhotos={initialPhotos}
              onFilesChange={(_count, files) => { filesRef.current = files; }}
              onItemsChange={(items) => { setPhotoItems(items); setPreviewIndex(0); }}
            />
          </Card>
        </div>

        {/* ── ETAPA FINAL: REVISÃO + PRÉVIA COM AS FOTOS ENVIADAS ── */}
        {activeStep === reviewStep && (
          <div key="step-review" className={styles.stepEnter}>
            <div className={styles.review}>
              <section className={styles.preview} aria-label="Prévia do anúncio">
                <div className={styles.previewBar}>
                  <span><Eye size={15} aria-hidden="true" />Prévia do anúncio</span>
                  <span>{photos.length > 0 ? `${photos.length} foto(s) selecionada(s)` : "Sem fotos"}</span>
                </div>

                <div className={styles.gallery}>
                  {shownPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={shownPhoto.url} src={shownPhoto.url} alt={`Foto ${previewIndex + 1} do anúncio${previewIndex === 0 ? " (capa)" : ""}`} />
                  ) : (
                    <div className={styles.galleryEmpty}>
                      <ImagePlus size={32} aria-hidden="true" />
                      <span>Seu anúncio ainda não tem fotos.</span>
                      <button type="button" className={`${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => goTo(photosStep)}>Adicionar fotos</button>
                    </div>
                  )}
                  <span className={styles.badge}>{MODALITY_BADGE[modality]}</span>
                  {photos.length > 1 && (
                    <>
                      <button type="button" className={`${styles.galleryNav} ${styles.galleryPrev}`} onClick={() => setPreviewIndex((i) => (i - 1 + photos.length) % photos.length)} aria-label="Foto anterior">
                        <ChevronLeft size={18} />
                      </button>
                      <button type="button" className={`${styles.galleryNav} ${styles.galleryNext}`} onClick={() => setPreviewIndex((i) => (i + 1) % photos.length)} aria-label="Próxima foto">
                        <ChevronRight size={18} />
                      </button>
                      <span className={styles.galleryCount}>{previewIndex + 1}/{photos.length}</span>
                    </>
                  )}
                </div>

                {photos.length > 1 && (
                  <div className={styles.thumbs}>
                    {photos.map((photo, index) => (
                      <button key={photo.url} type="button" className={`${styles.thumbBtn} ${index === previewIndex ? styles.thumbActive : ""}`} onClick={() => setPreviewIndex(index)} aria-label={`Ver foto ${index + 1}`} aria-pressed={index === previewIndex}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="" />
                      </button>
                    ))}
                  </div>
                )}

                <div className={styles.previewBody}>
                  <p className={styles.previewPrice}>{priceLabel ? <>{priceLabel}<small> {PERIOD[modality]}</small></> : <span className={styles.placeholder}>Preço não informado</span>}</p>
                  <p className={styles.previewTitle}>{name.trim() || <span className={styles.placeholder}>Título não informado</span>}</p>
                  <p className={styles.previewLoc}><MapPin size={15} aria-hidden="true" />{locationLabel ?? <span className={styles.placeholder}>Localização não informada</span>}</p>
                  <div className={styles.chips}>
                    <span className={styles.chip}>{type === "casa" ? <Home size={14} aria-hidden="true" /> : <Building2 size={14} aria-hidden="true" />}{type === "casa" ? "Casa" : "Apartamento"}</span>
                    <span className={styles.chip}><BedDouble size={14} aria-hidden="true" />{plural(bedrooms, "quarto", "quartos")}</span>
                    <span className={styles.chip}><Bath size={14} aria-hidden="true" />{plural(bathrooms, "banheiro", "banheiros")}</span>
                    <span className={styles.chip}><Car size={14} aria-hidden="true" />{plural(parking, "vaga", "vagas")}</span>
                    {privateArea && Number(privateArea) > 0 && <span className={styles.chip}><Ruler size={14} aria-hidden="true" />{privateArea} m²</span>}
                    {modality === "diaria" && <span className={styles.chip}><Users size={14} aria-hidden="true" />até {plural(customMaxGuests, "hóspede", "hóspedes")}</span>}
                  </div>
                  {visibleAmenities.length > 0 && (
                    <div className={styles.chips}>
                      {visibleAmenities.map((id) => <span key={id} className={styles.chip}><Check size={13} aria-hidden="true" />{AMENITY_LABELS.get(id) ?? id}</span>)}
                    </div>
                  )}
                  {description.trim() && <p className={styles.previewDesc}>{description}</p>}
                </div>
              </section>

              <div className={styles.side}>
                {pending ? (
                  <p className={styles.publishing} role="status">
                    <LoaderCircle size={18} className={styles.spin} aria-hidden="true" />
                    {isEdit ? "Salvando as alterações. Aguarde a confirmação." : "Enviando fotos e dados do imóvel. Aguarde a confirmação."}
                  </p>
                ) : pendingIssues.length > 0 ? (
                  <div className={styles.summary} role="status">
                    <CircleAlert size={20} aria-hidden="true" />
                    <div>
                      <p className={styles.summaryTitle}>{isEdit ? "Pendências para salvar" : "Pendências para publicar"}</p>
                      <ul className={styles.summaryList}>
                        {pendingIssues.map((issue) => (
                          <li key={issue.field + issue.message}>
                            <button type="button" className={styles.linkButton} onClick={() => jumpToIssue(issue)}>
                              {issue.message}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className={styles.ready}>
                    <CheckCircle2 size={20} aria-hidden="true" />
                    <div>
                      <p className={styles.readyTitle}>{isEdit ? "Tudo pronto para salvar" : "Tudo pronto para publicar"}</p>
                      <p>Confira a prévia e toque em “{isEdit ? "Salvar alterações" : "Publicar anúncio"}”.</p>
                    </div>
                  </div>
                )}

                <dl className={styles.summaryCard}>
                  <div className={styles.summaryItem}>
                    <dt className={styles.summaryHead}>Modalidade e apresentação <button type="button" className={styles.editBtn} onClick={() => goTo(1)}><Pencil size={13} aria-hidden="true" />Editar</button></dt>
                    <dd className={styles.summaryValue}>{modality === "venda" ? "Venda" : modality === "mensal" ? "Aluguel mensal" : "Temporada"} · {type === "casa" ? "Casa" : "Apartamento"} · {name || "Título não informado"}</dd>
                  </div>
                  <div className={styles.summaryItem}>
                    <dt className={styles.summaryHead}>Características <button type="button" className={styles.editBtn} onClick={() => goTo(2)}><Pencil size={13} aria-hidden="true" />Editar</button></dt>
                    <dd className={styles.summaryValue}>
                      {structureConfirmed ? `${plural(bedrooms, "quarto", "quartos")}, ${plural(suites, "suíte", "suítes")}, ${plural(bathrooms, "banheiro", "banheiros")} e ${plural(parking, "vaga", "vagas")}` : "Quantidades não confirmadas"}.
                      {" "}Área privativa: {privateArea ? `${privateArea} m²` : "não informada"}; total: {totalArea ? `${totalArea} m²` : "não informada"}. {isFurnished ? "Mobiliado." : "Sem mobília informada."}
                      {" "}Comodidades: {visibleAmenities.map((id) => AMENITY_LABELS.get(id) ?? id).join(", ") || "nenhuma marcada"}.
                    </dd>
                  </div>
                  <div className={styles.summaryItem}>
                    <dt className={styles.summaryHead}>Localização <button type="button" className={styles.editBtn} onClick={() => goTo(3)}><Pencil size={13} aria-hidden="true" />Editar</button></dt>
                    <dd className={styles.summaryValue}>{[[logradouro, numero].filter(Boolean).join(", "), complemento, bairro, [cidade, uf].filter(Boolean).join(" - "), cep].filter(Boolean).join(" · ") || "Não informada"}</dd>
                  </div>
                  <div className={styles.summaryItem}>
                    <dt className={styles.summaryHead}>Valores e regras <button type="button" className={styles.editBtn} onClick={() => goTo(4)}><Pencil size={13} aria-hidden="true" />Editar</button></dt>
                    <dd className={styles.summaryValue}>
                      Preço: {priceLabel ? `${priceLabel}${PERIOD[modality] ? ` ${PERIOD[modality]}` : ""}` : "não informado"}. Negociação: {acceptsNegotiation ? "aceita" : "não aceita"}.
                      {modality === "venda" && <> Condomínio: {condoFee ? formatBRL(condoFee) : "não informado"}; IPTU anual: {iptuAnnual ? formatBRL(iptuAnnual) : "não informado"}; financiamento: {acceptsFinancing ? "sim" : "não"}; permuta: {acceptsExchange ? "sim" : "não"}.</>}
                      {modality === "mensal" && <> Condomínio: {condoFee ? formatBRL(condoFee) : "não informado"}; IPTU mensal: {iptuMonthly ? formatBRL(iptuMonthly) : "não informado"}; disponível a partir de: {availableFrom ? new Date(`${availableFrom}T12:00:00`).toLocaleDateString("pt-BR") : "não informado"}; prazo mínimo: {minimumLeaseMonths ? `${minimumLeaseMonths} meses` : "não informado"}; garantias: {guaranteeTypes.map((g) => GUARANTEE_OPTIONS.find((o) => o.value === g)?.label ?? g).join(", ") || "não informadas"}; pets: {allowPetsMonthly ? "permitidos" : "não permitidos"}.</>}
                      {modality === "diaria" && <> Até {plural(customMaxGuests, "hóspede", "hóspedes")}; mínimo de {plural(Number(minimumNights) || 0, "noite", "noites")}; limpeza: {cleaningFee ? formatBRL(cleaningFee) : "não informada"}; check-in {checkInTime}, checkout {checkOutTime}; pets {allowPetsDaily ? "permitidos" : "não permitidos"}; fumar {allowSmoking ? "permitido" : "não permitido"}; festas {allowParties ? "permitidas" : "não permitidas"}; silêncio: {quietHours}{customNotes ? `; ${customNotes}` : ""}. Cancelamento: {CANCELLATION_LABELS[cancellationPolicy]}. Segurança: {safetyItems.map((item) => `${item.label.toLowerCase()} ${item.value === null ? "não informado" : item.value ? "possui" : "não possui"}`).join("; ")}.</>}
                    </dd>
                  </div>
                  <div className={styles.summaryItem}>
                    <dt className={styles.summaryHead}>Fotos <button type="button" className={styles.editBtn} onClick={() => goTo(photosStep)}><Pencil size={13} aria-hidden="true" />Editar</button></dt>
                    <dd className={styles.summaryValue}>{imageCount > 0 ? `${imageCount} foto(s) selecionada(s). A primeira é a capa.` : "Nenhuma foto adicionada."}</dd>
                  </div>
                </dl>

                {isEdit && modality !== initialModality && (
                  <p className={styles.modalityWarning}><TriangleAlert size={16} aria-hidden="true" /><span>A modalidade mudou de {MODALITY_BADGE[initialModality].toLowerCase()} para {MODALITY_BADGE[modality].toLowerCase()}: as condições exclusivas da anterior serão removidas.</span></p>
                )}
                {isEdit && photosChanged && (
                  <p className={styles.note}>As fotos foram alteradas e serão atualizadas ao salvar.</p>
                )}
                <p className={styles.note} hidden={isEdit}>
                  {isOrg ? "O anúncio será enviado para aprovação da própria imobiliária antes de aparecer na busca." : "Após a validação dos campos, seu anúncio será publicado diretamente, sem aprovação editorial prévia."} A verificação da imobiliária é independente e não garante a autenticidade do imóvel.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BARRA FIXA DE NAVEGAÇÃO INFERIOR ── */}
      <div ref={footerRef} className={styles.footer}>
        {draftMessage && <p className={styles.footerStatus} role="status">{draftMessage}</p>}
        <div className={styles.footerInner}>
          {stepIndex > 0 && (
            <button type="button" onClick={handlePrev} className={styles.btnSecondary}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Voltar</span>
            </button>
          )}

          <div className={styles.footerRight}>
            <button type="button" className={styles.btnSecondary} onClick={() => openSidebar()} aria-label="Abrir Mensagens" title="Mensagens">
              <MessageCircle size={16} aria-hidden="true" /><span className={styles.hideSm}>Mensagens{unreadCount > 0 ? ` (${unreadCount})` : ""}</span>
            </button>
            {!isEdit && (
              <button type="button" className={styles.btnSecondary} disabled={pending || savingDraft} onClick={saveDraft} title="Salvar rascunho">
                {savingDraft ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                <span className={styles.hideSm}>{savingDraft ? "Salvando…" : "Salvar rascunho"}</span>
              </button>
            )}
            {isEdit ? (
              <>
                {!isLastStep && (
                  <button type="button" onClick={validateAndNext} className={styles.btnSecondary} title="Próxima etapa">
                    <span className={styles.hideSm}>Continuar</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
                <button type="submit" name="intent" value="publish" className={styles.btnPrimary} disabled={pending}>
                  {pending ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                  <span>{pending ? "Salvando…" : "Salvar alterações"}</span>
                </button>
              </>
            ) : !isLastStep ? (
              <button type="button" onClick={validateAndNext} className={styles.btnPrimary}>
                <span>Continuar</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" name="intent" value="publish" className={styles.btnPrimary} disabled={pending}>
                {pending ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                <span>{pending ? "Publicando…" : "Publicar anúncio"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
