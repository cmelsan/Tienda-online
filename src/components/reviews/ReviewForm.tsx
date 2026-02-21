import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ productId, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [canReview, setCanReview] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    checkUserAndReview();
  }, [productId]);

  const checkUserAndReview = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser) {
        setCanReview(false);
        return;
      }

      // Check if user has already reviewed this product
      const { data: review } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', currentUser.id)
        .single();

      if (review) {
        setExistingReview(review);
        setRating(review.rating);
        setComment(review.comment || '');
        setCanReview(false);
      } else {
        // Check if user has purchased the product
        const response = await fetch(`/api/reviews/can-review?productId=${productId}`, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
        });

        if (response.ok) {
          const { canReview: can } = await response.json();
          setCanReview(can);
        }
      }
    } catch (err) {
      console.error('Error checking user:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!user) {
        setError('Debes estar autenticado para dejar una opinión');
        return;
      }

      const reviewData = {
        product_id: productId,
        user_id: user.id,
        rating,
        comment: comment.trim(),
      };

      let response;

      if (existingReview) {
        // Update existing review
        response = await fetch(`/api/reviews/${existingReview.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          body: JSON.stringify(reviewData),
        });
      } else {
        // Create new review
        response = await fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          body: JSON.stringify(reviewData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la opinión');
      }

      setSuccess(true);
      setComment('');
      setIsEditing(false);
      setExistingReview(null);

      // Refresh reviews list
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews/${existingReview.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la opinión');
      }

      setExistingReview(null);
      setRating(5);
      setComment('');
      setCanReview(true);

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-700 mb-4">
          <a href="/login" className="text-beauty-red font-bold hover:underline">
            Inicia sesión
          </a>
          {' '}para dejar tu opinión
        </p>
      </div>
    );
  }

  if (existingReview && !isEditing) {
    return (
      <>
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Eliminar opinión"
          message="¿Estás seguro de que quieres eliminar tu opinión? Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
        <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-bold uppercase tracking-widest text-black mb-2">
              Tu Opinión
            </h4>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-5 h-5 ${star <= existingReview.rating ? 'text-beauty-red fill-beauty-red' : 'text-gray-300'}`}
                  viewBox="0 0 20 20"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
          </div>
        </div>
        {existingReview.comment && (
          <p className="text-gray-700 mb-4 text-sm leading-relaxed">{existingReview.comment}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-gray-200 text-black text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
          >
            Eliminar
          </button>
        </div>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-8">
      <h4 className="text-lg font-bold uppercase tracking-widest mb-6 text-black">
        {existingReview ? 'Editar tu opinión' : 'Deja tu opinión'}
      </h4>

      {!canReview && !existingReview && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm text-gray-700">
          Debes comprar este producto para dejar una opinión.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-sm text-green-800">
          ¡Opinión guardada exitosamente!
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-bold uppercase tracking-widest mb-3 text-gray-900">
          Calificación
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <svg
                className={`w-8 h-8 cursor-pointer ${
                  star <= rating ? 'text-beauty-red fill-beauty-red' : 'text-gray-300'
                }`}
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {['Pésimo', 'Malo', 'Normal', 'Bueno', 'Excelente'][rating - 1]}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold uppercase tracking-widest mb-3 text-gray-900">
          Comentario (opcional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comparte tu experiencia con este producto..."
          maxLength={500}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-beauty-red focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          {comment.length}/500 caracteres
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || (!canReview && !existingReview)}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-beauty-red to-rose-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading
            ? 'Guardando...'
            : existingReview
            ? 'Actualizar opinión'
            : 'Publicar opinión'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setRating(existingReview.rating);
              setComment(existingReview.comment || '');
            }}
            className="px-6 py-3 bg-gray-200 text-gray-900 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
};

export default ReviewForm;
