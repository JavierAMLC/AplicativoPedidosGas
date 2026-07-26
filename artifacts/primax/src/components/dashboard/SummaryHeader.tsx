import { useGetTodaySummary } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle2, Clock, Truck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SummaryHeader() {
  const { data: summary, isLoading } = useGetTodaySummary({
    query: {
      refetchInterval: 30000 // refresh every 30s
    }
  });

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Total Hoy</p>
            <h2 className="text-2xl font-bold font-mono">{summary.totalOrders}</h2>
          </div>
          <div className="p-2 bg-secondary/10 rounded-full text-secondary">
            <Activity className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-destructive/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-destructive mb-1 uppercase tracking-wider">Pendientes</p>
            <h2 className="text-2xl font-bold font-mono text-destructive">{summary.pending}</h2>
          </div>
          <div className="p-2 bg-destructive/10 rounded-full text-destructive">
            <Clock className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-primary/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-primary mb-1 uppercase tracking-wider">En Camino</p>
            <h2 className="text-2xl font-bold font-mono text-primary">{summary.inTransit}</h2>
          </div>
          <div className="p-2 bg-primary/10 rounded-full text-primary">
            <Truck className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-emerald-500/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 mb-1 uppercase tracking-wider">Entregados</p>
            <h2 className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-500">{summary.delivered}</h2>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-accent/50 col-span-2 md:col-span-1">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Ingresos</p>
            <h2 className="text-2xl font-bold font-mono text-foreground flex items-baseline">
              <span className="text-sm font-sans mr-1 text-muted-foreground">S/</span>
              {summary.totalRevenue.toFixed(2)}
            </h2>
          </div>
          <div className="p-2 bg-accent rounded-full text-accent-foreground">
            <TrendingUp className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
