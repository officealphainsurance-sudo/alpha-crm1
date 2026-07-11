import { useState } from "react";
import { useGetList, useCreate, useDelete, useNotify } from "ra-core";
import { QueryErrorRow } from "../QueryError";
import { Ban, Plus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPhone } from "../utils";

interface StopListEntry {
  id: string;
  phone: string;
  reason: string;
  added_by: string | null;
  created_at: string;
}

type Reason =
  | "Opted Out"
  | "Do Not Contact"
  | "Wrong Number"
  | "Deceased"
  | "Other";

const REASONS: Reason[] = [
  "Opted Out",
  "Do Not Contact",
  "Wrong Number",
  "Deceased",
  "Other",
];

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  return raw.trim();
}

export function StopList() {
  const notify = useNotify();
  const [create] = useCreate();
  const [deleteOne] = useDelete();

  const [search, setSearch] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newReason, setNewReason] = useState<Reason>("Opted Out");
  const [adding, setAdding] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<StopListEntry | null>(null);
  const [removing, setRemoving] = useState(false);

  const { data, isPending, total, refetch, error } = useGetList<StopListEntry>(
    "stop_list",
    {
      filter: search ? { "phone@ilike": `%${search.replace(/\D/g, "")}%` } : {},
      pagination: { page: 1, perPage: 500 },
      sort: { field: "created_at", order: "DESC" },
    },
  );

  const lastEntry = data?.[0];

  const handleAdd = async () => {
    if (!newPhone.trim()) {
      notify("Enter a phone number", { type: "warning" });
      return;
    }
    setAdding(true);
    try {
      await create("stop_list", {
        data: {
          phone: normalizePhone(newPhone),
          reason: newReason,
          added_by: "Manual",
          created_at: new Date().toISOString(),
        },
      });
      notify("Added to stop list", { type: "success" });
      setNewPhone("");
      refetch();
    } catch {
      notify("Failed to add — number may already be on the list", {
        type: "error",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;

    setBulkAdding(true);
    let added = 0;
    let skipped = 0;

    for (const line of lines) {
      try {
        await create("stop_list", {
          data: {
            phone: normalizePhone(line),
            reason: "Opted Out",
            added_by: "Bulk Import",
            created_at: new Date().toISOString(),
          },
        });
        added++;
      } catch {
        skipped++;
      }
    }

    setBulkAdding(false);
    setBulkText("");
    refetch();
    notify(`Added ${added} numbers${skipped > 0 ? `, ${skipped} skipped` : ""}`, {
      type: "success",
    });
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await deleteOne("stop_list", { id: removeTarget.id });
      notify("Removed from stop list", { type: "success" });
      setRemoveTarget(null);
      refetch();
    } catch {
      notify("Failed to remove", { type: "error" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Stop List
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Clients who have opted out of SMS communications
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{total ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Numbers on stop list
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm font-medium">
            {lastEntry ? formatDate(lastEntry.created_at) : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Last updated</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Ban className="size-4 text-red-500" />
            <p className="text-sm font-medium text-red-600">Protected</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Filtered from all campaigns
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Add Single Number</h2>
          <div className="flex gap-2">
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="(601) 555-1234"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Select
              value={newReason}
              onValueChange={(v) => setNewReason(v as Reason)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={adding}>
              <Plus className="size-4" />
              {adding ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Bulk Import</h2>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"One phone per line:\n6015551234\n6015559876\n…"}
            className="min-h-20 font-mono text-xs resize-none"
          />
          <Button
            onClick={handleBulkAdd}
            disabled={bulkAdding || !bulkText.trim()}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Upload className="size-3.5 mr-1.5" />
            {bulkAdding ? "Adding…" : "Import All"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone…"
              className="pl-8"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {total !== undefined && `${total} total`}
          </span>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <QueryErrorRow error={error} label="stop list" colSpan={5} />
              ) : !data?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                    <Ban className="size-6 mx-auto mb-2 opacity-20" />
                    {search ? `No numbers matching "${search}"` : "Stop list is empty"}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">
                      {formatPhone(entry.phone)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.added_by ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setRemoveTarget(entry)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Stop List</DialogTitle>
            <DialogDescription>
              Are you sure? Removing{" "}
              <strong>
                {removeTarget
                  ? formatPhone(removeTarget.phone)
                  : "this number"}
              </strong>{" "}
              will allow them to receive SMS messages again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
