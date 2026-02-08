import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProductRatingProps {
  productId: string;
}

const ProductRating: React.FC<ProductRatingProps> = ({ productId }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRating();
  }, [productId]);

  const fetchRating = async () => {
    try {
      const { data, error } = await supabase
        .from('product_ratings')
        .select('average_rating, total_reviews')
        .eq('id', productId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setRating(data.average_rating || 0);
        setCount(data.total_reviews || 0);
      }
    } catch (error) {
      console.error('Error fetching rating:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!rating || count === 0) {
    return (
      <div className="text-xs text-gray-500 font-medium">
        Sin opiniones aún
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? 'text-beauty-red fill-beauty-red' : 'text-gray-300'}`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
      <span className="text-xs font-bold text-gray-700">
        {rating.toFixed(1)}
      </span>
      <span className="text-xs text-gray-500">
        ({count})
      </span>
    </div>
  );
};

export default ProductRating;
