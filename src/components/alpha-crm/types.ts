export type ClientStatus = "ACTIVE" | "AT_RISK" | "LAPSED" | "CANCELLED";

export type ClientTab = "active" | "cancelled" | "lapsed";

export type FollowUpOutcome =
  | "no_answer"
  | "voicemail"
  | "spoke"
  | "texted_no_reply"
  | "texted_replied"
  | "emailed"
  | "reinstated"
  | "not_interested";

export type InteractionType =
  | "Call"
  | "Text"
  | "Email"
  | "Walk-in"
  | "Retell AI";

export type InteractionDirection = "Inbound" | "Outbound";

export type QuoteType = "new" | "renewal" | "cross_sell" | "winback";

export type PipelineStatus = "open" | "quoted" | "won" | "lost";

export type Urgency = "hot" | "warm" | "cold";

export type FollowUpType =
  | "renewal"
  | "reactivation"
  | "cross_sell"
  | "payment"
  | "general";

export type FollowUpPriority = "urgent" | "high" | "normal" | "low";

export interface Client {
  id: string;
  tab: ClientTab | null;
  name: string;
  policy_number: string | null;
  carrier: string | null;
  product: string | null;
  status: ClientStatus;
  phone: string | null;
  email: string | null;
  dob: string | null;
  policy_start: string | null;
  policy_end: string | null;
  premium: string | null;
  last_contact: string | null;
  sequence_stage: string | null;
  opt_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactLog {
  id: string;
  client_id: string;
  interaction_type: InteractionType;
  direction: InteractionDirection;
  outcome: FollowUpOutcome | null;
  notes: string | null;
  logged_by: string;
  created_at: string;
}

export interface Carrier {
  id: string;
  carrier_name: string;
  carrier_code: string | null;
  portal_url: string | null;
  commission_rate: number | null;
  products_offered: string[] | null;
  am_contact_name: string | null;
  am_contact_phone: string | null;
  am_contact_email: string | null;
  active: boolean;
  created_at: string;
}

export interface PipelineRecord {
  id: string;
  client_id: string | null;
  lead_id: string | null;
  quote_type: QuoteType;
  estimated_premium: number | null;
  current_carrier: string | null;
  desired_coverage: string | null;
  urgency: Urgency;
  assigned_to: string | null;
  calendly_booked: boolean;
  status: PipelineStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

export interface FollowUp {
  id: string;
  client_id: string;
  follow_up_type: FollowUpType;
  scheduled_date: string;
  outcome: FollowUpOutcome | null;
  priority: FollowUpPriority;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  client_name?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

export const OUTCOME_NEXT_DAY_OFFSETS: Record<FollowUpOutcome, number> = {
  no_answer: 3,
  voicemail: 5,
  spoke: 14,
  texted_no_reply: 4,
  texted_replied: 2,
  emailed: 7,
  reinstated: 30,
  not_interested: 90,
};

export function nextFollowUpDate(outcome: FollowUpOutcome): Date {
  const days = OUTCOME_NEXT_DAY_OFFSETS[outcome];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export const STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Active",
  AT_RISK: "At Risk",
  LAPSED: "Lapsed",
  CANCELLED: "Cancelled",
};

export const OUTCOME_LABELS: Record<FollowUpOutcome, string> = {
  no_answer: "No Answer",
  voicemail: "Voicemail",
  spoke: "Spoke",
  texted_no_reply: "Texted No Reply",
  texted_replied: "Texted Replied",
  emailed: "Emailed",
  reinstated: "Reinstated",
  not_interested: "Not Interested",
};

export const QUOTE_TYPE_LABELS: Record<QuoteType, string> = {
  new: "New Business",
  renewal: "Renewal",
  cross_sell: "Cross-Sell",
  winback: "Winback",
};

export const STATUS_COLORS: Record<ClientStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  AT_RISK: "bg-amber-100 text-amber-800 border-amber-200",
  LAPSED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
};

export const URGENCY_COLORS: Record<Urgency, string> = {
  hot: "bg-red-100 text-red-800",
  warm: "bg-amber-100 text-amber-800",
  cold: "bg-blue-100 text-blue-800",
};

export const PRIORITY_COLORS: Record<FollowUpPriority, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-amber-100 text-amber-800",
  normal: "bg-gray-100 text-gray-700",
  low: "bg-blue-50 text-blue-700",
};
