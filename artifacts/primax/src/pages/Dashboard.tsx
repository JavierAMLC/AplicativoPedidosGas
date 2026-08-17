import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { SummaryHeader } from "@/components/dashboard/SummaryHeader";
import { OrderCard } from "@/components/order/OrderCard";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  // No enviamos `date` — el servidor usa su reloj UTC, que coincide con los timestamps guardados.
  // Pasar la fecha local del cliente causaría un desfase de zona horaria (Perú UTC-5).
  const { data: orders, isLoading, error, refetch, isRefetching } = useListOrders(
    {},
    {
      query: {
        queryKey: getListOrdersQueryKey({}),
        refetchInterval: 15000,
        refetchOnMount: "always",
      }
    }
  );

  const sortedOrders = orders ? [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];
  const pending = sortedOrders.filter(o => o.status === 'pending');
  const inTransit = sortedOrders.filter(o => o.status === 'in_transit');
  const delivered = sortedOrders.filter(o => o.status === 'delivered');

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tablero del Día</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()} 
          disabled={isRefetching}
          className="gap-2 text-xs"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      <SummaryHeader />

      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-destructive bg-destructive/5 rounded-lg border border-destructive/20">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="font-medium">Error al cargar pedidos</p>
          <p className="text-sm opacity-80">Por favor, intenta nuevamente.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(col => (
            <div key={col} className="space-y-4">
              <div className="h-8 bg-muted/50 rounded-md w-1/3 animate-pulse"></div>
              {[1, 2, 3].map(card => (
                <div key={card} className="h-48 bg-muted/30 rounded-xl border border-border/50 animate-pulse"></div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
          {/* Column: Pendiente */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-destructive/20 sticky top-[72px] bg-background/95 backdrop-blur-sm z-10 pt-2">
              <h2 className="font-bold text-destructive flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div>
                Pendientes
              </h2>
              <span className="bg-destructive/10 text-destructive text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                {pending.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 max-h-[calc(100dvh-315px)] overflow-y-auto overscroll-contain pr-2">
              {pending.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                  No hay pedidos pendientes
                </div>
              ) : (
                pending.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          {/* Column: En Camino */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-primary/20 sticky top-[72px] bg-background/95 backdrop-blur-sm z-10 pt-2">
              <h2 className="font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                En Camino
              </h2>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                {inTransit.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 max-h-[calc(100dvh-315px)] overflow-y-auto overscroll-contain pr-2">
              {inTransit.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                  No hay pedidos en camino
                </div>
              ) : (
                inTransit.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          {/* Column: Entregado */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 sticky top-[72px] bg-background/95 backdrop-blur-sm z-10 pt-2">
              <h2 className="font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Entregados
              </h2>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                {delivered.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 max-h-[calc(100dvh-315px)] overflow-y-auto overscroll-contain pr-2 opacity-70 hover:opacity-100 transition-opacity">
              {delivered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                  No hay pedidos entregados
                </div>
              ) : (
                delivered.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
