import { useMemo, useState } from "react";
import { Download, Search, CalendarDays, RefreshCw, FileText, FileDown } from "lucide-react";
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

function pdfSafeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function pdfEscape(value: unknown) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function truncatePdfText(value: unknown, maxLength: number) {
  const text = pdfSafeText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

type PdfOrder = {
  id: number;
  createdAt: string;
  product: string;
  quantity: number;
  totalAmount: number;
  status: string;
  notes: string | null;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
};

function createOrdersPdf(date: string, orders: PdfOrder[], totals: { orders: number; quantity: number; revenue: number }) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 32;
  const pages: string[] = [];
  let lines: string[] = [];
  let cursorY = pageHeight - 42;

  const addText = (x: number, y: number, text: unknown, size = 8) => {
    lines.push(`BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`);
  };

  const addRule = (y: number) => {
    lines.push(`0.85 w ${margin} ${y} m ${pageWidth - margin} ${y} l S`);
  };

  const addPageHeader = (isFirstPage: boolean) => {
    lines = [];
    cursorY = pageHeight - 42;
    addText(margin, cursorY, "PRIMAX GAS", 18);
    cursorY -= 24;
    addText(margin, cursorY, `Reporte de pedidos - ${date}`, 10);
    cursorY -= 16;
    if (isFirstPage) {
      addText(margin, cursorY, `Pedidos: ${totals.orders}    Balones: ${totals.quantity}    Ingresos validos: S/ ${totals.revenue.toFixed(2)}`, 9);
    } else {
      addText(margin, cursorY, "Continuacion del reporte", 9);
    }
    cursorY -= 18;
    addRule(cursorY);
    cursorY -= 16;
    addText(32, cursorY, "Pedido", 7);
    addText(66, cursorY, "Hora", 7);
    addText(98, cursorY, "Cliente", 7);
    addText(180, cursorY, "Telefono", 7);
    addText(250, cursorY, "Producto", 7);
    addText(342, cursorY, "Bal.", 7);
    addText(370, cursorY, "Total", 7);
    addText(420, cursorY, "Estado", 7);
    cursorY -= 8;
    addRule(cursorY);
    cursorY -= 18;
  };

  const finishPage = () => {
    addText(pageWidth - 88, 24, `Pagina ${pages.length + 1}`, 7);
    pages.push(lines.join("\n"));
  };

  addPageHeader(true);
  orders.forEach((order) => {
    if (cursorY < 62) {
      finishPage();
      addPageHeader(false);
    }

    addText(32, cursorY, `#${String(order.id).padStart(4, "0")}`, 7.5);
    addText(66, cursorY, format(new Date(order.createdAt), "HH:mm"), 7.5);
    addText(98, cursorY, truncatePdfText(order.customer.name, 16), 7.5);
    addText(180, cursorY, truncatePdfText(order.customer.phone, 13), 7.5);
    addText(250, cursorY, truncatePdfText(order.product, 17), 7.5);
    addText(342, cursorY, order.quantity, 7.5);
    addText(370, cursorY, `S/ ${order.totalAmount.toFixed(2)}`, 7.5);
    addText(420, cursorY, statusLabels[order.status] || order.status, 7.5);
    cursorY -= 11;
    addText(66, cursorY, `Direccion: ${truncatePdfText(order.customer.address, 38)}${order.notes ? ` | Notas: ${truncatePdfText(order.notes, 35)}` : ""}`, 7);
    cursorY -= 18;
  });
  finishPage();

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  pages.forEach((content, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = ["0000000000"];
  objects.forEach((object, index) => {
    offsets.push(String(new TextEncoder().encode(pdf).length).padStart(10, "0"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const crossReferenceOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n${offsets.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${crossReferenceOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

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

  const downloadPdf = () => {
    const blob = createOrdersPdf(date, filteredOrders, totals);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-pedidos-${date}.pdf`;
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
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadCsv} disabled={!filteredOrders.length} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Descargar CSV
          </Button>
          <Button onClick={downloadPdf} disabled={!filteredOrders.length} className="gap-2">
            <FileDown className="w-4 h-4" />
            Descargar PDF
          </Button>
        </div>
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