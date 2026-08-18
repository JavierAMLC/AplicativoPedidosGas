import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateOrder, useListCustomers, useListDrivers, getListCustomersQueryKey, getListDriversQueryKey, getListOrdersQueryKey, getGetTodaySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/hooks/use-settings";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, User, MapPin, Phone, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Debounce hook
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const formSchema = z.object({
  customerId: z.number().nullable().optional(),
  customerName: z.string().min(1, "Nombre es requerido"),
  customerPhone: z.string().min(1, "Teléfono es requerido"),
  customerAddress: z.string().min(1, "Dirección es requerida"),
  customerReference: z.string().default(""),
  product: z.string().min(1, "Selecciona un producto"),
  quantity: z.coerce.number().int().min(1, "Indica al menos 1 balón"),
  paymentMethod: z.enum(["cash", "yape_plin", "pos_card"], { required_error: "Selecciona método de pago" }),
  cashAmount: z.coerce.number().optional().nullable(),
  totalAmount: z.coerce.number().min(1, "Monto inválido"),
  notes: z.string().default(""),
  driverId: z.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// products now come from settings (see useSettings hook)

const paymentMethods = [
  { id: "cash", label: "Efectivo" },
  { id: "yape_plin", label: "Yape / Plin" },
  { id: "pos_card", label: "Tarjeta POS" }
] as const;

export default function NewOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createOrder = useCreateOrder();
  const { settings } = useSettings();
  const products = settings.products;
  const { data: drivers } = useListDrivers(undefined, {
    query: { queryKey: getListDriversQueryKey(), refetchOnMount: "always" },
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: customers, isLoading: isSearching } = useListCustomers(
    { q: debouncedSearch },
    { query: { queryKey: getListCustomersQueryKey({ q: debouncedSearch }), enabled: debouncedSearch.length >= 2 } }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: null,
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      customerReference: "",
      product: "",
      quantity: 1,
      paymentMethod: "cash",
      cashAmount: null,
      totalAmount: 0,
      notes: "",
      driverId: null,
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const quantity = form.watch("quantity");
  const selectedProduct = products.find((product) => product.name === form.watch("product"));

  useEffect(() => {
    if (selectedProduct?.price && quantity > 0) {
      form.setValue("totalAmount", selectedProduct.price * quantity);
    }
  }, [selectedProduct?.id, selectedProduct?.price, quantity, form]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: any) => {
    form.setValue("customerId", customer.id);
    form.setValue("customerName", customer.name);
    form.setValue("customerPhone", customer.phone);
    form.setValue("customerAddress", customer.address);
    form.setValue("customerReference", customer.reference || "");
    setSearch("");
    setShowDropdown(false);
    toast({
      title: "Cliente autocompletado",
      description: `${customer.name} - ${customer.address}`,
      duration: 3000,
    });
  };

  const onSubmit = (values: FormValues) => {
    // If it's cash and cashAmount is less than total, or missing, we can adjust or warn
    // But since operators are fast, we just trust the inputs or set to null if empty
    createOrder.mutate(
      {
        data: {
          ...values,
          cashAmount: values.paymentMethod === 'cash' ? values.cashAmount : null,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          toast({
            title: "Pedido registrado",
            description: "El pedido ha sido creado exitosamente.",
          });
          setLocation("/");
        },
        onError: () => {
          toast({
            title: "Error",
            description: "No se pudo registrar el pedido.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nuevo Pedido</h1>
        <p className="text-muted-foreground text-sm">Registro rápido de pedido para un cliente.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* SEARCH CARD */}
          <Card className="border-border/60 shadow-sm overflow-visible">
            <CardHeader className="pb-3 bg-muted/20 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Buscar Cliente (Opcional)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 relative" ref={searchRef}>
              <div className="relative">
                <Input
                  placeholder="Buscar por teléfono o nombre..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-9 h-11 text-base bg-background shadow-inner"
                  autoComplete="off"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                {isSearching && debouncedSearch.length >= 2 && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin absolute right-3 top-3.5" />
                )}
              </div>

              {/* DROPDOWN */}
              {showDropdown && search.length >= 2 && (
                <div className="absolute top-full left-4 right-4 mt-1 bg-popover border border-popover-border shadow-xl rounded-md z-50 max-h-64 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
                  ) : customers && customers.length > 0 ? (
                    <div className="py-1">
                      {customers.map((c) => (
                        <div
                          key={c.id}
                          className="px-4 py-2.5 hover:bg-muted cursor-pointer flex flex-col gap-0.5 border-b border-border/50 last:border-0"
                          onClick={() => handleSelectCustomer(c)}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-sm">{c.name}</span>
                            <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">{c.phone}</span>
                          </div>
                          <span className="text-xs text-muted-foreground truncate">{c.address}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron clientes. Se creará uno nuevo.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CUSTOMER DETAILS */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 bg-muted/20 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Datos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. 987654321" type="tel" {...field} className="font-mono text-base h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Juan Pérez" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Av. Los Incas 123" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referencia (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Casa verde frente al parque" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ORDER DETAILS */}
            <div className="space-y-6">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/40">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Detalles del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                  <FormField
                    control={form.control}
                    name="product"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Producto</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {products.map((prod) => (
                            <button
                              type="button"
                              key={prod.id}
                              className={cn(
                                "flex flex-col items-center justify-center py-2 px-3 rounded-md text-sm border font-medium transition-all gap-0.5",
                                field.value === prod.name
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                              )}
                              onClick={() => {
                                field.onChange(prod.name);
                              }}
                            >
                              <span className="flex items-center gap-1">
                                {field.value === prod.name && <Check className="w-3 h-3" />}
                                {prod.name}
                              </span>
                              {prod.price > 0 && (
                                <span className={cn("text-[10px] font-normal", field.value === prod.name ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                  S/ {prod.price.toFixed(2)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 items-start">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem className="w-28">
                          <FormLabel>Balones</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              {...field}
                              className="font-mono text-lg font-bold h-11"
                              onChange={(event) => field.onChange(event.target.valueAsNumber || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="totalAmount"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Total (S/)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              {...field} 
                              className="font-mono text-lg font-bold h-11 text-primary border-primary/30 focus-visible:ring-primary" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Método de Pago</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {paymentMethods.map((pm) => (
                            <button
                              type="button"
                              key={pm.id}
                              className={cn(
                                "flex items-center justify-center py-2 px-2 rounded-md text-xs border font-medium transition-all text-center leading-tight",
                                field.value === pm.id
                                  ? "bg-secondary text-secondary-foreground border-secondary shadow-sm"
                                  : "bg-card text-foreground border-border hover:border-secondary/50 hover:bg-muted/50"
                              )}
                              onClick={() => field.onChange(pm.id)}
                            >
                              {pm.label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {paymentMethod === 'cash' && (
                    <FormField
                      control={form.control}
                      name="cashAmount"
                      render={({ field }) => (
                        <FormItem className="animate-in fade-in slide-in-from-top-2">
                          <FormLabel className="text-secondary font-semibold flex items-center gap-1.5">
                            ¿Con cuánto paga?
                            <span className="text-xs font-normal text-muted-foreground">(Para calcular vuelto)</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              placeholder="Monto entregado por el cliente"
                              {...field} 
                              value={field.value ?? ''}
                              className="font-mono h-11 bg-secondary/5 border-secondary/20 focus-visible:ring-secondary" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ej. Llevar POS, cliente molesto, etc." 
                            className="resize-none h-16 text-sm"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full text-base font-bold h-14 shadow-lg hover-elevate shadow-primary/20"
            disabled={createOrder.isPending}
          >
            {createOrder.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Check className="w-5 h-5 mr-2" />
            )}
            {createOrder.isPending ? "Registrando..." : "REGISTRAR PEDIDO"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
