import { useState } from "react";
import { useGetList, useCreate, useNotify } from "ra-core";
import {
  MessageCircle,
  AlertTriangle,
  Loader2,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Client } from "../types";
import { formatPhone, formatCurrency } from "../utils";

type Classification =
  | "OPT_OUT"
  | "NOT_INTERESTED"
  | "HOT_LEAD"
  | "INTERESTED"
  | "PAYMENT_INTENT"
  | "CALLBACK_REQUEST"
  | "GENERAL";

interface AnalysisResult {
  classification: Classification;
  confidence: "high" | "medium" | "low";
  suggested_action: string;
}

const CLASSIFICATION_LABELS: Record<Classification, string> = {
  OPT_OUT: "Opt-Out Request",
  NOT_INTERESTED: "Not Interested",
  HOT_LEAD: "Hot Lead",
  INTERESTED: "Interested",
  PAYMENT_INTENT: "Payment Intent",
  CALLBACK_REQUEST: "Callback Request",
  GENERAL: "General",
};

const CLASSIFICATION_COLORS: Record<Classification, string> = {
  OPT_OUT: "bg-red-100 text-red-800 border-red-200",
  NOT_INTERESTED: "bg-gray-100 text-gray-700 border-gray-200",
  HOT_LEAD: "bg-emerald-100 text-emerald-800 border-emerald-200",
  INTERESTED: "bg-blue-100 text-blue-700 border-blue-200",
  PAYMENT_INTENT: "bg-amber-100 text-amber-800 border-amber-200",
  CALLBACK_REQUEST: "bg-violet-100 text-violet-700 border-violet-200",
  GENERAL: "bg-gray-100 text-gray-600 border-gray-200",
};

