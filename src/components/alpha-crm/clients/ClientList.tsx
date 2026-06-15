import { useState, useCallback } from "react";
import { useGetList, useNotify } from "ra-core";
import { Users, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client, ClientStatus } from "../types";
import { STATUS_COLORS, STATUS_LABELS } from "../types";
import { formatPhone, formatCurrency, formatDate } from "../utils";
import { ClientShow } from "./ClientShow";
import { ClientCreate } from "./ClientCreate";

type TabValue = "ALL" | ClientStatus;

const TABS: { value: TabValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "LAPSED", label: "Lapsed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ClientList() {
  const notify = useNotify();
  const [tab, setTab] = useState<TabValue>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const filter: Record<string, string> = {};
  if (tab !== "ALL") filter["status@eq"] = tab;
  if (debouncedSearch) filter["name@ilike"] = `%${debouncedSearch}%`;

  const { data, isPending, total, refetch } = useGetList<Client>("clients", {
    filter,
    pagination: { page: 1, perPage: 200 },
    sort: { field: "name", order: "ASC" },
  });

  const handleCreated = () => {
    refetch();
    notify("Client added to your book of business", { type: "success" });
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total !== undefined ? `${total} client${total !== 1 ? "s" : ""}` : "Loading…"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="size-4 mr-1" /> Add Client
        </Button>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative ml-auto w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search clients…"
            className="pl-8 pr-8"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setDebouncedSearch(""); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Policy #</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Policy End</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="size-8 opacity-30" />
                    <p className="text-sm">
                      {search
                        ? `No clients matching "${search}"`
                        : tab !== "ALL"
                        ? `No ${STATUS_LABELS[tab as ClientStatus].toLowerCase()} clients`
                        : "No clients yet — add your first one"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedId(client.id)}
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {client.policy_number ?? "—"}
                  </TableCell>
                  <TableCell>{client.carrier ?? "—"}</TableCell>
                  <TableCell>{client.product ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      className={`border text-xs ${STATUS_COLORS[client.status]}`}
                    >
                      {STATUS_LABELS[client.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatPhone(client.phone)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatCurrency(client.premium)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {client.policy_end ? (
                      <span
                        className={
                          new Date(client.policy_end) < new Date()
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {formatDate(client.policy_end)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <ClientShow
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* Create Sheet */}
      <ClientCreate
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
