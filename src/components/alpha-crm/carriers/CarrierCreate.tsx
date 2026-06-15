import { useState } from "react";
import { useCreate, useNotify } from "ra-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

interface CarrierCreateProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CarrierCreate({ open, onClose, onCreated }: CarrierCreateProps) {
  const notify = useNotify();
  const [create, { isPending }] = useCreate();

  const [form, setForm] = useState({
    carrier_name: "",
    carrier_code: "",
    portal_url: "",
    commission_rate: "",
    am_contact_name: "",
    am_contact_phone: "",
    am_contact_email: "",
    active: true,
  });

  const set = (field: keyof typeof form) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.carrier_name.trim()) {
      notify("Carrier name is required", { type: "error" });
      return;
    }
    try {
      await create(
        "carriers",
        {
          data: {
            carrier_name: form.carrier_name,
            carrier_code: form.carrier_code || null,
            portal_url: form.portal_url || null,
            commission_rate: form.commission_rate
              ? parseFloat(form.commission_rate)
              : null,
            am_contact_name: form.am_contact_name || null,
            am_contact_phone: form.am_contact_phone || null,
            am_contact_email: form.am_contact_email || null,
            active: form.active,
            products_offered: [],
          },
        },
        { returnPromise: true },
      );
      notify("Carrier added", { type: "success" });
      onCreated?.();
      onClose();
    } catch {
      notify("Failed to add carrier", { type: "error" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Carrier</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="carrier_name">Carrier Name *</Label>
              <Input
                id="carrier_name"
                value={form.carrier_name}
                onChange={(e) => set("carrier_name")(e.target.value)}
                placeholder="Humana"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="carrier_code">Code</Label>
              <Input
                id="carrier_code"
                value={form.carrier_code}
                onChange={(e) => set("carrier_code")(e.target.value)}
                placeholder="HUM"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="portal_url">Portal URL</Label>
            <Input
              id="portal_url"
              type="url"
              value={form.portal_url}
              onChange={(e) => set("portal_url")(e.target.value)}
              placeholder="https://agent.humana.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="commission_rate">Commission Rate (%)</Label>
            <Input
              id="commission_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.commission_rate}
              onChange={(e) => set("commission_rate")(e.target.value)}
              placeholder="15.00"
            />
          </div>

          <hr />
          <p className="text-sm font-medium text-muted-foreground">AM Contact</p>

          <div className="space-y-1">
            <Label htmlFor="am_contact_name">Name</Label>
            <Input
              id="am_contact_name"
              value={form.am_contact_name}
              onChange={(e) => set("am_contact_name")(e.target.value)}
              placeholder="Sarah Johnson"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="am_contact_phone">Phone</Label>
              <Input
                id="am_contact_phone"
                type="tel"
                value={form.am_contact_phone}
                onChange={(e) => set("am_contact_phone")(e.target.value)}
                placeholder="(800) 555-1234"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="am_contact_email">Email</Label>
              <Input
                id="am_contact_email"
                type="email"
                value={form.am_contact_email}
                onChange={(e) => set("am_contact_email")(e.target.value)}
                placeholder="sarah@humana.com"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(v) => set("active")(v)}
            />
            <Label htmlFor="active">Active carrier</Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Adding…" : "Add Carrier"}
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
