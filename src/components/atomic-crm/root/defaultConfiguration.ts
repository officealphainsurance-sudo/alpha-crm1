import type { ConfigurationContextValue } from "./ConfigurationContext";

export const defaultDarkModeLogo = "./logos/logo_alpha_insurance.svg";
export const defaultLightModeLogo = "./logos/logo_alpha_light.svg";

export const defaultCurrency = "USD";

export const defaultTitle = "Alpha Insurance";

export const defaultCompanySectors = [
  { value: "auto", label: "Auto" },
  { value: "home", label: "Home" },
  { value: "life", label: "Life" },
  { value: "burial", label: "Burial" },
  { value: "health", label: "Health" },
  { value: "renters", label: "Renters" },
  { value: "umbrella", label: "Umbrella" },
  { value: "commercial", label: "Commercial" },
];

export const defaultDealStages = [
  { value: "open", label: "Open" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const defaultDealPipelineStatuses = ["won"];

export const defaultDealCategories = [
  { value: "new", label: "New Business" },
  { value: "renewal", label: "Renewal" },
  { value: "cross_sell", label: "Cross-Sell" },
  { value: "winback", label: "Winback" },
];

export const defaultNoteStatuses = [
  { value: "no_answer", label: "No Answer", color: "#6B7280" },
  { value: "voicemail", label: "Voicemail", color: "#2563EB" },
  { value: "spoke", label: "Spoke", color: "#059669" },
  { value: "texted_no_reply", label: "Texted No Reply", color: "#D97706" },
  { value: "texted_replied", label: "Texted Replied", color: "#059669" },
  { value: "emailed", label: "Emailed", color: "#2563EB" },
  { value: "reinstated", label: "Reinstated", color: "#059669" },
  { value: "not_interested", label: "Not Interested", color: "#DC2626" },
];

export const defaultTaskTypes = [
  { value: "renewal", label: "Renewal Follow-Up" },
  { value: "reactivation", label: "Reactivation" },
  { value: "cross_sell", label: "Cross-Sell" },
  { value: "payment", label: "Payment Issue" },
  { value: "general", label: "General" },
];

export const defaultConfiguration: ConfigurationContextValue = {
  companySectors: defaultCompanySectors,
  currency: defaultCurrency,
  dealCategories: defaultDealCategories,
  dealPipelineStatuses: defaultDealPipelineStatuses,
  dealStages: defaultDealStages,
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
};
