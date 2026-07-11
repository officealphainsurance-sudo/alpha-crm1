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
import { Phone, Mail, Calendar, FileText, Clock, User } from "lucide-react";
import type { Client, ContactLog } from "../types";
import { STATUS_COLORS, OUTCOME_LABELS, STATUS_LABELS } from "../types";
import { formatPhone, formatCurrency, formatDate, formatRelativeDate } from "../utils";
import { QueryErrorBanner } from "../QueryError";

interface ClientShowProps {
  id: string | null;
  onClose: () => void;
}

export function ClientShow({ id, onClose }: ClientShowProps) {
  const { data: client, isPending, error: clientError } = useGetOne<Client>(
    "clients",
    { id: id ?? "" },
    { enabled: !!id },
  );

  const { data: logs, error: logsError } = useGetList<ContactLog>("contact_logs", {
    filter: { "client_id@eq": id },
    sort: { field: "created_at", order: "DESC" },
    pagination: { page: 1, perPage: 20 },
  }, { enabled: !!id });

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
            logsError={logsError}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ClientDetail({
  client,
  logs,
  logsError,
  onClose,
}: {
  client: Client;
  logs: ContactLog[];
  logsError: unknown;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [update] = useUpdate();

  const cycleStatus = async () => {
    const cycle: Client["status"][] = ["ACTIVE", "AT_RISK", "LAPSED", "CANCELLED"];
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

  return (
    <>
      <SheetHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <SheetTitle className="text-xl leading-tight">{client.name}</SheetTitle>
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
                <dd className="font-medium">{formatCurrency(client.premium)}/mo</dd>
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
                <dd className={
                  new Date(client.policy_end) < new Date()
                    ? "text-red-600 font-medium"
                    : ""
                }>
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

        {/* Contact Log */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contact Log
            </p>
          </div>
          {logsError ? (
            <QueryErrorBanner error={logsError} label="contact history" />
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No contact history yet.</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="flex gap-3 text-sm">
                  <Clock className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{log.interaction_type}</span>
                      <span className="text-muted-foreground text-xs">{log.direction}</span>
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
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
