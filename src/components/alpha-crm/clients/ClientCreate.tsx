import { useState } from "react";
import { useCreate, useNotify } from "ra-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ClientStatus } from "../types";

interface ClientCreateProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const STATUSES: { value: ClientStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "LAPSED", label: "Lapsed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ClientCreate({ open, onClose, onCreated }: ClientCreateProps) {
  const notify = useNotify();
  const [create, { isPending }] = useCreate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dob: "",
    policy_number: "",
    carrier: "",
    product: "",
    status: "ACTIVE" as ClientStatus,
    policy_start: "",
    policy_end: "",
    premium: "",
  });

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify("Client name is required", { type: "error" });
      return;
    }
    try {
      await create(
        "clients",
        {
          data: {
            ...form,
            phone: form.phone || null,
            email: form.email || null,
            dob: form.dob || null,
            policy_number: form.policy_number || null,
            carrier: form.carrier || null,
            product: form.product || null,
            policy_start: form.policy_start || null,
            policy_end: form.policy_end || null,
            premium: form.premium || null,
            opt_out: false,
          },
        },
        {
          returnPromise: true,
        },
      );
      notify("Client created", { type: "success" });
      onCreated?.();
      onClose();
      setForm({
        name: "",
        phone: "",
        email: "",
        dob: "",
        policy_number: "",
        carrier: "",
        product: "",
        status: "ACTIVE",
        policy_start: "",
        policy_end: "",
        premium: "",
      });
    } catch {
      notify("Failed to create client", { type: "error" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Client</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 pb-8">
          <div className="space-y-1">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder="(601) 555-1234"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={(e) => set("dob")(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <hr className="my-2" />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="policy_number">Policy #</Label>
              <Input
                id="policy_number"
                value={form.policy_number}
                onChange={(e) => set("policy_number")(e.target.value)}
                placeholder="POL-123456"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="carrier">Carrier</Label>
              <Input
                id="carrier"
                value={form.carrier}
                onChange={(e) => set("carrier")(e.target.value)}
                placeholder="AETNA"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="product">Product</Label>
              <Input
                id="product"
                value={form.product}
                onChange={(e) => set("product")(e.target.value)}
                placeholder="Medicare Advantage"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="policy_start">Policy Start</Label>
              <Input
                id="policy_start"
                type="date"
                value={form.policy_start}
                onChange={(e) => set("policy_start")(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="policy_end">Policy End</Label>
              <Input
                id="policy_end"
                type="date"
                value={form.policy_end}
                onChange={(e) => set("policy_end")(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="premium">Monthly Premium</Label>
            <Input
              id="premium"
              type="number"
              step="0.01"
              min="0"
              value={form.premium}
              onChange={(e) => set("premium")(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Creating…" : "Create Client"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
