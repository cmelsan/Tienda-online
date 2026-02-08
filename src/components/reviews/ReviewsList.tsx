import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string;
}

interface ReviewsListProps {
  productId: string;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    average: number;
    total: number;
    byRating: Record<number, number>;
  }>({ average: 0, total: 0, byRating: {} });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);

      // Fetch reviews with user info
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Fetch ratings summary
      const { data: statsData, error: statsError } = await supabase
        .from('product_ratings')
        .select('*')
        .eq('id', productId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        throw statsError;
      }

      setReviews(reviewsData || []);

      if (statsData) {
        const byRating = {
          5: Math.round((statsData.rating_5_percent || 0) / 100 * (statsData.total_reviews || 0)),
          4: Math.round((statsData.rating_4_percent || 0) / 100 * (statsData.total_reviews || 0)),
          3: Math.round((statsData.rating_3_percent || 0) / 100 * (statsData.total_reviews || 0)),
          2: Math.round((statsData.rating_2_percent || 0) / 100 * (statsData.total_reviews || 0)),
          1: Math.round((statsData.rating_1_percent || 0) / 100 * (statsData.total_reviews || 0)),
        };

        setStats({
          average: statsData.average_rating || 0,
          total: statsData.total_reviews || 0,
          byRating,
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: string = 'w-4 h-4') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${size} ${star <= rating ? 'text-beauty-red fill-beauty-red' : 'text-gray-300'}`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="bg-white rounded-xl p-8 border border-gray-100">
        <h3 className="text-2xl font-black uppercase tracking-widest mb-6 text-black">
          Opiniones de Clientes
        </h3>

        {stats.total === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-base">
              Aún no hay opiniones. ¡Sé el primero en dejar tu comentario!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Average Rating */}
            <div className="flex flex-col items-center">
              <div className="text-5xl font-black text-black mb-2">
                {stats.average.toFixed(1)}
              </div>
              <div className="flex gap-1 mb-2">
                {renderStars(Math.round(stats.average), 'w-5 h-5')}
              </div>
              <p className="text-sm text-gray-600 font-semibold">
                {stats.total} opinión{stats.total !== 1 ? 'es' : ''}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="md:col-span-2 space-y-4">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-end gap-3">
                  <div className="flex gap-1 w-16 flex-shrink-0">
                    {renderStars(rating, 'w-4 h-4')}
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-beauty-red to-rose-600"
                      style={{
                        width: `${stats.total ? (stats.byRating[rating] / stats.total) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-10 text-right flex-shrink-0">
                    {stats.byRating[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div>
          <h4 className="text-lg font-bold uppercase tracking-widest mb-6 text-black">
            Últimas Opiniones
          </h4>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex gap-2 mb-2">
                      {renderStars(review.rating, 'w-4 h-4')}
                      <span className="text-xs font-bold text-gray-500 ml-2">
                        {new Date(review.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
