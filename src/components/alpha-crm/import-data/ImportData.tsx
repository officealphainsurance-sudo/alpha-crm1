import { useState, useCallback } from "react";
import { useDataProvider, useNotify } from "ra-core";
import { Upload, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { ClientStatus } from "../types";

interface ParsedRow {
  name: string;
  phone: string | null;
  email: string | null;
  policy_number: string | null;
  carrier: string | null;
  product: string | null;
  status: ClientStatus;
  premium: string | null;
  dob: string | null;
  policy_start: string | null;
  policy_end: string | null;
  _isDuplicate?: boolean;
  _skipReason?: string;
}

type FormatPreset = "auto" | "csv" | "tsv" | "mendota" | "national_general" | "safeport";

const STATUS_MAP: Record<string, ClientStatus> = {
  "ACTIVE EFT": "ACTIVE",
  "ACTIVE NON EFT": "ACTIVE",
  "ACTIVE DIRECT BILL": "ACTIVE",
  "ACTIVE": "ACTIVE",
  "ACTIVE-EFT": "ACTIVE",
  "PENDING CANCEL": "AT_RISK",
  "PENDING CANCELLATION": "AT_RISK",
  "NSF": "AT_RISK",
  "NONPAY": "AT_RISK",
  "NON-PAY": "AT_RISK",
  "NON PAY": "AT_RISK",
  "EXPIRED": "LAPSED",
  "LAPSED": "LAPSED",
  "TERMINATED": "CANCELLED",
  "CANCELLED": "CANCELLED",
  "CANCELED": "CANCELLED",
  "FLAT CANCEL": "CANCELLED",
  "FLAT-CANCEL": "CANCELLED",
};

function normalizeStatus(raw: string | null | undefined): ClientStatus {
  if (!raw) return "ACTIVE";
  const key = raw.trim().toUpperCase();
  return STATUS_MAP[key] ?? "ACTIVE";
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  if (digits.length > 6) return `+${digits}`;
  return null;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs >= commas ? "\t" : ",";
}

function parseCsv(line: string, delimiter: string): string[] {
  if (delimiter === ",") {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }
  return line.split(delimiter).map((s) => s.trim());
}

const COLUMN_ALIASES: Record<string, string> = {
  "first name": "name",
  "last name": "_last",
  "insured name": "name",
  "insured": "name",
  "client name": "name",
  "full name": "name",
  "policy number": "policy_number",
  "policy #": "policy_number",
  "policy no": "policy_number",
  "policy_no": "policy_number",
  "phone number": "phone",
  "mobile": "phone",
  "cell": "phone",
  "email address": "email",
  "email addr": "email",
  "carrier name": "carrier",
  "company": "carrier",
  "insurance company": "carrier",
  "plan": "product",
  "product name": "product",
  "coverage": "product",
  "policy status": "status",
  "stat": "status",
  "monthly premium": "premium",
  "prem": "premium",
  "premium amount": "premium",
  "rate": "premium",
  "date of birth": "dob",
  "dob": "dob",
  "birthdate": "dob",
  "effective date": "policy_start",
  "eff date": "policy_start",
  "policy effective": "policy_start",
  "start date": "policy_start",
  "expiration date": "policy_end",
  "exp date": "policy_end",
  "policy end": "policy_end",
  "end date": "policy_end",
  "cancel date": "policy_end",
};

function mapHeader(h: string): string {
  const normalized = h.toLowerCase().replace(/[_-]/g, " ").trim();
  return COLUMN_ALIASES[normalized] ?? normalized.replace(/\s+/g, "_");
}

function parseRawData(text: string, _preset: FormatPreset): ParsedRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(text);
  const headers = parseCsv(lines[0], delimiter).map(mapHeader);

  const seen = new Map<string, number>();

  return lines.slice(1).map((line) => {
    const values = parseCsv(line, delimiter);
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      raw[h] = values[i] ?? "";
    });

    const firstName = raw["name"] ?? "";
    const lastName = raw["_last"] ?? "";
    const fullName = lastName
      ? `${firstName} ${lastName}`.trim()
      : firstName.trim();

    if (!fullName) {
      return null as unknown as ParsedRow;
    }

    const phone = normalizePhone(raw["phone"] ?? null);
    const policyNum = raw["policy_number"]?.trim() || null;

    const dedupeKey = policyNum ?? phone ?? fullName.toLowerCase();
    const dupCount = seen.get(dedupeKey) ?? 0;
    seen.set(dedupeKey, dupCount + 1);

    const premiumRaw = raw["premium"]?.replace(/[$,\s]/g, "") ?? "";
    const premiumVal = parseFloat(premiumRaw);

    return {
      name: fullName,
      phone,
      email: raw["email"]?.trim() || null,
      policy_number: policyNum,
      carrier: raw["carrier"]?.trim() || null,
      product: raw["product"]?.trim() || null,
      status: normalizeStatus(raw["status"]),
      premium: isNaN(premiumVal) ? null : premiumVal.toFixed(2),
      dob: raw["dob"]?.trim() || null,
      policy_start: raw["policy_start"]?.trim() || null,
      policy_end: raw["policy_end"]?.trim() || null,
      _isDuplicate: dupCount > 0,
    } satisfies ParsedRow;
  }).filter(Boolean) as ParsedRow[];
}

