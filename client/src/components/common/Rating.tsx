import { RatingStars } from "@/components/premium/RatingStars";

interface RatingProps {
  rating: number | string;
  count?: number;
}

export function Rating({ rating, count = 0 }: RatingProps) {
  return <RatingStars rating={rating} count={count} />;
}
