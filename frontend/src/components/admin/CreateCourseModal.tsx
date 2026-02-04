import type { FC } from 'react';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (courseId: number) => void;
}

const CreateCourseModal: FC<CreateCourseModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<'Новичок' | 'Средний' | 'Продвинутый'>('Новичок');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let imageUrl: string | null = null;

      // Загружаем изображение, если оно выбрано
      if (imageFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await axios.post<{ url: string }>('/api/upload/image', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        imageUrl = uploadRes.data.url;
        setUploading(false);
      }

      const res = await axios.post<{ id: number }>(
        '/api/admin/courses',
        {
          title,
          level,
          description,
          imageUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      onCreated(res.data.id);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка создания курса');
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-3 sm:px-4"
          style={{
            background:
              'radial-gradient(circle at top, rgba(15, 23, 42, 0.28), transparent 55%), rgba(15, 23, 42, 0.28)',
            backdropFilter: 'blur(10px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="rounded-3xl border shadow-[0_22px_50px_rgba(15,23,42,0.35)] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--tg-bg-light)',
              border: '1px solid var(--tg-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-tg-text mb-6">Создать курс</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-tg-muted mb-2">Название курса *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
                  style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-tg-muted mb-2">Уровень *</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as typeof level)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
                  style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                >
                  <option value="Новичок">Новичок</option>
                  <option value="Средний">Средний</option>
                  <option value="Продвинутый">Продвинутый</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-tg-muted mb-2">Описание *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20 resize-none"
                  style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-tg-muted mb-2">Изображение курса</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="space-y-3">
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-tg-border/50">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 rounded-xl bg-tg-bg-secondary border border-tg-border/50 text-tg-text hover:bg-tg-hover transition-colors text-sm font-medium"
                    style={{ background: 'var(--tg-bg-secondary)' }}
                  >
                    {imagePreview ? 'Изменить изображение' : 'Выбрать изображение'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/20 text-red-400 text-sm">{error}</div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-tg-bg-secondary text-tg-text font-medium transition-colors hover:bg-tg-hover"
                  style={{ background: 'var(--tg-bg-secondary)' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="flex-1 px-4 py-3 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      <span>Загрузка файла...</span>
                    </>
                  ) : loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      <span>Создаём курс...</span>
                    </>
                  ) : (
                    'Создать'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default CreateCourseModal;
