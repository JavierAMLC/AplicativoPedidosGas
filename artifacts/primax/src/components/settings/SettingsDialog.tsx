import { useState } from "react";
import { Settings as SettingsIcon, Plus, Trash2, Pencil, Check, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

let _idCounter = Date.now();
const newId = () => String(++_idCounter);

export function SettingsDialog() {
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(false);

  // Product editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // New product form
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [addingNew, setAddingNew] = useState(false);

  // WhatsApp number
  const [waNumber, setWaNumber] = useState(settings.whatsappNumber);
  const [senderNumber, setSenderNumber] = useState(settings.whatsappSenderNumber);

  const startEdit = (id: string, name: string, price: number) => {
    setEditingId(id);
    setEditName(name);
    setEditPrice(price > 0 ? String(price) : "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    updateSettings((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === editingId
          ? { ...p, name: editName.trim(), price: parseFloat(editPrice) || 0 }
          : p
      ),
    }));
    cancelEdit();
  };

  const deleteProduct = (id: string) => {
    updateSettings((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const addProduct = () => {
    if (!newName.trim()) return;
    updateSettings((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        { id: newId(), name: newName.trim(), price: parseFloat(newPrice) || 0 },
      ],
    }));
    setNewName("");
    setNewPrice("");
    setAddingNew(false);
  };

  const saveWhatsApp = () => {
    updateSettings((prev) => ({
      ...prev,
      whatsappNumber: waNumber.trim(),
      whatsappSenderNumber: senderNumber.trim(),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Configuración
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* WhatsApp Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#25D366]" />
            <h3 className="font-semibold text-sm">Números de WhatsApp</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Ambos números llevan código de país sin "+" (ej: <span className="font-mono">51987654321</span>).
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Número que recibe el pedido</Label>
              <Input
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="51987654321"
                className="font-mono h-9"
                maxLength={15}
              />
              <Label className="text-xs">Número del negocio que envía (referencia)</Label>
              <Input
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="51987654321"
                className="font-mono h-9"
                maxLength={15}
              />
              <p className="text-[11px] text-muted-foreground">
                WhatsApp decide la cuenta real que envía según la sesión abierta. Este número se agrega al mensaje como referencia; para enviar realmente desde otra cuenta hay que abrir WhatsApp con esa cuenta.
              </p>
              <Button size="sm" onClick={saveWhatsApp} className="w-full h-9 bg-[#25D366] hover:bg-[#1ebe5d] text-white">
                Guardar números
              </Button>
            </div>
            {settings.whatsappNumber && (
              <p className="text-xs text-[#128C7E] font-medium">
                ✓ Recibe: +{settings.whatsappNumber}{settings.whatsappSenderNumber ? ` · Referencia: +${settings.whatsappSenderNumber}` : ""}
              </p>
            )}
          </div>

          <div className="border-t border-border/50" />

          {/* Products Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Productos</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setAddingNew(true)}
              >
                <Plus className="w-3 h-3" />
                Agregar
              </Button>
            </div>

            <div className="space-y-1.5">
              {settings.products.map((product) =>
                editingId === product.id ? (
                  <div key={product.id} className="flex gap-1.5 items-center bg-muted/40 p-2 rounded-md border border-primary/20">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm flex-1"
                      placeholder="Nombre"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">S/</span>
                      <Input
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="h-8 text-sm w-16 font-mono"
                        placeholder="0"
                        type="number"
                        min="0"
                        step="0.5"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      />
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveEdit}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div
                    key={product.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md border border-border/50 hover:bg-muted/30 group"
                  >
                    <span className="text-sm font-medium">{product.name}</span>
                    <div className="flex items-center gap-2">
                      {product.price > 0 && (
                        <span className="text-xs font-mono text-muted-foreground">S/ {product.price.toFixed(2)}</span>
                      )}
                      <div className={cn("flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity")}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => startEdit(product.id, product.name, product.price)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => deleteProduct(product.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Add new product form */}
              {addingNew && (
                <div className="flex gap-1.5 items-center bg-muted/40 p-2 rounded-md border border-dashed border-primary/30 mt-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="Nombre del producto"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') addProduct(); if (e.key === 'Escape') { setAddingNew(false); setNewName(""); setNewPrice(""); } }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">S/</span>
                    <Input
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="h-8 text-sm w-16 font-mono"
                      placeholder="0"
                      type="number"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={addProduct}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setAddingNew(false); setNewName(""); setNewPrice(""); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {settings.products.length === 0 && !addingNew && (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
                  No hay productos. Agrega uno con el botón de arriba.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
