// Ícones do Zhivago — Phosphor (https://phosphoricons.com), estilo pensado para interfaces de sistema.
// Módulo central: o código importa daqui com os nomes de sempre e cada um aponta para o ícone Phosphor
// equivalente. Para trocar um ícone, mude só a linha dele aqui. Gerado na migração Lucide/Iconoir → Phosphor.
import type { ComponentProps } from "react";
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import {
  ArrowCounterClockwise as PhArrowCounterClockwise,
  ArrowDown as PhArrowDown,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise as PhArrowsClockwise,
  ArrowsOut as PhArrowsOut,
  Bank as PhBank,
  Barbell as PhBarbell,
  Bathtub as PhBathtub,
  Bed as PhBed,
  Bell as PhBell,
  Briefcase as PhBriefcase,
  BuildingOffice as PhBuildingOffice,
  Buildings as PhBuildings,
  Calculator as PhCalculator,
  CalendarBlank as PhCalendarBlank,
  CalendarDots as PhCalendarDots,
  Camera as PhCamera,
  Car as PhCar,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  ChartBar as PhChartBar,
  ChartLineUp as PhChartLineUp,
  ChatCircle as PhChatCircle,
  ChatCircleText as PhChatCircleText,
  ChatText as PhChatText,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  Checks as PhChecks,
  Cigarette as PhCigarette,
  CircleNotch as PhCircleNotch,
  ClipboardText as PhClipboardText,
  Clock as PhClock,
  ClockCounterClockwise as PhClockCounterClockwise,
  Coffee as PhCoffee,
  Compass as PhCompass,
  CookingPot as PhCookingPot,
  Copy as PhCopy,
  Couch as PhCouch,
  CurrencyDollar as PhCurrencyDollar,
  Dog as PhDog,
  Door as PhDoor,
  DotsThree as PhDotsThree,
  DownloadSimple as PhDownloadSimple,
  Drop as PhDrop,
  EnvelopeSimple as PhEnvelopeSimple,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  FileText as PhFileText,
  Fire as PhFire,
  Flag as PhFlag,
  FloppyDisk as PhFloppyDisk,
  FunnelSimple as PhFunnelSimple,
  GearSix as PhGearSix,
  GridFour as PhGridFour,
  Handshake as PhHandshake,
  Hash as PhHash,
  Heart as PhHeart,
  House as PhHouse,
  ImageSquare as PhImageSquare,
  Images as PhImages,
  Info as PhInfo,
  Kanban as PhKanban,
  Key as PhKey,
  Lightbulb as PhLightbulb,
  List as PhList,
  ListBullets as PhListBullets,
  Lock as PhLock,
  LockOpen as PhLockOpen,
  MagnifyingGlass as PhMagnifyingGlass,
  MagnifyingGlassMinus as PhMagnifyingGlassMinus,
  MagnifyingGlassPlus as PhMagnifyingGlassPlus,
  MapPin as PhMapPin,
  Minus as PhMinus,
  NavigationArrow as PhNavigationArrow,
  PaperPlaneRight as PhPaperPlaneRight,
  Pause as PhPause,
  PencilSimple as PhPencilSimple,
  PencilSimpleLine as PhPencilSimpleLine,
  Percent as PhPercent,
  Phone as PhPhone,
  Play as PhPlay,
  Plus as PhPlus,
  Prohibit as PhProhibit,
  Receipt as PhReceipt,
  Repeat as PhRepeat,
  Ruler as PhRuler,
  SealCheck as PhSealCheck,
  ShareNetwork as PhShareNetwork,
  Shield as PhShield,
  ShieldCheck as PhShieldCheck,
  ShieldWarning as PhShieldWarning,
  Shower as PhShower,
  Shuffle as PhShuffle,
  SignOut as PhSignOut,
  SlidersHorizontal as PhSlidersHorizontal,
  Sparkle as PhSparkle,
  SpeakerSlash as PhSpeakerSlash,
  SquaresFour as PhSquaresFour,
  Stack as PhStack,
  Star as PhStar,
  Storefront as PhStorefront,
  Sun as PhSun,
  TShirt as PhTShirt,
  Tag as PhTag,
  Television as PhTelevision,
  Timer as PhTimer,
  Trash as PhTrash,
  TrendUp as PhTrendUp,
  UploadSimple as PhUploadSimple,
  User as PhUser,
  UserCheck as PhUserCheck,
  UserCircleDashed as PhUserCircleDashed,
  UserMinus as PhUserMinus,
  UserPlus as PhUserPlus,
  Users as PhUsers,
  UsersThree as PhUsersThree,
  Wallet as PhWallet,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  WifiHigh as PhWifiHigh,
  WifiSlash as PhWifiSlash,
  Wind as PhWind,
  X as PhX,
  XCircle as PhXCircle,
} from "@phosphor-icons/react/ssr";

