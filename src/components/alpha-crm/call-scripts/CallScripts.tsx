import { useState } from "react";
import { useGetList, useCreate, useNotify } from "ra-core";
import {
  Phone,
  MessageSquare,
  Mail,
  Loader2,
  Copy,
  Check,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Client } from "../types";
import {
  formatPhone,
  formatCurrency,
  formatDate,
  formatRelativeDate,
} from "../utils";
import { STATUS_LABELS, STATUS_COLORS } from "../types";

type ScriptType = "call" | "text" | "email";

const SCRIPT_TYPE_CONFIG: Record<
  ScriptType,
  { label: string; icon: React.ElementType; hint: string }
> = {
  call: { label: "Phone Call", icon: Phone, hint: "Conversational, warm, relationship-forward" },
  text: { label: "Text Message", icon: MessageSquare, hint: "Under 160 chars, casual and personal" },
  email: { label: "Email", icon: Mail, hint: "Professional, slightly longer, clear subject line" },
};

export function CallScripts() {
  const notify = useNotify();
  const [create] = useCreate();

  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [scriptType, setScriptType] = useState<ScriptType>("call");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logging, setLogging] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: clients } = useGetList<Client>("clients", {
    filter: search.length >= 2
      ? { "name@ilike": `%${search}%` }
      : {},
    pagination: { page: 1, perPage: 20 },
    sort: { field: "name", order: "ASC" },
  });

  const daysSinceContact = selectedClient?.last_contact
    ? Math.floor(
        (Date.now() - new Date(selectedClient.last_contact).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSearch(client.name);
    setShowDropdown(false);
    setScript(null);
  };

  const handleGenerate = async () => {
    if (!selectedClient) {
      notify("Select a client first", { type: "warning" });
      return;
    }

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      notify("VITE_ANTHROPIC_API_KEY is not set — see SETUP.md", { type: "error" });
      return;
    }

    const scriptTypeLabel =
      scriptType === "call"
        ? "Phone Call Script"
        : scriptType === "text"
          ? "Text Message"
          : "Email";

    const systemPrompt = `You are writing a personalized ${scriptTypeLabel} for Alpha Insurance Agency in Jackson, MS.

Agent: Amanda Frizell (owner) or Monica Ray (senior agent)
Client: ${selectedClient.name}
Carrier: ${selectedClient.carrier ?? "unknown"}
Product: ${selectedClient.product ?? "unknown"}
Status: ${selectedClient.status}
Premium: ${selectedClient.premium ? `$${selectedClient.premium}/month` : "unknown"}
Last Contact: ${selectedClient.last_contact ? formatDate(selectedClient.last_contact) : "unknown"}${daysSinceContact !== null ? ` (${daysSinceContact} days ago)` : ""}
Additional Context: ${context.trim() || "none"}

Write a warm, personal script that sounds like it was written by a real person who knows this client personally. These are long-term relationships — many clients have been with Alpha Insurance for 8+ years. The tone should be:
- Conversational, not corporate
- Caring, not salesy
- Brief for texts (under 160 chars), conversational for calls, professional for emails
- Reference their specific situation naturally

NEVER mention specific payment amounts, billing issues, or money owed — those go directly to Amanda. If the context involves payment, write only: "Please call Amanda directly at the office for billing questions."

For a text: Just the message (under 160 chars). No labels.
For a call: A natural-sounding script with [optional sections] noted.
For an email: Include subject line, greeting, body, and sign-off.`;

    setGenerating(true);
    setScript(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Write the ${scriptTypeLabel} now.`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      setScript(data.content?.[0]?.text ?? "");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Script generation failed",
        { type: "error" },
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!script) return;
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLog = async () => {
    if (!selectedClient || !script) return;
    setLogging(true);
    const typeMap: Record<ScriptType, string> = {
      call: "Call",
      text: "Text",
      email: "Email",
    };
    try {
      await create("contact_logs", {
        data: {
          client_id: selectedClient.id,
          interaction_type: typeMap[scriptType],
          direction: "Outbound",
          outcome: null,
          notes: `Script generated: ${script.slice(0, 200)}…`,
          logged_by: "Call Script Engine",
        },
      });
      notify("Interaction logged", { type: "success" });
    } catch {
      notify("Failed to log", { type: "error" });
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Call Script Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate personalized scripts for any client
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Client</label>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) setSelectedClient(null);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search by name or phone…"
                className="w-full"
              />
              {showDropdown && clients && clients.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-lg max-h-56 overflow-y-auto">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={() => handleSelectClient(c)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      <div>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {c.carrier ?? ""}
                        </span>
                      </div>
                      <Badge
                        className={`text-xs ${STATUS_COLORS[c.status]}`}
                        variant="outline"
                      >
                        {STATUS_LABELS[c.status]}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Script Type</label>
            <Tabs
              value={scriptType}
              onValueChange={(v) => setScriptType(v as ScriptType)}
            >
              <TabsList>
                {(Object.entries(SCRIPT_TYPE_CONFIG) as [ScriptType, typeof SCRIPT_TYPE_CONFIG[ScriptType]][]).map(
                  ([type, config]) => (
                    <TabsTrigger key={type} value={type} className="flex gap-1.5">
                      <config.icon className="size-3.5" />
                      {config.label}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {SCRIPT_TYPE_CONFIG[scriptType].hint}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Additional context{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. renewal coming up in 30 days, missed last two payments, hasn't renewed in 2 years…"
              className="min-h-20 resize-none"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedClient}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Phone className="size-4 mr-1.5" />
                Generate Script
              </>
            )}
          </Button>
        </div>

        {selectedClient ? (
          <Card className="h-fit">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedClient.name}</p>
                  <Badge
                    className={`text-xs ${STATUS_COLORS[selectedClient.status]}`}
                    variant="outline"
                  >
                    {STATUS_LABELS[selectedClient.status]}
                  </Badge>
                </div>
              </div>
              {[
                ["Carrier", selectedClient.carrier],
                ["Product", selectedClient.product],
                ["Phone", formatPhone(selectedClient.phone)],
                ["Premium", formatCurrency(selectedClient.premium) + "/mo"],
                ["Last Contact", selectedClient.last_contact
                  ? `${formatDate(selectedClient.last_contact)} (${formatRelativeDate(selectedClient.last_contact)})`
                  : "—"],
                ["Policy End", formatDate(selectedClient.policy_end)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs gap-2">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="font-medium text-right truncate">{value ?? "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <User className="size-8 opacity-20" />
            <p className="text-sm">Search for a client to see their info</p>
          </div>
        )}
      </div>

      {script && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">Generated Script</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLog}
                  disabled={logging}
                >
                  {logging ? "Logging…" : "Log as Interaction"}
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap leading-relaxed font-sans">
              {script}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
