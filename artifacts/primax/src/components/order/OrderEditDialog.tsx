import { useEffect, useState } from "react";
import { Edit3, Loader2, Save } from "lucide-react";
import { Order, OrderStatus, PaymentMethod, useUpdateOrder, getListOrdersQueryKey, getGetTodaySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const paymentMethods: Array<{ id: PaymentMethod; label: string }> = [
  { id: "cash", label: "Efectivo" },
  { id: "yape_plin", label: "Yape / Plin" },
  { id: "pos_card", label: "Yape / Plin" },
];

export function OrderEditDialog({ order }: { order: Order }) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateOrder = useUpdateOrder();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(order.customer.name);
  const [phone, setPhone] = useState(order.customer.phone);
  const [address, setAddress] = useState(order.customer.address);
  const [reference, setReference] = useState(order.customer.reference || "");
  const [product, setProduct] = useState(order.product);
  const [quantity, setQuantity] = useState(order.quantity);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.paymentMethod);
  const [cashAmount, setCashAmount] = useState(order.cashAmount?.toString() || "");
  const [totalAmount, setTotalAmount] = useState(order.totalAmount.toString());
  const [notes, setNotes] = useState(order.notes || "");

  useEffect(() => {
    if (!open) return;
    setName(order.customer.name);
    setPhone(order.customer.phone);
    setAddress(order.customer.address);
    setReference(order.customer.reference || "");
    setProduct(order.product);
    setQuantity(order.quantity);
    setPaymentMethod(order.paymentMethod);
    setCashAmount(order.cashAmount?.toString() || "");
    setTotalAmount(order.totalAmount.toString());
    setNotes(order.notes || "");
  }, [open, order]);

  useEffect(() => {
    const selected = settings.products.find((item) => item.name === product);
    if (selected?.price && quantity > 0) {
      setTotalAmount(String(selected.price * quantity));
    }
  }, [product, quantity, settings.products]);

  const save = () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !product.trim() || quantity < 1) {
      toast({
        title: "Completa los datos del pedido",
        description: "Nombre, teléfono, dirección, producto y cantidad son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    updateOrder.mutate(
      {
        id: order.id,
        data: {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          customerReference: reference.trim(),
          product: product.trim(),
          quantity,
          paymentMethod,
          cashAmount: paymentMethod === "cash" && cashAmount ? Number(cashAmount) : null,
          totalAmount: Number(totalAmount),
          notes: notes.trim() || null,
          status: order.status,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          setOpen(false);
          toast({ title: "Pedido actualizado", description: "Los cambios se guardaron correctamente." });
        },
        onError: () => {
          toast({ title: "No se pudo actualizar", description: "Revisa los datos e inténtalo nuevamente.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
          <Edit3 className="w-3 h-3" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pedido #{String(order.id).padStart(4, "0")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Card className="border-border/60">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Dirección</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Referencia</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Producto</Label>
            <div className="grid grid-cols-2 gap-2">
              {settings.products.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProduct(item.name)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    product === item.name ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                  )}
                >
                  {item.name}
                  {item.price > 0 && <span className="block text-[11px] opacity-75">S/ {item.price.toFixed(2)}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Balones</Label>
              <Input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total (S/)</Label>
              <Input type="number" min="0" step="0.1" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="font-mono font-bold" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium",
                    paymentMethod === method.id ? "bg-secondary text-secondary-foreground border-secondary" : "hover:bg-muted",
                  )}
                >
                  {method.id === "pos_card" ? "Tarjeta POS" : method.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-1.5">
              <Label>¿Con cuánto paga?</Label>
              <Input type="number" min="0" step="0.1" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
          </div>

          <Button className="w-full gap-2" onClick={save} disabled={updateOrder.isPending}>
            {updateOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {updateOrder.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}