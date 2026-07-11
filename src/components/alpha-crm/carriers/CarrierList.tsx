import { useState } from "react";
import { useGetList } from "ra-core";
import { Building2, Plus, ExternalLink, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Carrier } from "../types";
import { formatPhone } from "../utils";
import { CarrierCreate } from "./CarrierCreate";
import { QueryErrorBanner } from "../QueryError";

export function CarrierList() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending, refetch, error } = useGetList<Carrier>("carriers", {
    filter: {},
    pagination: { page: 1, perPage: 100 },
    sort: { field: "carrier_name", order: "ASC" },
  });

  const active = data?.filter((c) => c.active) ?? [];
  const inactive = data?.filter((c) => !c.active) ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Carriers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${active.length} active carrier${active.length !== 1 ? "s" : ""}` : "Loading…"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="size-4 mr-1" /> Add Carrier
        </Button>
      </div>

      {/* Active Carriers */}
      {isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <QueryErrorBanner error={error} label="carriers" />
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Building2 className="size-12 opacity-20" />
          <p className="text-sm">No carriers yet — add your first one</p>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1" /> Add Carrier
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((carrier) => (
            <CarrierCard key={carrier.id} carrier={carrier} />
          ))}
        </div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inactive
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {inactive.map((carrier) => (
              <CarrierCard key={carrier.id} carrier={carrier} />
            ))}
          </div>
        </section>
      )}

      <CarrierCreate
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
    </div>
  );
}

function CarrierCard({ carrier }: { carrier: Carrier }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">
            {carrier.carrier_name}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {carrier.carrier_code && (
              <Badge variant="secondary" className="text-xs font-mono">
                {carrier.carrier_code}
              </Badge>
            )}
            {!carrier.active && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {carrier.commission_rate !== null && (
          <p className="text-muted-foreground">
            Commission:{" "}
            <span className="font-medium text-foreground">
              {carrier.commission_rate}%
            </span>
          </p>
        )}

        {carrier.am_contact_name && (
          <div className="pt-1 border-t space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              AM Contact
            </p>
            <p className="font-medium">{carrier.am_contact_name}</p>
            {carrier.am_contact_phone && (
              <a
                href={`tel:${carrier.am_contact_phone}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="size-3" />
                {formatPhone(carrier.am_contact_phone)}
              </a>
            )}
            {carrier.am_contact_email && (
              <a
                href={`mailto:${carrier.am_contact_email}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors truncate"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="size-3" />
                <span className="truncate">{carrier.am_contact_email}</span>
              </a>
            )}
          </div>
        )}

        {carrier.portal_url && (
          <a
            href={carrier.portal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:underline text-sm pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-3" />
            Agent Portal
          </a>
        )}
      </CardContent>
    </Card>
  );
}
