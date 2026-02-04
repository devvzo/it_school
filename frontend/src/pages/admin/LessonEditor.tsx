import type { FC } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import QuestionEditor from './QuestionEditor';

interface Question {
  id: number;
  questionText: string;
  questionType: 'text_input' | 'single_choice' | 'multiple_choice' | 'code_editor';
  correctAnswer: string | null;
  options: any;
  codeTemplate: string | null;
  expectedOutput: string | null;
  orderIndex: number;
}

interface Lesson {
  id: number;
  moduleId: number;
  title: string;
  content: string;
  xpReward: number; // суммарный XP за все задания урока (рассчитывается на бэкенде)
  requiredXp: number;
  orderIndex: number;
  questions: Question[];
}

const LessonEditor: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [xpReward, setXpReward] = useState(0);
  const [requiredXp, setRequiredXp] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (id) {
      loadLesson();
    }
  }, [id, token]);

  const loadLesson = async () => {
    try {
      const res = await axios.get<Lesson>(`/api/admin/lessons/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLesson(res.data);
      setTitle(res.data.title);
      setContent(res.data.content);
      setXpReward(res.data.xpReward);
      setRequiredXp(res.data.requiredXp ?? 0);
      setAutoSaveStatus('Все изменения сохранены');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !lesson) return;
    setSaving(true);
    try {
      await axios.put(
        `/api/admin/lessons/${lesson.id}`,
        { title, content, requiredXp },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const time = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setAutoSaveStatus(`Сохранено в ${time}`);
    } catch (e) {
      console.error(e);
      setAutoSaveStatus('Ошибка сохранения, проверьте подключение');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!lesson) return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    // Если урок только что загрузился и данных ещё не было — не показываем "Сохранение..."
    if (!title.trim() && !content.trim() && requiredXp === 0) {
      return;
    }

    setAutoSaveStatus('Сохранение...');

    saveTimeoutRef.current = window.setTimeout(() => {
      void handleSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, requiredXp, lesson?.id]);

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setShowQuestionEditor(true);
  };

  const handleAddQuestion = async () => {
    // Сначала создаем вопрос через API
    try {
      const res = await axios.post<{ id: number }>(
        `/api/admin/lessons/${id}/questions`,
        {
          questionText: 'Новый вопрос',
          questionType: 'text_input',
          correctAnswer: null,
          options: null,
          codeTemplate: null,
          expectedOutput: null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Загружаем обновленный урок и находим новый вопрос
      const updatedRes = await axios.get<Lesson>(`/api/admin/lessons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLesson(updatedRes.data);
      const newQuestion = updatedRes.data.questions.find(q => q.id === res.data.id);
      if (newQuestion) {
        setEditingQuestion(newQuestion);
        setShowQuestionEditor(true);
      }
    } catch (e: any) {
      console.error('Ошибка создания вопроса:', e);
      alert(e?.response?.data?.message || 'Ошибка создания вопроса');
    }
  };

  const handleQuestionSaved = async () => {
    await loadLesson();
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      await axios.delete(`/api/admin/questions/${questionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      loadLesson();
    } catch (e) {
      console.error(e);
    }
  };

  const wrapSelection = (before: string, after?: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end);
    const closing = after ?? before;
    const newText = before + selected + closing;
    const newValue = value.slice(0, start) + newText + value.slice(end);
    setContent(newValue);
    const cursorPos = start + newText.length;
    requestAnimationFrame(() => {
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const applyList = () => {
    const textarea = contentRef.current;
    if (!textarea) return;
    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end);
    const block = selected || '';
    const lines = block.split('\n').map((line) => {
      const trimmed = line.trimStart();
      const withoutBullet = trimmed.replace(/^[-*]\s+/, '');
      return `- ${withoutBullet}`;
    });
    const newBlock = lines.join('\n');
    const newValue = value.slice(0, start) + newBlock + value.slice(end);
    setContent(newValue);
    const cursorStart = start;
    const cursorEnd = start + newBlock.length;
    requestAnimationFrame(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-tg-text mb-4">Урок не найден</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl bg-tg-accent text-white hover:bg-tg-accent-soft transition-colors"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-tg-muted hover:text-tg-text transition-colors"
        >
          ← Назад
        </button>
        <div className="text-xs text-tg-muted">
          {saving
            ? 'Сохранение...'
            : autoSaveStatus || 'Изменения сохраняются автоматически'}
        </div>
      </div>

      <div className="bg-tg-bg-light rounded-2xl border border-tg-border/50 p-6" style={{ background: 'var(--tg-bg-light)' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название урока"
          className="w-full text-2xl font-bold text-tg-text bg-transparent border-none outline-none mb-4"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-tg-muted mb-1">
              Всего XP за урок
            </label>
            <div className="px-4 py-2 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text text-sm" style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}>
              {xpReward} XP (сумма по заданиям)
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-tg-muted mb-2">
              Минимальный XP для доступа к уроку
            </label>
            <input
              type="number"
              value={requiredXp}
              onChange={(e) => setRequiredXp(Math.max(0, parseInt(e.target.value, 10) || 0))}
              min="0"
              className="w-full sm:w-40 px-4 py-2 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
              style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
            />
            <p className="mt-1 text-xs text-tg-muted">
              По умолчанию равен сумме XP за предыдущие уроки курса. Можно скорректировать вручную.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <span className="text-tg-muted mr-2">Форматирование:</span>
          <button
            type="button"
            onClick={() => wrapSelection('**')}
            className="px-2 py-1 rounded-lg border border-tg-border/50 bg-tg-bg text-tg-text hover:bg-tg-hover transition-colors"
          >
            <span className="font-semibold">B</span>
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('_')}
            className="px-2 py-1 rounded-lg border border-tg-border/50 bg-tg-bg text-tg-text hover:bg-tg-hover transition-colors italic"
          >
            i
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('`')}
            className="px-2 py-1 rounded-lg border border-tg-border/50 bg-tg-bg text-tg-text hover:bg-tg-hover transition-colors font-mono"
          >
            {"</>"}
          </button>
          <button
            type="button"
            onClick={applyList}
            className="px-2 py-1 rounded-lg border border-tg-border/50 bg-tg-bg text-tg-text hover:bg-tg-hover transition-colors"
          >
            • Список
          </button>
          <span className="text-[11px] text-tg-muted">
            Используйте Markdown: **жирный**, _курсив_, `код`, списки.
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Содержание урока (Markdown)"
          rows={10}
          className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20 resize-none"
          style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
          ref={contentRef}
        />
      </div>

      <div className="bg-tg-bg-light rounded-2xl border border-tg-border/50 p-6" style={{ background: 'var(--tg-bg-light)' }}>
        <h2 className="text-lg font-semibold text-tg-text mb-4">Вопросы и задания</h2>

        <div className="space-y-4 mb-4">
          {lesson.questions.map((question) => (
            <div
              key={question.id}
              className="p-4 rounded-xl bg-tg-bg border border-tg-border/50 hover:border-tg-accent/50 transition-all cursor-pointer"
              style={{ background: 'var(--tg-bg)' }}
              onClick={() => handleEditQuestion(question)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <span className="text-xs text-tg-muted mb-1 block">
                    {question.questionType === 'text_input' && 'Текстовый ввод'}
                    {question.questionType === 'single_choice' && 'Выбор одного варианта'}
                    {question.questionType === 'multiple_choice' && 'Выбор нескольких вариантов'}
                    {question.questionType === 'code_editor' && 'Редактор кода'}
                  </span>
                  <p className="text-tg-text font-medium">{question.questionText}</p>
                  {question.questionType === 'text_input' && question.correctAnswer && (
                    <p className="text-xs text-tg-muted mt-1">Правильный ответ: {question.correctAnswer}</p>
                  )}
                  {(question.questionType === 'single_choice' || question.questionType === 'multiple_choice') && question.options && Array.isArray(question.options) && (
                    <div className="mt-2 space-y-1">
                      {question.options.map((opt: string, idx: number) => (
                        <div key={idx} className="text-xs text-tg-muted">
                          • {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  {question.questionType === 'code_editor' && question.expectedOutput && (
                    <p className="text-xs text-tg-muted mt-1">Ожидаемый результат: {question.expectedOutput}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditQuestion(question);
                    }}
                    className="text-tg-accent hover:text-tg-accent-soft transition-colors"
                    title="Редактировать"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(question.id);
                    }}
                    className="text-red-400 hover:text-red-500 transition-colors"
                    title="Удалить"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddQuestion}
          className="w-full px-4 py-3 rounded-xl bg-tg-bg-secondary border border-tg-border/50 text-tg-text hover:bg-tg-hover transition-colors text-sm font-medium"
          style={{ background: 'var(--tg-bg-secondary)' }}
        >
          + Добавить вопрос
        </button>
      </div>

      {showQuestionEditor && (
        <QuestionEditor
          isOpen={showQuestionEditor}
          onClose={() => {
            setShowQuestionEditor(false);
            setEditingQuestion(null);
          }}
          question={editingQuestion}
          onSave={handleQuestionSaved}
        />
      )}
    </div>
  );
};

export default LessonEditor;
