import { useGetOne, useGetList, useUpdate, useNotify } from "ra-core";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  Clock,
  User,
  MessageSquare,
  ClipboardList,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import type { Client, ContactLog, RawReply, FollowUp } from "../types";
import {
  STATUS_COLORS,
  OUTCOME_LABELS,
  STATUS_LABELS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS,
  PRIORITY_COLORS,
} from "../types";
import {
  formatPhone,
  formatCurrency,
  formatDate,
  formatRelativeDate,
} from "../utils";
import { QueryErrorBanner } from "../QueryError";

interface ClientShowProps {
  id: string | null;
  onClose: () => void;
}

export function ClientShow({ id, onClose }: ClientShowProps) {
  const {
    data: client,
    isPending,
    error: clientError,
  } = useGetOne<Client>("clients", { id: id ?? "" }, { enabled: !!id });

  // Three independent, parallel timeline sources scoped to this client.
  const scoped = {
    filter: { "client_id@eq": id },
    pagination: { page: 1, perPage: 50 },
  };

  const { data: logs, error: logsError } = useGetList<ContactLog>(
    "contact_logs",
    { ...scoped, sort: { field: "created_at", order: "DESC" } },
    { enabled: !!id },
  );

  const { data: replies, error: repliesError } = useGetList<RawReply>(
    "raw_replies",
    { ...scoped, sort: { field: "received_at", order: "DESC" } },
    { enabled: !!id },
  );

  const { data: followUps, error: followUpsError } = useGetList<FollowUp>(
    "follow_ups",
    { ...scoped, sort: { field: "scheduled_date", order: "DESC" } },
    { enabled: !!id },
  );

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {clientError ? (
          <div className="mt-8">
            <QueryErrorBanner error={clientError} label="client" />
          </div>
        ) : isPending || !client ? (
          <div className="space-y-3 mt-8">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <ClientDetail
            client={client}
            logs={logs ?? []}
            replies={replies ?? []}
            followUps={followUps ?? []}
            logsError={logsError}
            repliesError={repliesError}
            followUpsError={followUpsError}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ClientDetail({
  client,
  logs,
  replies,
  followUps,
  logsError,
  repliesError,
  followUpsError,
}: {
  client: Client;
  logs: ContactLog[];
  replies: RawReply[];
  followUps: FollowUp[];
  logsError: unknown;
  repliesError: unknown;
  followUpsError: unknown;
}) {
  const notify = useNotify();
  const [update] = useUpdate();

  const cycleStatus = async () => {
    const cycle: Client["status"][] = [
      "ACTIVE",
      "AT_RISK",
      "LAPSED",
      "CANCELLED",
    ];
    const next = cycle[(cycle.indexOf(client.status) + 1) % cycle.length];
    try {
      await update("clients", {
        id: client.id,
        data: { status: next },
        previousData: client,
      });
      notify(`Status → ${STATUS_LABELS[next]}`, { type: "success" });
    } catch {
      notify("Failed to update status", { type: "error" });
    }
  };

  const timeline = buildTimeline(logs, replies, followUps);
  const timelineErrors = [
    { error: logsError, label: "contact history" },
    { error: repliesError, label: "SMS replies" },
    { error: followUpsError, label: "follow-ups" },
  ].filter((e) => e.error);

  return (
    <>
      <SheetHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <SheetTitle className="text-xl leading-tight">
            {client.name}
          </SheetTitle>
          <Badge
            className={`shrink-0 cursor-pointer border ${STATUS_COLORS[client.status]}`}
            onClick={cycleStatus}
            title="Click to cycle status"
          >
            {STATUS_LABELS[client.status]}
          </Badge>
        </div>
        {client.policy_number && (
          <p className="text-sm text-muted-foreground">
            Policy #{client.policy_number}
          </p>
        )}
      </SheetHeader>

      <div className="mt-4 space-y-5">
        {/* Contact Info */}
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </p>
          <div className="space-y-1.5">
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Phone className="size-3.5 shrink-0" />
                {formatPhone(client.phone)}
              </a>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Mail className="size-3.5 shrink-0" />
                {client.email}
              </a>
            )}
            {client.dob && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="size-3.5 shrink-0" />
                DOB: {formatDate(client.dob)}
              </span>
            )}
          </div>
        </section>

        <Separator />

        {/* Policy Info */}
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Policy
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {client.carrier && (
              <>
                <dt className="text-muted-foreground">Carrier</dt>
                <dd className="font-medium">{client.carrier}</dd>
              </>
            )}
            {client.product && (
              <>
                <dt className="text-muted-foreground">Product</dt>
                <dd>{client.product}</dd>
              </>
            )}
            {client.premium && (
              <>
                <dt className="text-muted-foreground">Premium</dt>
                <dd className="font-medium">
                  {formatCurrency(client.premium)}/mo
                </dd>
              </>
            )}
            {client.policy_start && (
              <>
                <dt className="text-muted-foreground">Effective</dt>
                <dd>{formatDate(client.policy_start)}</dd>
              </>
            )}
            {client.policy_end && (
              <>
                <dt className="text-muted-foreground">Expires</dt>
                <dd
                  className={
                    new Date(client.policy_end) < new Date()
                      ? "text-red-600 font-medium"
                      : ""
                  }
                >
                  {formatDate(client.policy_end)}
                </dd>
              </>
            )}
          </dl>
        </section>

        {/* Quick Actions */}
        <section className="flex gap-2 flex-wrap">
          {client.phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${client.phone}`}>
                <Phone className="size-3.5 mr-1" /> Call
              </a>
            </Button>
          )}
          {client.email && (
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${client.email}`}>
                <Mail className="size-3.5 mr-1" /> Email
              </a>
            </Button>
          )}
          {client.policy_end && (
            <Button size="sm" variant="outline" disabled>
              <Calendar className="size-3.5 mr-1" /> Schedule Follow-Up
            </Button>
          )}
        </section>

        <Separator />

        {/* Timeline — contact logs, inbound replies, and follow-ups merged newest-first */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline
            </p>
          </div>

          {timelineErrors.map(({ error, label }) => (
            <QueryErrorBanner key={label} error={error} label={label} />
          ))}

          {timeline.length === 0 && timelineErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No activity yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {timeline.map((item) => (
                <TimelineRow key={timelineKey(item)} item={item} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

type TimelineItem =
  | { kind: "log"; ts: string; log: ContactLog }
  | { kind: "reply"; ts: string; reply: RawReply }
  | { kind: "followup"; ts: string; followUp: FollowUp };

/** Merge the three sources into one array sorted newest-first by timestamp. */
function buildTimeline(
  logs: ContactLog[],
  replies: RawReply[],
  followUps: FollowUp[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...logs.map((log) => ({ kind: "log" as const, ts: log.created_at, log })),
    ...replies.map((reply) => ({
      kind: "reply" as const,
      ts: reply.received_at,
      reply,
    })),
    ...followUps.map((followUp) => ({
      kind: "followup" as const,
      ts: followUp.completed_at ?? followUp.scheduled_date,
      followUp,
    })),
  ];
  return items.sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  );
}

function timelineKey(item: TimelineItem): string {
  switch (item.kind) {
    case "log":
      return `log-${item.log.id}`;
    case "reply":
      return `reply-${item.reply.id}`;
    case "followup":
      return `followup-${item.followUp.id}`;
  }
}

function DirectionChip({
  direction,
}: {
  direction: "in" | "out" | "scheduled";
}) {
  if (direction === "in") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-700">
        <ArrowDownLeft className="size-3" /> In
      </span>
    );
  }
  if (direction === "out") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-indigo-700">
        <ArrowUpRight className="size-3" /> Out
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
      <Clock className="size-3" /> Scheduled
    </span>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  if (item.kind === "reply") {
    const r = item.reply;
    return (
      <li className="flex gap-3 text-sm">
        <span className="size-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
          <MessageSquare className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">SMS Reply</span>
            <DirectionChip direction="in" />
            {r.classification && (
              <Badge
                className={`text-xs border ${CLASSIFICATION_COLORS[r.classification]}`}
              >
                {CLASSIFICATION_LABELS[r.classification]}
              </Badge>
            )}
            {r.confidence && (
              <span className="text-[11px] text-muted-foreground">
                {r.confidence.toLowerCase()} confidence
              </span>
            )}
            <span className="text-muted-foreground text-xs ml-auto">
              {formatRelativeDate(r.received_at)}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {r.message_text}
          </p>
          {r.suggested_action && (
            <p className="mt-0.5 text-xs text-muted-foreground/80 italic">
              → {r.suggested_action}
            </p>
          )}
        </div>
      </li>
    );
  }

  if (item.kind === "followup") {
    const f = item.followUp;
    return (
      <li className="flex gap-3 text-sm">
        <span className="size-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
          <ClipboardList className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium capitalize">
              {f.follow_up_type.replace("_", " ")} follow-up
            </span>
            <DirectionChip direction={f.completed ? "out" : "scheduled"} />
            <Badge className={`text-xs border ${PRIORITY_COLORS[f.priority]}`}>
              {f.priority}
            </Badge>
            {f.completed && (
              <Badge variant="secondary" className="text-xs">
                {f.outcome ? OUTCOME_LABELS[f.outcome] : "Completed"}
              </Badge>
            )}
            <span className="text-muted-foreground text-xs ml-auto">
              {formatDate(f.scheduled_date)}
            </span>
          </div>
          {f.notes && (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {f.notes}
            </p>
          )}
        </div>
      </li>
    );
  }

  const log = item.log;
  return (
    <li className="flex gap-3 text-sm">
      <span className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
        <Clock className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{log.interaction_type}</span>
          <DirectionChip
            direction={log.direction === "Inbound" ? "in" : "out"}
          />
          {log.outcome && (
            <Badge variant="secondary" className="text-xs">
              {OUTCOME_LABELS[log.outcome]}
            </Badge>
          )}
          <span className="text-muted-foreground text-xs ml-auto">
            {formatRelativeDate(log.created_at)}
          </span>
        </div>
        {log.notes && (
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {log.notes}
          </p>
        )}
      </div>
    </li>
  );
}
