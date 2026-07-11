import { useState, useMemo } from "react";
import { useGetList, useCreate, useNotify } from "ra-core";
import { useNotifyOnError } from "../QueryError";
import {
  MessageSquare,
  Users,
  AlertCircle,
  Send,
  Clock,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client, ClientStatus } from "../types";
import { formatDate } from "../utils";

interface SmsQueueRecord {
  id: string;
  segment: string;
  message_template: string;
  client_count: number;
  excluded_count: number;
  queued_at: string;
  status: string;
  queued_by: string | null;
}

interface StopListEntry {
  id: string;
  phone: string;
}

type Segment = "ACTIVE" | "AT_RISK" | "LAPSED" | "CANCELLED";

const SEGMENT_LABELS: Record<Segment, string> = {
  ACTIVE: "Active",
  AT_RISK: "At Risk",
  LAPSED: "Lapsed",
  CANCELLED: "Cancelled",
};

const MERGE_FIELDS = ["{first_name}", "{carrier}", "{agent_name}"];

function resolveMergeFields(
  template: string,
  client: Client,
  agentName = "Amanda",
): string {
  const firstName = client.name.split(" ")[0] ?? client.name;
  return template
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{carrier\}/g, client.carrier ?? "your carrier")
    .replace(/\{agent_name\}/g, agentName);
}

export function SmsCampaigns() {
  const notify = useNotify();
  const [create] = useCreate();

  const [segment, setSegment] = useState<Segment>("ACTIVE");
  const [message, setMessage] = useState("");
  const [queuing, setQueuing] = useState(false);

  const { data: clients, error: clientsError } = useGetList<Client>("clients", {
    filter: { "status@eq": segment },
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "name", order: "ASC" },
  });

  const { data: stopList, error: stopListError } = useGetList<StopListEntry>("stop_list", {
    filter: {},
    pagination: { page: 1, perPage: 10000 },
    sort: { field: "created_at", order: "DESC" },
  });

  const { data: campaigns, isPending: campaignsPending, error: campaignsError } =
    useGetList<SmsQueueRecord>("sms_queue", {
      filter: {},
      pagination: { page: 1, perPage: 50 },
      sort: { field: "queued_at", order: "DESC" },
    });

  useNotifyOnError(clientsError, "clients");
  useNotifyOnError(stopListError, "stop list");
  useNotifyOnError(campaignsError, "campaigns");

  const stopPhones = useMemo(
    () => new Set((stopList ?? []).map((e) => e.phone)),
    [stopList],
  );

  const eligibleClients = useMemo(
    () =>
      (clients ?? []).filter(
        (c) => c.phone && !stopPhones.has(c.phone) && !c.opt_out,
      ),
    [clients, stopPhones],
  );

  const excludedCount = (clients?.length ?? 0) - eligibleClients.length;

  const sampleClients = eligibleClients.slice(0, 3);

  const charCount = message.length;

  const insertMergeField = (field: string) => {
    setMessage((prev) => prev + field);
  };

  const handleQueue = async () => {
    if (!message.trim()) {
      notify("Message cannot be empty", { type: "warning" });
      return;
    }
    if (eligibleClients.length === 0) {
      notify("No eligible clients in this segment", { type: "warning" });
      return;
    }

    setQueuing(true);
    try {
      await create("sms_queue", {
        data: {
          segment,
          message_template: message.trim(),
          client_count: eligibleClients.length,
          excluded_count: excludedCount,
          status: "queued",
          queued_at: new Date().toISOString(),
          queued_by: null,
        },
      });
      notify(
        `Campaign queued for ${eligibleClients.length} clients — the SMS agent will send during the next scheduled run`,
        { type: "success" },
      );
      setMessage("");
    } catch {
      notify("Failed to queue campaign", { type: "error" });
    } finally {
      setQueuing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          SMS Campaigns
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Queue outreach messages by client segment
        </p>
      </div>

      <div className="rounded-md border border-blue-100 bg-blue-50 p-3 flex gap-2 text-sm text-blue-800">
        <Clock className="size-4 shrink-0 mt-0.5" />
        <span>
          Messages are <strong>queued</strong>, not sent immediately. The SMS
          agent reads this queue and sends during the next scheduled run.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Segment</label>
            <Tabs
              value={segment}
              onValueChange={(v) => setSegment(v as Segment)}
            >
              <TabsList>
                {(Object.keys(SEGMENT_LABELS) as Segment[]).map((s) => (
                  <TabsTrigger key={s} value={s} className="flex gap-1.5">
                    {SEGMENT_LABELS[s]}
                    {clients !== undefined && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1 py-0 h-4"
                      >
                        {segment === s
                          ? eligibleClients.length
                          : ""}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              <span>
                <strong>{eligibleClients.length}</strong> clients eligible
              </span>
              {excludedCount > 0 && (
                <span className="text-amber-600">
                  <AlertCircle className="size-3 inline mr-0.5" />
                  {excludedCount} excluded (opted out / stop list)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Message</label>
              <span
                className={`text-xs ${charCount > 160 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}
              >
                {charCount}/160 chars{charCount > 160 ? " (multi-part)" : ""}
              </span>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here…"
              className="min-h-28 resize-none"
            />

            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground self-center">
                Insert:
              </span>
              {MERGE_FIELDS.map((f) => (
                <button
                  key={f}
                  onClick={() => insertMergeField(f)}
                  className="text-xs px-2 py-1 rounded-md border hover:bg-accent font-mono"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleQueue}
            disabled={queuing || !message.trim() || eligibleClients.length === 0}
            className="w-full"
          >
            <Send className="size-4 mr-1.5" />
            {queuing
              ? "Queuing…"
              : `Queue Campaign for ${eligibleClients.length} clients`}
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Message Preview</p>
          {message.trim() && sampleClients.length > 0 ? (
            <div className="space-y-3">
              {sampleClients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-xl rounded-tl-none bg-muted p-3 text-sm leading-relaxed"
                >
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">
                    To: {client.name}
                  </p>
                  {resolveMergeFields(message, client)}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="size-6 mx-auto mb-2 opacity-30" />
              Type a message to see previews
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Campaign History</h2>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>Clients</TableHead>
                <TableHead>Excluded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Queued</TableHead>
                <TableHead>Message Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignsPending ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !campaigns?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No campaigns yet
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline">{c.segment}</Badge>
                    </TableCell>
                    <TableCell>{c.client_count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.excluded_count}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          c.status === "sent"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : c.status === "queued"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.queued_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                      {c.message_template}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
