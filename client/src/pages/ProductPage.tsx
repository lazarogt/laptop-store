import { useState } from "react";
import { useParams, Link } from "wouter";
import { useProduct, useCreateReview } from "@/hooks/use-products";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { Rating } from "@/components/common/Rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/utils/formatCurrency";
import { ShoppingCart, Heart, ShieldCheck, Truck, Check, AlertCircle } from "lucide-react";
import { useForm } from "react-form"; // Just a simple custom form approach or standard react states

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, error } = useProduct(slug || "");
  const [quantity, setQuantity] = useState(1);
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const submitReview = useCreateReview(product?.id || 0);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8 w-full"><Skeleton className="h-[60vh] w-full rounded-2xl" /></div>
      <Footer />
    </div>
  );

  if (error || !product) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-32 text-center flex-1">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Product not found</h2>
        <p className="text-muted-foreground mb-6">The laptop you are looking for does not exist or has been removed.</p>
        <Button asChild><Link href="/">Return to Home</Link></Button>
      </div>
      <Footer />
    </div>
  );

  const images = product.images?.length > 0 ? product.images : ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=80"];
  const inWishlist = isInWishlist(product.id);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReview.mutate({ rating: reviewRating, comment: reviewComment }, {
      onSuccess: () => { setReviewComment(""); setReviewRating(5); }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumbs */}
        <div className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link href={`/category/${product.category}`} className="hover:text-primary capitalize">{product.category}</Link>
          <span>/</span>
          <span className="text-foreground truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Left: Gallery */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="aspect-square bg-white border rounded-2xl flex items-center justify-center p-8 relative overflow-hidden">
              <img 
                src={images[mainImageIdx]} 
                alt={product.name} 
                className="w-full h-full object-contain"
              />
              {product.badges?.map((badge, i) => (
                <Badge key={i} className={`absolute top-4 left-4 ${badge.includes('Oferta') ? 'bg-destructive' : 'bg-primary'}`}>
                  {badge}
                </Badge>
              ))}
            </div>
            {images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setMainImageIdx(idx)}
                    className={`flex-shrink-0 w-20 h-20 bg-white border-2 rounded-xl p-2 transition-all ${mainImageIdx === idx ? 'border-accent' : 'border-transparent hover:border-border'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Middle: Details */}
          <div className="lg:col-span-4 flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2 leading-tight">
              {product.name}
            </h1>
            <p className="text-sm text-primary font-bold tracking-widest uppercase mb-4">{product.brand}</p>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <Rating rating={product.averageRating || 0} count={product.numReviews || 0} />
            </div>

            <div className="mb-6">
              <span className="text-4xl font-display font-bold text-foreground block mb-2">
                {formatCurrency(product.price)}
              </span>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" /> Prices include VAT
              </p>
            </div>

            <div className="prose prose-sm text-muted-foreground mb-8">
              <p>{product.description}</p>
            </div>

            <div className="space-y-4 bg-gray-50 p-4 rounded-xl mb-6">
              <h3 className="font-bold text-foreground">Key Specifications:</h3>
              <ul className="text-sm space-y-2">
                {Object.entries(product.specs || {}).slice(0, 5).map(([key, val]) => (
                  <li key={key} className="flex"><span className="w-32 font-medium text-gray-500 capitalize">{key}:</span> <span className="text-foreground font-medium">{val as string}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Buy Box */}
          <div className="lg:col-span-3">
            <div className="border border-border/50 bg-card rounded-2xl p-6 shadow-xl shadow-black/5 sticky top-24">
              <span className="text-3xl font-display font-bold text-foreground block mb-4">
                {formatCurrency(product.price)}
              </span>
              
              <div className="mb-6 space-y-3">
                <div className="flex items-center text-sm">
                  <Truck className="w-5 h-5 text-accent mr-3" />
                  <div>
                    <span className="font-bold text-foreground block">Free Delivery</span>
                    <span className="text-muted-foreground">Arrives by tomorrow</span>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <ShieldCheck className="w-5 h-5 text-green-500 mr-3" />
                  <div>
                    <span className="font-bold text-foreground block">2 Year Warranty</span>
                    <span className="text-muted-foreground">Direct from {product.brand}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm font-bold mb-2">
                  Status: 
                  <span className={`ml-2 ${product.stock > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {product.stock > 0 ? (product.stock < 10 ? `Only ${product.stock} left in stock - order soon.` : 'In Stock') : 'Out of Stock'}
                  </span>
                </div>
                
                {product.stock > 0 && (
                  <div className="flex items-center gap-4 mt-4">
                    <label className="text-sm font-medium">Qty:</label>
                    <select 
                      className="border rounded-lg p-2 bg-background focus:outline-none focus:border-accent"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    >
                      {[...Array(Math.min(10, product.stock))].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => addToCart(product, quantity)}
                  disabled={product.stock === 0}
                  className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => toggleWishlist(product)}
                  className={`w-full py-6 text-base font-semibold rounded-xl transition-all ${inWishlist ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600' : ''}`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${inWishlist ? 'fill-current' : ''}`} /> 
                  {inWishlist ? 'Saved to Wishlist' : 'Add to Wishlist'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Specs Table & Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 border-t pt-16">
          <div>
            <h2 className="text-2xl font-display font-bold mb-6">Detailed Specifications</h2>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y">
                  {Object.entries(product.specs || {}).map(([key, val], idx) => (
                    <tr key={key} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <th className="py-3 px-4 font-medium text-gray-900 w-1/3 capitalize border-r">{key}</th>
                      <td className="py-3 px-4 text-gray-600">{val as string}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold mb-6">Customer Reviews</h2>
            <div className="mb-8 border-b pb-8">
              <div className="flex items-center gap-6">
                <div className="text-5xl font-display font-bold">{parseFloat(product.averageRating?.toString() || "0").toFixed(1)}</div>
                <div>
                  <Rating rating={product.averageRating || 0} />
                  <p className="text-sm text-muted-foreground mt-1">Based on {product.numReviews} reviews</p>
                </div>
              </div>
            </div>

            {/* Review Form */}
            {user ? (
              <form onSubmit={handleReviewSubmit} className="mb-10 bg-card border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold mb-4">Write a review</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Rating</label>
                  <select 
                    value={reviewRating} 
                    onChange={e => setReviewRating(Number(e.target.value))}
                    className="border rounded-lg p-2 w-full max-w-[150px] bg-background"
                  >
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Your Comment</label>
                  <Textarea 
                    required
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="What did you like or dislike about this laptop?"
                    className="resize-none"
                    rows={4}
                  />
                </div>
                <Button type="submit" disabled={submitReview.isPending} className="bg-primary text-white">
                  {submitReview.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            ) : (
              <div className="mb-10 bg-gray-50 rounded-xl p-6 text-center border">
                <p className="mb-4 text-muted-foreground">Please sign in to write a review.</p>
                <Button asChild variant="outline"><Link href="/auth">Sign In</Link></Button>
              </div>
            )}

            {/* Review List */}
            <div className="space-y-6">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map(review => (
                  <div key={review.id} className="border-b pb-6 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {review.user?.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{review.user?.name || "Unknown User"}</p>
                        <Rating rating={review.rating} />
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(review.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-3">{review.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No reviews yet. Be the first to review this product!</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
