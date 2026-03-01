import { useState } from "react";
import { Link } from "wouter";
import { useCreateProduct } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle } from "lucide-react";

export default function AddProduct() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
    brand: "",
    category: "",
    stock: "0",
  });

  const createProduct = useCreateProduct();
  const { toast } = useToast();
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.name === "image") {
      setImagePreviewError(false);
      setSelectedImageName("");
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLocalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = typeof reader.result === "string" ? reader.result : "";
      setForm((prev) => ({ ...prev, image: imageData }));
      setImagePreviewError(false);
      setSelectedImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!form.image.trim()) {
        toast({ title: "Imagen requerida", description: "Agrega una URL o selecciona un archivo local.", variant: "destructive" });
        return;
      }

      const slug = form.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      await createProduct.mutateAsync({
        name: form.name,
        description: form.description,
        brand: form.brand,
        slug,
        price: form.price,
        category: form.category,
        stock: Number(form.stock) || 0,
        images: [form.image],
        specs: {},
        badges: [],
      });
      toast({ title: "Producto creado", description: "El producto se ha creado correctamente." });
      setForm({ name: "", price: "", description: "", image: "", brand: "", category: "", stock: "0" });
      setImagePreviewError(false);
      setSelectedImageName("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo crear el producto.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Nuevo producto</h1>
            <p className="text-muted-foreground mt-1">Completa la información para agregarlo al catálogo.</p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4" />
              Volver al panel
            </Link>
          </Button>
        </div>

        <Card className="border-border/60 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle>Información del producto</CardTitle>
            <CardDescription>Los campos marcados son obligatorios para publicar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" placeholder="Ej: ProBook X1 Profesional" value={form.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio</Label>
                  <Input id="price" name="price" placeholder="1299.99" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input id="brand" name="brand" placeholder="HP, Asus, Lenovo..." value={form.brand} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Input id="category" name="category" placeholder="Juegos, Ultraligera, Trabajo..." value={form.category} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input id="stock" name="stock" placeholder="0" type="number" min="0" value={form.stock} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">URL de imagen</Label>
                  <Input id="image" name="image" placeholder="https://..." value={form.image.startsWith("data:") ? "" : form.image} onChange={handleChange} />
                  <p className="text-xs text-muted-foreground">También puedes usar un archivo local (abajo).</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageFile">Imagen local</Label>
                  <Input id="imageFile" name="imageFile" type="file" accept="image/*" onChange={handleLocalImageChange} />
                  {selectedImageName ? (
                    <p className="text-xs text-muted-foreground">Archivo seleccionado: {selectedImageName}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Selecciona JPG, PNG o WEBP desde tu equipo.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe características clave, uso recomendado y ventajas."
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  className="resize-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Vista previa de imagen</Label>
                <div className="border rounded-lg bg-slate-50 min-h-56 flex items-center justify-center p-4">
                  {form.image && !imagePreviewError ? (
                    <img
                      src={form.image}
                      alt="Vista previa del producto"
                      className="max-h-52 w-auto object-contain rounded"
                      onError={() => setImagePreviewError(true)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      {form.image
                        ? "No se pudo cargar la imagen. Verifica la URL o selecciona otro archivo."
                        : "Pega una URL o selecciona una imagen local para ver la vista previa."}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={createProduct.isPending} className="min-w-44 gap-2">
                  <PlusCircle className="w-4 h-4" />
                  {createProduct.isPending ? "Creando..." : "Crear producto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
