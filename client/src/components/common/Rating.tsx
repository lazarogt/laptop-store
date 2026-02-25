import { Star, StarHalf } from "lucide-react";

export function Rating({ rating, count }: { rating: number | string; count?: number }) {
  const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  const fullStars = Math.floor(numericRating);
  const hasHalfStar = numericRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex text-accent">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 fill-current" />
        ))}
        {hasHalfStar && <StarHalf className="w-4 h-4 fill-current" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-muted-foreground/30" />
        ))}
      </div>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground ml-1 hover:text-primary cursor-pointer hover:underline">
          {count} ratings
        </span>
      )}
    </div>
  );
}
