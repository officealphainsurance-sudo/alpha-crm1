import { useGetList } from "ra-core";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  Phone,
  Activity,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client, FollowUp, ContactLog, RawReply } from "../types";
import { STATUS_LABELS, OUTCOME_LABELS } from "../types";
import { formatDate, formatRelativeDate, formatCurrency } from "../utils";
import { QueryErrorBanner, useNotifyOnError } from "../QueryError";

export function AlphaDashboard() {
  const today = new Date().toISOString().split("T")[0];

  const {
    data: clients,
    isPending: clientsLoading,
    error: clientsError,
  } = useGetList<Client>("clients", {
    filter: {},
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "name", order: "ASC" },
  });

  const { data: overdueFollowUps, error: overdueError } = useGetList<FollowUp>(
    "follow_ups",
    {
      filter: { "completed@eq": "false", "scheduled_date@lt": today },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "scheduled_date", order: "ASC" },
    },
  );

  const { data: todayFollowUps, error: todayError } = useGetList<FollowUp>(
    "follow_ups",
    {
      filter: { "completed@eq": "false", "scheduled_date@eq": today },
      pagination: { page: 1, perPage: 50 },
      sort: { field: "priority", order: "ASC" },
    },
  );

  const { data: recentActivity, error: activityError } = useGetList<ContactLog>(
    "contact_logs",
    {
      filter: {},
      pagination: { page: 1, perPage: 10 },
      sort: { field: "created_at", order: "DESC" },
    },
  );

  // Inbound SMS replies received in the last 7 days (count only).
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const { total: recentRepliesCount, error: repliesError } =
    useGetList<RawReply>("raw_replies", {
      filter: { "received_at@gte": weekAgo },
      pagination: { page: 1, perPage: 1 },
      sort: { field: "received_at", order: "DESC" },
    });

  // Contact-log entries created today (count only).
  const { total: todayActivityCount, error: todayActivityError } =
    useGetList<ContactLog>("contact_logs", {
      filter: { "created_at@gte": today },
      pagination: { page: 1, perPage: 1 },
      sort: { field: "created_at", order: "DESC" },
    });

  useNotifyOnError(overdueError ?? todayError, "follow-ups");
  useNotifyOnError(activityError, "recent activity");
  useNotifyOnError(repliesError, "replies");
  useNotifyOnError(todayActivityError, "today's activity");

  const statusCounts = {
    ACTIVE: clients?.filter((c) => c.status === "ACTIVE").length ?? 0,
    AT_RISK: clients?.filter((c) => c.status === "AT_RISK").length ?? 0,
    LAPSED: clients?.filter((c) => c.status === "LAPSED").length ?? 0,
    CANCELLED: clients?.filter((c) => c.status === "CANCELLED").length ?? 0,
  };

  const totalPremium =
    clients
      ?.filter((c) => c.status === "ACTIVE" && c.premium)
      .reduce((sum, c) => sum + parseFloat(c.premium ?? "0"), 0) ?? 0;

  const upcomingFollowUps = [
    ...(overdueFollowUps ?? []),
    ...(todayFollowUps ?? []),
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Heading */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {clientsError && (
        <QueryErrorBanner error={clientsError} label="clients" />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Active Clients"
          value={clientsLoading ? null : statusCounts.ACTIVE}
          icon={<Users className="size-4 text-emerald-600" />}
          sub={`of ${clients?.length ?? 0} total`}
        />
        <KpiCard
          title="Monthly Premium"
          value={clientsLoading ? null : formatCurrency(totalPremium)}
          icon={<TrendingUp className="size-4 text-primary" />}
          sub="active book"
        />
        <KpiCard
          title="At Risk / Lapsed"
          value={
            clientsLoading ? null : statusCounts.AT_RISK + statusCounts.LAPSED
          }
          icon={<AlertTriangle className="size-4 text-amber-500" />}
          sub="need attention"
          highlight={statusCounts.AT_RISK + statusCounts.LAPSED > 0}
        />
        <KpiCard
          title="Follow-Ups Due"
          value={upcomingFollowUps.length}
          icon={<ClipboardList className="size-4 text-blue-500" />}
          sub={`${overdueFollowUps?.length ?? 0} overdue`}
          highlight={(overdueFollowUps?.length ?? 0) > 0}
        />
        <KpiCard
          title="Recent Replies"
          value={recentRepliesCount ?? 0}
          icon={<MessageSquare className="size-4 text-sky-600" />}
          sub="last 7 days"
        />
        <KpiCard
          title="Today's Activity"
          value={todayActivityCount ?? 0}
          icon={<Activity className="size-4 text-violet-600" />}
          sub="logged today"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follow-Up Queue */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Today's Follow-Up Queue</h2>
            {(overdueFollowUps?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueFollowUps?.length} overdue
              </Badge>
            )}
          </div>
          {upcomingFollowUps.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                All caught up — no follow-ups due today.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingFollowUps.slice(0, 8).map((fu) => (
                <FollowUpRow
                  key={fu.id}
                  followUp={fu}
                  isOverdue={new Date(fu.scheduled_date) < new Date(today)}
                />
              ))}
              {upcomingFollowUps.length > 8 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{upcomingFollowUps.length - 8} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Book Composition + Recent Activity */}
        <div className="space-y-4">
          {/* Book Composition */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Book Composition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {clientsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : (
                (["ACTIVE", "AT_RISK", "LAPSED", "CANCELLED"] as const).map(
                  (status) => {
                    const count = statusCounts[status];
                    const pct = clients?.length
                      ? Math.round((count / clients.length) * 100)
                      : 0;
                    return (
                      <div key={status} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {STATUS_LABELS[status]}
                          </span>
                          <span className="font-medium">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status === "ACTIVE"
                                ? "bg-emerald-500"
                                : status === "AT_RISK"
                                  ? "bg-amber-400"
                                  : status === "LAPSED"
                                    ? "bg-red-400"
                                    : "bg-gray-300"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="size-3.5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recentActivity?.length ? (
                <p className="text-xs text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentActivity.map((log) => (
                    <li key={log.id} className="flex gap-2 items-start text-xs">
                      <Phone className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <span className="font-medium">
                          {log.interaction_type}
                        </span>
                        {log.outcome && (
                          <span className="text-muted-foreground">
                            {" · "}
                            {OUTCOME_LABELS[log.outcome]}
                          </span>
                        )}
                        <span className="text-muted-foreground block">
                          {formatRelativeDate(log.created_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  sub,
  highlight = false,
}: {
  title: string;
  value: string | number | null;
  icon: React.ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-300" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          {icon}
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p
            className={`text-2xl font-bold ${highlight ? "text-amber-600" : ""}`}
          >
            {value}
          </p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function FollowUpRow({
  followUp,
  isOverdue,
}: {
  followUp: FollowUp;
  isOverdue: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
        isOverdue ? "border-red-200 bg-red-50/40" : "bg-card"
      }`}
    >
      <ClipboardList
        className={`size-4 mt-0.5 shrink-0 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {followUp.client_name ?? followUp.client_id.slice(0, 8)}
        </p>
        <p className="text-muted-foreground text-xs capitalize">
          {followUp.follow_up_type.replace("_", " ")}
          {isOverdue && (
            <span className="text-red-600 font-medium ml-1">
              · was {formatDate(followUp.scheduled_date)}
            </span>
          )}
        </p>
      </div>
      <Badge
        className={`text-xs shrink-0 ${
          isOverdue
            ? "bg-red-100 text-red-700 border-red-200"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isOverdue ? "Overdue" : "Today"}
      </Badge>
    </div>
  );
}
