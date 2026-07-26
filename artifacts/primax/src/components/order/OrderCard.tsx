import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Order, OrderStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, MessageCircle, ArrowRight, User, Package, CreditCard, Banknote } from "lucide-react";
import { useUpdateOrderStatus, getListOrdersQueryKey, getGetTodaySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pendiente",
  in_transit: "En camino",
  delivered: "Entregado",
};

const paymentLabels: Record<string, string> = {
  cash: "Efectivo",
  yape_plin: "Yape / Plin",
  pos_card: "Tarjeta POS",
};

export function OrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateOrderStatus();

  const handleNextStatus = () => {
    let nextStatus: OrderStatus | null = null;
    if (order.status === "pending") nextStatus = "in_transit";
    else if (order.status === "in_transit") nextStatus = "delivered";
    
    if (nextStatus) {
      updateStatus.mutate(
        { id: order.id, data: { status: nextStatus } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          }
        }
      );
    }
  };

  const generateWhatsAppLink = () => {
    const text = `📦 NUEVO PEDIDO DE GAS
👤 Cliente: ${order.customer.name} / ${order.customer.phone}
📍 Dirección: ${order.customer.address}
📌 Referencia: ${order.customer.reference}
🔥 Producto: ${order.product}
💳 Pago: ${paymentLabels[order.paymentMethod] || order.paymentMethod}${order.paymentMethod === 'cash' && order.cashAmount ? ` (Paga con S/ ${order.cashAmount})` : ''}
💵 Total: S/ ${order.totalAmount.toFixed(2)}`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const isPending = updateStatus.isPending;

  return (
    <Card className="flex flex-col h-full shadow-sm hover-elevate transition-all border-border/60">
      <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0 bg-muted/20 border-b border-border/40">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span>#{order.id.toString().padStart(4, '0')}</span>
            <span>•</span>
            <span>{format(new Date(order.createdAt), "HH:mm")}</span>
          </div>
          <h3 className="font-semibold text-sm flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-primary" />
            {order.customer.name}
          </h3>
        </div>
        <Badge variant={
          order.status === 'pending' ? "destructive" :
          order.status === 'in_transit' ? "default" : "secondary"
        } className="text-[10px] uppercase tracking-wider py-0.5">
          {statusLabels[order.status]}
        </Badge>
      </CardHeader>
      
      <CardContent className="p-3 pt-3 flex-1 flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-mono text-xs">{order.customer.phone}</span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="leading-snug">{order.customer.address}</span>
              {order.customer.reference && (
                <span className="text-xs text-muted-foreground/70 leading-snug mt-0.5">Ref: {order.customer.reference}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-muted/30 rounded-md p-2 flex flex-col gap-1.5 mt-auto">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              {order.product}
            </span>
            <span className="font-mono font-bold text-primary">
              S/ {order.totalAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {order.paymentMethod === 'cash' ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
              {paymentLabels[order.paymentMethod]}
            </span>
            {order.paymentMethod === 'cash' && order.cashAmount && (
              <span className="text-muted-foreground">
                Vuelto: S/ {(order.cashAmount - order.totalAmount).toFixed(2)}
              </span>
            )}
          </div>
        </div>
        
        {order.notes && (
          <div className="text-xs text-muted-foreground italic bg-accent/50 p-1.5 rounded border border-accent">
            "{order.notes}"
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-2 border-t border-border/40 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs gap-1.5 bg-[#25D366]/10 text-[#128C7E] border-[#25D366]/30 hover:bg-[#25D366]/20 hover:text-[#075E54]"
          onClick={() => window.open(generateWhatsAppLink(), '_blank')}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Enviar
        </Button>
        {order.status !== "delivered" && (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full text-xs gap-1.5"
            onClick={handleNextStatus}
            disabled={isPending}
          >
            {order.status === 'pending' ? 'En Camino' : 'Entregado'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
