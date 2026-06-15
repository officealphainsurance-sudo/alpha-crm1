import { useState } from "react";
import { useGetList } from "ra-core";
import { Activity, Phone, Mail, MessageSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContactLog, InteractionType } from "../types";
import { OUTCOME_LABELS } from "../types";
import { formatRelativeDate, formatDate } from "../utils";

const INTERACTION_ICONS: Record<InteractionType, React.ReactNode> = {
  Call: <Phone className="size-3.5" />,
  Text: <MessageSquare className="size-3.5" />,
  Email: <Mail className="size-3.5" />,
  "Walk-in": <User className="size-3.5" />,
  "Retell AI": <Activity className="size-3.5" />,
};

const INTERACTION_COLORS: Record<InteractionType, string> = {
  Call: "bg-blue-100 text-blue-700",
  Text: "bg-violet-100 text-violet-700",
  Email: "bg-sky-100 text-sky-700",
  "Walk-in": "bg-emerald-100 text-emerald-700",
  "Retell AI": "bg-orange-100 text-orange-700",
};

type FilterType = InteractionType | "ALL";

export function ActivityLogList() {
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");

  const filter: Record<string, string> = {};
  if (typeFilter !== "ALL") filter["interaction_type@eq"] = typeFilter;

  const { data, isPending } = useGetList<ContactLog>("contact_logs", {
    filter,
    pagination: { page: 1, perPage: 200 },
    sort: { field: "created_at", order: "DESC" },
  });

  const grouped = groupByDate(data ?? []);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All client interactions in one place
          </p>
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as FilterType)}
        >
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Filter type…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="Call">Call</SelectItem>
            <SelectItem value="Text">Text</SelectItem>
            <SelectItem value="Email">Email</SelectItem>
            <SelectItem value="Walk-in">Walk-in</SelectItem>
            <SelectItem value="Retell AI">Retell AI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feed */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Activity className="size-12 opacity-20" />
          <p className="text-sm">No activity logged yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, entries }) => (
            <section key={date} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background py-1">
                {date}
              </p>
              <ul className="space-y-2">
                {entries.map((log) => (
                  <ActivityEntry key={log.id} log={log} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityEntry({ log }: { log: ContactLog }) {
  const icon = INTERACTION_ICONS[log.interaction_type];
  const colorClass = INTERACTION_COLORS[log.interaction_type];

  return (
    <li className="flex gap-3 items-start group">
      <div
        className={`size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {log.interaction_type}
          </span>
          <span className="text-xs text-muted-foreground">{log.direction}</span>
          {log.outcome && (
            <Badge variant="secondary" className="text-xs">
              {OUTCOME_LABELS[log.outcome]}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatRelativeDate(log.created_at)}
          </span>
        </div>
        {log.notes && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
            {log.notes}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          by {log.logged_by}
        </p>
      </div>
    </li>
  );
}

function groupByDate(
  logs: ContactLog[],
): { date: string; entries: ContactLog[] }[] {
  const map = new Map<string, ContactLog[]>();
  for (const log of logs) {
    const d = formatDate(log.created_at);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(log);
  }
  return Array.from(map.entries()).map(([date, entries]) => ({ date, entries }));
}