export function ImportData() {
  const notify = useNotify();
  const dataProvider = useDataProvider();

  const [rawText, setRawText] = useState("");
  const [preset, setPreset] = useState<FormatPreset>("auto");
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    duplicates: number;
    skipped: number;
  } | null>(null);

  const handleParse = useCallback(() => {
    if (!rawText.trim()) {
      notify("Paste some data first", { type: "warning" });
      return;
    }
    const rows = parseRawData(rawText, preset);
    setPreview(rows);
    setResult(null);
  }, [rawText, preset, notify]);

  const handleImport = useCallback(async () => {
    if (!preview) return;
    setImporting(true);
    setConfirmOpen(false);

    let imported = 0;
    let duplicates = 0;
    let skipped = 0;

    const seen = new Set<string>();

    for (const row of preview) {
      if (!row.name) { skipped++; continue; }

      const dedupeKey = row.policy_number ?? row.phone ?? row.name.toLowerCase();
      if (seen.has(dedupeKey)) { duplicates++; continue; }
      seen.add(dedupeKey);

      try {
        await dataProvider.create("clients", {
          data: {
            name: row.name,
            phone: row.phone,
            email: row.email,
            policy_number: row.policy_number,
            carrier: row.carrier,
            product: row.product,
            status: row.status,
            premium: row.premium,
            dob: row.dob,
            policy_start: row.policy_start,
            policy_end: row.policy_end,
            opt_out: false,
            tab: null,
            sequence_stage: null,
            last_contact: null,
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    setImporting(false);
    setResult({ imported, duplicates, skipped });
    setPreview(null);
    setRawText("");
    notify(`Imported ${imported} clients`, { type: "success" });
  }, [preview, dataProvider, notify]);

  const validRows = preview?.filter((r) => r.name && !r._isDuplicate) ?? [];
  const dupRows = preview?.filter((r) => r._isDuplicate) ?? [];
  const skipRows = preview?.filter((r) => !r.name) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Import Data
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste carrier exports to load clients into your book of business
        </p>
      </div>

      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">
            <p className="font-semibold">Import complete</p>
            <p>
              Imported <strong>{result.imported}</strong> clients.{" "}
              {result.duplicates > 0 && (
                <>{result.duplicates} duplicates merged. </>
              )}
              {result.skipped > 0 && (
                <>{result.skipped} rows skipped (no name).</>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_200px]">
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Paste CSV or tab-separated data from carrier exports here…\n\nExample columns:\nName, Policy #, Carrier, Product, Status, Phone, Premium, DOB, Policy Start, Policy End`}
          className="min-h-48 font-mono text-xs resize-y"
        />

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Format
            </label>
            <Select value={preset} onValueChange={(v) => setPreset(v as FormatPreset)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="tsv">Tab-separated</SelectItem>
                <SelectItem value="mendota">Mendota</SelectItem>
                <SelectItem value="national_general">National General</SelectItem>
                <SelectItem value="safeport">SafePort</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
            <div className="flex gap-1 items-center font-semibold">
              <Info className="size-3.5" /> Status mapping
            </div>
            <p>ACTIVE EFT → Active</p>
            <p>PENDING CANCEL, NSF → At Risk</p>
            <p>EXPIRED, LAPSED → Lapsed</p>
            <p>TERMINATED, CANCELLED → Cancelled</p>
          </div>

          <Button onClick={handleParse} variant="outline" className="w-full">
            Preview Data
          </Button>
        </div>
      </div>

      {preview !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{preview.length} total rows</Badge>
              {dupRows.length > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  {dupRows.length} duplicates
                </Badge>
              )}
              {skipRows.length > 0 && (
                <Badge variant="destructive">{skipRows.length} skipped</Badge>
              )}
            </div>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={validRows.length === 0}
            >
              <Upload className="size-4 mr-1.5" />
              Import {validRows.length + dupRows.length} clients
            </Button>
          </div>

          <div className="rounded-md border bg-card overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Policy #</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead className="w-24">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.slice(0, 200).map((row, i) => (
                  <TableRow
                    key={i}
                    className={row._isDuplicate ? "bg-amber-50" : ""}
                  >
                    <TableCell className="font-medium">
                      {row.name || (
                        <span className="text-muted-foreground italic">— no name —</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.policy_number ?? "—"}
                    </TableCell>
                    <TableCell>{row.carrier ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm">{row.premium ? `$${row.premium}` : "—"}</TableCell>
                    <TableCell>
                      {row._isDuplicate && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                          duplicate
                        </Badge>
                      )}
                      {!row.name && (
                        <Badge variant="destructive" className="text-xs">
                          skip
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {preview.length > 200 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-3">
                      … and {preview.length - 200} more rows
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {preview === null && !result && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <Upload className="size-10 opacity-20" />
          <div className="text-center text-sm">
            <p className="font-medium">Paste your carrier export above</p>
            <p className="opacity-60 mt-1">
              Supports CSV, tab-separated, and common carrier formats
            </p>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              This will import{" "}
              <strong>{validRows.length + dupRows.length}</strong> clients into
              your book of business. Existing clients matched by policy number
              or phone will be updated.
            </DialogDescription>
          </DialogHeader>
          {dupRows.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>
                {dupRows.length} duplicate records detected — the most complete
                record will be kept.
              </span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importing…" : `Import ${validRows.length + dupRows.length} clients`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