export function ReplyAnalyzer() {
  const notify = useNotify();
  const [create] = useCreate();

  const [replyText, setReplyText] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [matchedClient, setMatchedClient] = useState<Client | null>(null);
  const [addingToStop, setAddingToStop] = useState(false);

  const { data: clients } = useGetList<Client>("clients", {
    filter: {},
    pagination: { page: 1, perPage: 5000 },
    sort: { field: "name", order: "ASC" },
  });

  const findClientByPhone = (phone: string): Client | null => {
    if (!phone || !clients) return null;
    const digits = phone.replace(/\D/g, "");
    return (
      clients.find((c) => {
        const cd = (c.phone ?? "").replace(/\D/g, "");
        return cd === digits || cd.slice(-10) === digits.slice(-10);
      }) ?? null
    );
  };

  const handleAnalyze = async () => {
    if (!replyText.trim()) {
      notify("Paste a reply to analyze", { type: "warning" });
      return;
    }

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      notify(
        "VITE_ANTHROPIC_API_KEY is not set — see SETUP.md",
        { type: "error" },
      );
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setMatchedClient(null);

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
          max_tokens: 500,
          system: `You are classifying SMS replies for Alpha Insurance Agency in Jackson, MS.
Classify the reply into exactly one category:
- OPT_OUT: Client wants to stop receiving messages (stop, unsubscribe, remove me, don't text, take me off)
- NOT_INTERESTED: Client declines but doesn't opt out (no thanks, not right now, I'm good)
- HOT_LEAD: Client shows strong buying intent (yes, I need coverage, when can we meet, sign me up, I want to get coverage)
- INTERESTED: Client shows mild interest (tell me more, what are the rates, maybe, what do you offer)
- PAYMENT_INTENT: Client mentions payment, billing, premium, money, or account balance (when is my payment, how much do I owe, can I pay, billing question, my account)
- CALLBACK_REQUEST: Client wants a call back (call me, can you call, what's your number, please call)
- GENERAL: Everything else (questions, greetings, unrelated messages)

Respond in JSON only: {"classification": "...", "confidence": "high|medium|low", "suggested_action": "..."}`,
          messages: [{ role: "user", content: replyText.trim() }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text ?? "{}";
      const parsed: AnalysisResult = JSON.parse(text);
      setResult(parsed);

      if (phoneInput) {
        setMatchedClient(findClientByPhone(phoneInput));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      notify(msg, { type: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToStopList = async () => {
    const phone = phoneInput.trim() || matchedClient?.phone;
    if (!phone) {
      notify("Enter a phone number to add to the stop list", { type: "warning" });
      return;
    }
    setAddingToStop(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const normalized =
        digits.length === 10 ? `+1${digits}` :
        digits.length === 11 && digits[0] === "1" ? `+${digits}` :
        phone.trim();
      await create("stop_list", {
        data: {
          phone: normalized,
          reason: "Opted Out",
          added_by: "Reply Analyzer",
        },
      });
      notify("Added to stop list", { type: "success" });
    } catch {
      notify("Failed to add to stop list", { type: "error" });
    } finally {
      setAddingToStop(false);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!matchedClient) {
      notify("Match the reply to a client first to create a follow-up", {
        type: "info",
      });
      return;
    }
    try {
      await create("follow_ups", {
        data: {
          client_id: matchedClient.id,
          client_name: matchedClient.name,
          follow_up_type: "general",
          scheduled_date: new Date().toISOString().split("T")[0],
          priority: "high",
          completed: false,
          notes: `Reply analyzer: ${result?.suggested_action ?? "Follow up needed"}`,
          assigned_to: null,
        },
      });
      notify("Follow-up created", { type: "success" });
    } catch {
      notify("Failed to create follow-up", { type: "error" });
    }
  };

  const handleLogInteraction = async () => {
    if (!matchedClient) {
      notify("Match the reply to a client first to log interaction", {
        type: "info",
      });
      return;
    }
    try {
      await create("contact_logs", {
        data: {
          client_id: matchedClient.id,
          interaction_type: "Text",
          direction: "Inbound",
          outcome: null,
          notes: replyText.trim(),
          logged_by: "Reply Analyzer",
        },
      });
      notify("Interaction logged", { type: "success" });
    } catch {
      notify("Failed to log interaction", { type: "error" });
    }
  };

  const confidenceColor =
    result?.confidence === "high"
      ? "text-emerald-600"
      : result?.confidence === "medium"
        ? "text-amber-600"
        : "text-gray-500";

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Reply Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Classify client SMS replies and take the right action
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Client reply text</label>
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Paste the client's reply here…"
            className="min-h-28 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Client phone number{" "}
            <span className="text-muted-foreground font-normal">
              (optional — to match client)
            </span>
          </label>
          <Input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="(601) 555-1234"
            className="max-w-56"
          />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={analyzing || !replyText.trim()}
        >
          {analyzing ? (
            <>
              <Loader2 className="size-4 mr-1.5 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <MessageCircle className="size-4 mr-1.5" />
              Analyze Reply
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Classification Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Classification
                  </p>
                  <Badge
                    className={`text-sm px-3 py-1 ${CLASSIFICATION_COLORS[result.classification]}`}
                  >
                    {CLASSIFICATION_LABELS[result.classification]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Confidence
                  </p>
                  <p className={`text-sm font-semibold capitalize ${confidenceColor}`}>
                    {result.confidence}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Action
                </p>
                <p className="text-sm">{result.suggested_action}</p>
              </div>

              {result.classification === "PAYMENT_INTENT" && (
                <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="size-5 text-amber-600" />
                    <p className="font-semibold text-amber-900">
                      Payment Question Detected
                    </p>
                  </div>
                  <p className="text-sm text-amber-800 mb-3">
                    This client has a payment inquiry. Route to Amanda
                    immediately — do not attempt to answer billing questions
                    without her.
                  </p>
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    <ArrowRight className="size-4 mr-1.5" />
                    Route to Amanda
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {result.classification === "OPT_OUT" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleAddToStopList}
                    disabled={addingToStop}
                  >
                    {addingToStop ? "Adding…" : "Add to Stop List"}
                  </Button>
                )}
                {(result.classification === "CALLBACK_REQUEST" ||
                  result.classification === "INTERESTED" ||
                  result.classification === "HOT_LEAD") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateFollowUp}
                  >
                    Create Follow-Up
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogInteraction}
                >
                  Log Interaction
                </Button>
              </div>
            </CardContent>
          </Card>

          {matchedClient ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4" />
                  Matched Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{matchedClient.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carrier</p>
                    <p>{matchedClient.carrier ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p>{matchedClient.product ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p>{matchedClient.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p>{formatPhone(matchedClient.phone)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Premium</p>
                    <p>{formatCurrency(matchedClient.premium)}/mo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : phoneInput && (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              No client matched for {formatPhone(phoneInput)}
            </div>
          )}
        </div>
      )}

      {!result && !analyzing && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <MessageCircle className="size-10 opacity-20" />
          <div className="text-center text-sm">
            <p className="font-medium">Paste a reply and click Analyze</p>
            <p className="opacity-60 mt-1">
              Powered by Claude — classifies intent in seconds
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
