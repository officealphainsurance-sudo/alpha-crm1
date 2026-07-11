import { useEffect } from "react";
import { useNotify } from "ra-core";
import { AlertTriangle } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";

/**
 * Extract a human-readable message from a data-provider error.
 *
 * ra-core throws an `HttpError { message, status, body }` where `body` is the
 * parsed PostgREST JSON, e.g. `{ code, message, hint, details }`. RLS or
 * missing-grant failures arrive here as HTTP 401/403 with
 * `message: "permission denied for table clients"` and a `hint`. Surfacing this
 * verbatim is what turns a silent blank list into an actionable error.
 */
export function getQueryErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  const e = error as {
    status?: number;
    message?: string;
    body?: { message?: string; hint?: string; details?: string };
  };
  const detail = e.body?.message ?? e.message ?? "Unknown error";
  const status = e.status ? ` (HTTP ${e.status})` : "";
  const hint = e.body?.hint ? ` — ${e.body.hint}` : "";
  return `${detail}${status}${hint}`;
}

interface QueryErrorProps {
  error: unknown;
  label: string;
}

/** Loud inline error banner for card / detail / feed layouts. */
export function QueryErrorBanner({ error, label }: QueryErrorProps) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 flex flex-col items-center gap-2 text-center">
      <AlertTriangle className="size-7 text-destructive" />
      <p className="text-sm font-semibold text-destructive">
        Couldn't load {label}
      </p>
      <p className="text-xs max-w-md break-words text-destructive/90">
        {getQueryErrorMessage(error)}
      </p>
    </div>
  );
}

/** Loud error row spanning a table, replacing the empty-state slot. */
export function QueryErrorRow({
  error,
  label,
  colSpan,
}: QueryErrorProps & { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center">
        <div className="flex flex-col items-center gap-2">
          <AlertTriangle className="size-7 text-destructive" />
          <p className="text-sm font-semibold text-destructive">
            Couldn't load {label}
          </p>
          <p className="mx-auto text-xs max-w-md break-words text-destructive/90">
            {getQueryErrorMessage(error)}
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Fire a toast whenever `error` becomes truthy. For auxiliary data sources
 * (dropdowns, counts) that have no dedicated empty-state slot to replace, so a
 * permission failure still surfaces loudly instead of an empty control.
 */
export function useNotifyOnError(error: unknown, label: string) {
  const notify = useNotify();
  useEffect(() => {
    if (error) {
      notify(`Couldn't load ${label}: ${getQueryErrorMessage(error)}`, {
        type: "error",
      });
    }
  }, [error, label, notify]);
}
