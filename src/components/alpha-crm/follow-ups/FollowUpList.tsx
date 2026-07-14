import { useState } from "react";
import { useGetList, useUpdate, useNotify } from "ra-core";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { FollowUp, FollowUpOutcome } from "../types";
import { OUTCOME_LABELS, PRIORITY_COLORS, nextFollowUpDate } from "../types";
import { formatDate, isPastDate } from "../utils";
import { QueryErrorRow } from "../QueryError";

const OUTCOME_OPTIONS: { value: FollowUpOutcome; label: string }[] = [
  { value: "no_answer", label: "No Answer" },
  { value: "voicemail", label: "Voicemail" },
  { value: "spoke", label: "Spoke" },
  { value: "texted_no_reply", label: "Texted No Reply" },
  { value: "texted_replied", label: "Texted Replied" },
  { value: "emailed", label: "Emailed" },
  { value: "reinstated", label: "Reinstated" },
  { value: "not_interested", label: "Not Interested" },
];

type Section = "overdue" | "today" | "upcoming" | "completed";

export function FollowUpList() {
  const notify = useNotify();
  const [update] = useUpdate();
  const [activeSection, setActiveSection] = useState<Section>("today");
  const [logging, setLogging] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const filterBySection = (section: Section): Record<string, string> => {
    switch (section) {
      case "overdue":
        return { "completed@eq": "false", "scheduled_date@lt": today };
      case "today":
        return { "completed@eq": "false", "scheduled_date@eq": today };
      case "upcoming":
        return { "completed@eq": "false", "scheduled_date@gt": today };
      case "completed":
        return { "completed@eq": "true" };
    }
  };

  const { data: overdue } = useGetList<FollowUp>("follow_ups", {
    filter: { "completed@eq": "false", "scheduled_date@lt": today },
    pagination: { page: 1, perPage: 500 },
    sort: { field: "scheduled_date", order: "ASC" },
  });

  const { data, isPending, refetch, error } = useGetList<FollowUp>(
    "follow_ups",
    {
      filter: filterBySection(activeSection),
      pagination: { page: 1, perPage: 200 },
      sort: {
        field:
          activeSection === "completed" ? "completed_at" : "scheduled_date",
        order: activeSection === "completed" ? "DESC" : "ASC",
      },
    },
  );

  const overdueCount = overdue?.length ?? 0;

  const logOutcome = async (followUp: FollowUp, outcome: FollowUpOutcome) => {
    setLogging(followUp.id);
    try {
      const nextDate = nextFollowUpDate(outcome);
      await update("follow_ups", {
        id: followUp.id,
        data: {
          outcome,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        previousData: followUp,
      });
      if (outcome !== "not_interested") {
        await (async () => {
          await fetch("/api/follow-ups", {
            method: "POST",
            body: JSON.stringify({
              client_id: followUp.client_id,
              follow_up_type: followUp.follow_up_type,
              scheduled_date: nextDate.toISOString().split("T")[0],
              priority: followUp.priority,
            }),
          }).catch(() => null);
        })();
      }
      notify(
        `Logged: ${OUTCOME_LABELS[outcome]}` +
          (outcome !== "not_interested" ? ` → next follow-up scheduled` : ""),
        { type: "success" },
      );
      refetch();
    } catch {
      notify("Failed to log outcome", { type: "error" });
    } finally {
      setLogging(null);
    }
  };

  const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
    {
      id: "overdue",
      label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ""}`,
      icon: <AlertTriangle className="size-3.5" />,
    },
    { id: "today", label: "Today", icon: <Clock className="size-3.5" /> },
    {
      id: "upcoming",
      label: "Upcoming",
      icon: <ClipboardList className="size-3.5" />,
    },
    {
      id: "completed",
      label: "Completed",
      icon: <CheckCircle2 className="size-3.5" />,
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Follow-Ups
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {overdueCount > 0 && (
            <span className="text-red-600 font-medium mr-2">
              {overdueCount} overdue
            </span>
          )}
          Track and log client outreach
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 border-b pb-0">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeSection === s.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            } ${s.id === "overdue" && overdueCount > 0 ? "text-red-600 hover:text-red-600" : ""}`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Priority</TableHead>
              {activeSection !== "completed" && (
                <TableHead>Log Outcome</TableHead>
              )}
              {activeSection === "completed" && <TableHead>Outcome</TableHead>}
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <QueryErrorRow error={error} label="follow-ups" colSpan={6} />
            ) : !data?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center">
                  <p className="text-sm text-muted-foreground">
                    {activeSection === "today"
                      ? "Nothing due today — you're on top of it."
                      : activeSection === "overdue"
                        ? "No overdue follow-ups."
                        : activeSection === "upcoming"
                          ? "No upcoming follow-ups scheduled."
                          : "No completed follow-ups yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((fu) => (
                <TableRow
                  key={fu.id}
                  className={
                    isPastDate(fu.scheduled_date) && !fu.completed
                      ? "bg-red-50/40"
                      : ""
                  }
                >
                  <TableCell className="font-medium">
                    {fu.client_name ?? fu.client_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {fu.follow_up_type.replace("_", " ")}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span
                      className={
                        isPastDate(fu.scheduled_date) && !fu.completed
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      {formatDate(fu.scheduled_date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs border ${PRIORITY_COLORS[fu.priority]}`}
                    >
                      {fu.priority}
                    </Badge>
                  </TableCell>
                  {activeSection !== "completed" ? (
                    <TableCell>
                      <Select
                        disabled={logging === fu.id}
                        onValueChange={(v) =>
                          logOutcome(fu, v as FollowUpOutcome)
                        }
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue placeholder="Log outcome…" />
                        </SelectTrigger>
                        <SelectContent>
                          {OUTCOME_OPTIONS.map((o) => (
                            <SelectItem
                              key={o.value}
                              value={o.value}
                              className="text-xs"
                            >
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  ) : (
                    <TableCell>
                      {fu.outcome ? (
                        <Badge variant="secondary" className="text-xs">
                          {OUTCOME_LABELS[fu.outcome]}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {fu.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