export type IconProps = Omit<ComponentProps<"svg">, "ref" | "fill"> & {
  size?: number | string;
  strokeWidth?: number | string;
  /** Compatibilidade: qualquer cor diferente de "none" desenha o ícone preenchido. */
  fill?: string;
  weight?: IconWeight;
  color?: string;
  mirrored?: boolean;
};

/**
 * Adapta as props antigas (Lucide: size/strokeWidth/fill; Iconoir: width/height) para a Phosphor:
 * tamanho padrão 24px, traço grosso (≥ 2.2) vira peso "bold", `fill` vira peso "fill".
 */
function icon(Base: PhosphorIcon, name: string) {
  function ZhivagoIcon({ size, width, height, strokeWidth, fill, weight, color, ...rest }: IconProps) {
    const filled = fill !== undefined && fill !== "none";
    const resolvedWeight: IconWeight = weight ?? (filled ? "fill" : Number(strokeWidth) >= 2.2 ? "bold" : "regular");
    return <Base size={size ?? width ?? height ?? 24} weight={resolvedWeight} color={color ?? (filled ? fill : undefined)} {...rest} />;
  }
  ZhivagoIcon.displayName = name;
  return ZhivagoIcon;
}

export const AlertCircle = icon(PhWarningCircle, "AlertCircle");
export const AlertTriangle = icon(PhWarning, "AlertTriangle");
export const ArrowDown = icon(PhArrowDown, "ArrowDown");
export const ArrowLeft = icon(PhArrowLeft, "ArrowLeft");
export const ArrowRight = icon(PhArrowRight, "ArrowRight");
export const ArrowUpRight = icon(PhArrowUpRight, "ArrowUpRight");
export const BadgeCheck = icon(PhSealCheck, "BadgeCheck");
export const Ban = icon(PhProhibit, "Ban");
export const BarChart3 = icon(PhChartBar, "BarChart3");
export const Bath = icon(PhBathtub, "Bath");
export const BedDouble = icon(PhBed, "BedDouble");
export const Bell = icon(PhBell, "Bell");
export const Briefcase = icon(PhBriefcase, "Briefcase");
export const Building = icon(PhBuildingOffice, "Building");
export const Building2 = icon(PhBuildings, "Building2");
export const Calculator = icon(PhCalculator, "Calculator");
export const Calendar = icon(PhCalendarBlank, "Calendar");
export const CalendarClock = icon(PhCalendarDots, "CalendarClock");
export const CalendarDays = icon(PhCalendarDots, "CalendarDays");
export const CalendarRange = icon(PhCalendarBlank, "CalendarRange");
export const Camera = icon(PhCamera, "Camera");
export const Car = icon(PhCar, "Car");
export const ChatBubble = icon(PhChatCircleText, "ChatBubble");
export const Check = icon(PhCheck, "Check");
export const CheckCheck = icon(PhChecks, "CheckCheck");
export const CheckCircle = icon(PhCheckCircle, "CheckCircle");
export const CheckCircle2 = icon(PhCheckCircle, "CheckCircle2");
export const ChefHat = icon(PhCookingPot, "ChefHat");
export const ChevronDown = icon(PhCaretDown, "ChevronDown");
export const ChevronLeft = icon(PhCaretLeft, "ChevronLeft");
export const ChevronRight = icon(PhCaretRight, "ChevronRight");
export const ChevronUp = icon(PhCaretUp, "ChevronUp");
export const Cigarette = icon(PhCigarette, "Cigarette");
export const CircleAlert = icon(PhWarningCircle, "CircleAlert");
export const CircleCheck = icon(PhCheckCircle, "CircleCheck");
export const ClipboardCheck = icon(PhClipboardText, "ClipboardCheck");
export const Clock = icon(PhClock, "Clock");
export const Coffee = icon(PhCoffee, "Coffee");
export const Compass = icon(PhCompass, "Compass");
export const Copy = icon(PhCopy, "Copy");
export const Dog = icon(PhDog, "Dog");
export const DollarSign = icon(PhCurrencyDollar, "DollarSign");
export const DoorClosed = icon(PhDoor, "DoorClosed");
export const Download = icon(PhDownloadSimple, "Download");
export const Droplet = icon(PhDrop, "Droplet");
export const Dumbbell = icon(PhBarbell, "Dumbbell");
export const Edit3 = icon(PhPencilSimpleLine, "Edit3");
export const EditPencil = icon(PhPencilSimple, "EditPencil");
export const ExternalLink = icon(PhArrowSquareOut, "ExternalLink");
export const Eye = icon(PhEye, "Eye");
export const EyeOff = icon(PhEyeSlash, "EyeOff");
export const FileClock = icon(PhClockCounterClockwise, "FileClock");
export const FileText = icon(PhFileText, "FileText");
export const Filter = icon(PhFunnelSimple, "Filter");
export const Flag = icon(PhFlag, "Flag");
export const Flame = icon(PhFire, "Flame");
export const FloppyDisk = icon(PhFloppyDisk, "FloppyDisk");
export const GraphUp = icon(PhChartLineUp, "GraphUp");
export const Group = icon(PhUsersThree, "Group");
export const Handshake = icon(PhHandshake, "Handshake");
export const Hash = icon(PhHash, "Hash");
export const Heart = icon(PhHeart, "Heart");
export const Home = icon(PhHouse, "Home");
export const HomeSimple = icon(PhHouse, "HomeSimple");
export const House = icon(PhHouse, "House");
export const ImagePlus = icon(PhImageSquare, "ImagePlus");
export const Images = icon(PhImages, "Images");
export const Info = icon(PhInfo, "Info");
export const InfoCircle = icon(PhInfo, "InfoCircle");
export const Kanban = icon(PhKanban, "Kanban");
export const KeyRound = icon(PhKey, "KeyRound");
export const Landmark = icon(PhBank, "Landmark");
export const Layers = icon(PhStack, "Layers");
export const LayoutDashboard = icon(PhSquaresFour, "LayoutDashboard");
export const LayoutGrid = icon(PhGridFour, "LayoutGrid");
export const Lightbulb = icon(PhLightbulb, "Lightbulb");
export const List = icon(PhListBullets, "List");
export const LoaderCircle = icon(PhCircleNotch, "LoaderCircle");
export const Lock = icon(PhLock, "Lock");
export const LogOut = icon(PhSignOut, "LogOut");
export const Mail = icon(PhEnvelopeSimple, "Mail");
export const MapPin = icon(PhMapPin, "MapPin");
export const Maximize2 = icon(PhArrowsOut, "Maximize2");
export const MediaImagePlus = icon(PhImageSquare, "MediaImagePlus");
export const Menu = icon(PhList, "Menu");
export const MessageCircle = icon(PhChatCircle, "MessageCircle");
export const MessageSquare = icon(PhChatText, "MessageSquare");
export const Minus = icon(PhMinus, "Minus");
export const MoreHoriz = icon(PhDotsThree, "MoreHoriz");
export const MoreHorizontal = icon(PhDotsThree, "MoreHorizontal");
export const NavArrowLeft = icon(PhCaretLeft, "NavArrowLeft");
export const NavArrowRight = icon(PhCaretRight, "NavArrowRight");
export const Navigation = icon(PhNavigationArrow, "Navigation");
export const OpenNewWindow = icon(PhArrowSquareOut, "OpenNewWindow");
export const Pause = icon(PhPause, "Pause");
export const Pencil = icon(PhPencilSimple, "Pencil");
export const Percent = icon(PhPercent, "Percent");
export const Percentage = icon(PhPercent, "Percentage");
export const Phone = icon(PhPhone, "Phone");
export const Play = icon(PhPlay, "Play");
export const Plus = icon(PhPlus, "Plus");
export const Receipt = icon(PhReceipt, "Receipt");
export const RefreshCw = icon(PhArrowsClockwise, "RefreshCw");
export const Repeat = icon(PhRepeat, "Repeat");
export const RotateCcw = icon(PhArrowCounterClockwise, "RotateCcw");
export const Ruler = icon(PhRuler, "Ruler");
export const Save = icon(PhFloppyDisk, "Save");
export const Search = icon(PhMagnifyingGlass, "Search");
export const Send = icon(PhPaperPlaneRight, "Send");
export const Settings = icon(PhGearSix, "Settings");
export const Share2 = icon(PhShareNetwork, "Share2");
export const Shield = icon(PhShield, "Shield");
export const ShieldAlert = icon(PhShieldWarning, "ShieldAlert");
export const ShieldCheck = icon(PhShieldCheck, "ShieldCheck");
export const Shirt = icon(PhTShirt, "Shirt");
export const ShowerHead = icon(PhShower, "ShowerHead");
export const Shuffle = icon(PhShuffle, "Shuffle");
export const SlidersHorizontal = icon(PhSlidersHorizontal, "SlidersHorizontal");
export const Sofa = icon(PhCouch, "Sofa");
export const Sparkles = icon(PhSparkle, "Sparkles");
export const Sparks = icon(PhSparkle, "Sparks");
export const Star = icon(PhStar, "Star");
export const Store = icon(PhStorefront, "Store");
export const Sun = icon(PhSun, "Sun");
export const Tag = icon(PhTag, "Tag");
export const Timer = icon(PhTimer, "Timer");
export const Trash = icon(PhTrash, "Trash");
export const Trash2 = icon(PhTrash, "Trash2");
export const TrendingUp = icon(PhTrendUp, "TrendingUp");
export const TriangleAlert = icon(PhWarning, "TriangleAlert");
export const Tv = icon(PhTelevision, "Tv");
export const Unlock = icon(PhLockOpen, "Unlock");
export const Upload = icon(PhUploadSimple, "Upload");
export const User = icon(PhUser, "User");
export const UserCheck = icon(PhUserCheck, "UserCheck");
export const UserMinus = icon(PhUserMinus, "UserMinus");
export const UserPlus = icon(PhUserPlus, "UserPlus");
export const UserX = icon(PhUserMinus, "UserX");
export const UserXmark = icon(PhUserCircleDashed, "UserXmark");
export const Users = icon(PhUsers, "Users");
export const ViewColumns3 = icon(PhKanban, "ViewColumns3");
export const VolumeX = icon(PhSpeakerSlash, "VolumeX");
export const Wallet = icon(PhWallet, "Wallet");
export const WarningCircle = icon(PhWarningCircle, "WarningCircle");
export const Wifi = icon(PhWifiHigh, "Wifi");
export const WifiOff = icon(PhWifiSlash, "WifiOff");
export const Wind = icon(PhWind, "Wind");
export const X = icon(PhX, "X");
export const XCircle = icon(PhXCircle, "XCircle");
export const Xmark = icon(PhX, "Xmark");
export const ZoomIn = icon(PhMagnifyingGlassPlus, "ZoomIn");
export const ZoomOut = icon(PhMagnifyingGlassMinus, "ZoomOut");
