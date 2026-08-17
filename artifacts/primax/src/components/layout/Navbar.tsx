import { Link, useLocation } from "wouter";
import { Flame, LayoutDashboard, PlusCircle, History as HistoryIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

export function Navbar() {
  const [location] = useLocation();

  return (
    <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">PRIMAX GAS</span>
        </div>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted/50",
              location === "/" 
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tablero
          </Link>
          <SettingsDialog />
          <Link
            href="/historial"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted/50",
              location === "/historial"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HistoryIcon className="w-4 h-4" />
            Historial
          </Link>
          <Link
            href="/nuevo"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted/50",
              location === "/nuevo" 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
            )}
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo Pedido
          </Link>
        </nav>
      </div>
    </div>
  );
}
