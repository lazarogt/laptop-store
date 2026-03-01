import { memo } from "react";
import { Star, StarHalf } from "lucide-react";

type RatingStarsProps = {
  rating: number | string;
  count?: number;
};

function RatingStarsComponent({ rating, count = 0 }: RatingStarsProps) {
  const numericRating = typeof rating === "string" ? Number.parseFloat(rating) : rating;
  const fullStars = Math.floor(numericRating);
  const hasHalfStar = numericRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center text-amber-400">
        {Array.from({ length: fullStars }, (_, idx) => (
          <Star key={`full-${idx}`} className="h-4 w-4 fill-current" />
        ))}
        {hasHalfStar ? <StarHalf className="h-4 w-4 fill-current" /> : null}
        {Array.from({ length: emptyStars }, (_, idx) => (
          <Star key={`empty-${idx}`} className="h-4 w-4 text-slate-300" />
        ))}
      </div>
      {count > 0 ? <span className="text-xs text-slate-500">{count} calificaciones</span> : null}
    </div>
  );
}

export const RatingStars = memo(RatingStarsComponent);
