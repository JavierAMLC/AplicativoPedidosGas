import { useMemo, useState } from "react";
import { Download, Search, CalendarDays, RefreshCw, FileText } from "lucide-react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

function peruToday() {
  const date = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_transit: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const statusClasses: Record<string, string> = {
  pending: "bg-destructive/10 text-destructive",
  in_transit: "bg-primary/10 text-primary",
  delivered: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-muted text-muted-foreground",
};

export default function History() {
  const [date, setDate] = useState(peruToday);
  const [search, setSearch] = useState("");
  const { data: orders, isLoading, isFetching, refetch } = useListOrders(
    { date },
    { query: { queryKey: getListOrdersQueryKey({ date }), refetchOnMount: "always" } },
  );

  const filteredOrders = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return orders || [];
    return (orders || []).filter((order) =>
      [order.customer.name, order.customer.phone, order.customer.address, order.product]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [orders, search]);

  const totals = useMemo(() => ({
    orders: filteredOrders.length,
    quantity: filteredOrders.reduce((sum, order) => sum + order.quantity, 0),
    revenue: filteredOrders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + order.totalAmount, 0),
  }), [filteredOrders]);

  const downloadCsv = () => {
    const headers = ["Pedido", "Hora", "Cliente", "Teléfono", "Dirección", "Producto", "Balones", "Pago", "Total", "Estado", "Notas"];
    const rows = filteredOrders.map((order) => [
      order.id,
      format(new Date(order.createdAt), "HH:mm"),
      order.customer.name,
      order.customer.phone,
      order.customer.address,
      order.product,
      order.quantity,
      order.paymentMethod,
      order.totalAmount.toFixed(2),
      statusLabels[order.status] || order.status,
      order.notes || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-pedidos-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial y reportes</h1>
          <p className="text-sm text-muted-foreground">Consulta los pedidos de cualquier día y descarga un reporte.</p>
        </div>
        <Button onClick={downloadCsv} disabled={!filteredOrders.length} className="gap-2">
          <Download className="w-4 h-4" />
          Descargar CSV
        </Button>
      </div>

      <Card className="mb-6 border-border/60">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="space-y-1.5">
            <label htmlFor="history-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Día de consulta</label>
            <div className="relative">
              <CalendarDays className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input id="history-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="pl-9 w-full md:w-48" />
            </div>
          </div>
          <div className="space-y-1.5 flex-1">
            <label htmlFor="history-search" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input id="history-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, teléfono, dirección o producto..." className="pl-9" />
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Pedidos</p><p className="text-2xl font-bold font-mono">{totals.orders}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Balones</p><p className="text-2xl font-bold font-mono">{totals.quantity}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Ingresos válidos</p><p className="text-2xl font-bold font-mono">S/ {totals.revenue.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Pedidos del {date}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Consultando pedidos...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No hay pedidos para este día o búsqueda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Pedido</th>
                    <th className="text-left px-4 py-3">Cliente</th>
                    <th className="text-left px-4 py-3">Producto</th>
                    <th className="text-center px-4 py-3">Balones</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-left px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">#{String(order.id).padStart(4, "0")}<br /><span className="text-muted-foreground">{format(new Date(order.createdAt), "HH:mm")}</span></td>
                      <td className="px-4 py-3"><span className="font-medium">{order.customer.name}</span><br /><span className="text-xs text-muted-foreground">{order.customer.phone}</span></td>
                      <td className="px-4 py-3">{order.product}</td>
                      <td className="px-4 py-3 text-center font-mono">{order.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">S/ {order.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3"><Badge className={`border-0 ${statusClasses[order.status] || ""}`}>{statusLabels[order.status] || order.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}