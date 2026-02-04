import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Question {
  id: number;
  questionText: string;
  questionType: 'text_input' | 'single_choice' | 'multiple_choice' | 'code_editor';
  correctAnswer: string | null;
  options: any;
  codeTemplate: string | null;
  expectedOutput: string | null;
  xpReward: number;
  orderIndex: number;
}

interface QuestionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  onSave: () => void;
}

const QuestionEditor: FC<QuestionEditorProps> = ({ isOpen, onClose, question, onSave }) => {
  const { token } = useAuth();
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'text_input' | 'single_choice' | 'multiple_choice' | 'code_editor'>('text_input');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState<string[]>(['']);
  const [correctOptions, setCorrectOptions] = useState<boolean[]>([]);
  const [codeTemplate, setCodeTemplate] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [xpReward, setXpReward] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (question) {
      setQuestionText(question.questionText);
      setQuestionType(question.questionType);
      setCorrectAnswer(question.correctAnswer || '');
      if (question.options && Array.isArray(question.options)) {
        setOptions(question.options.length > 0 ? question.options : ['']);
        // Парсим правильные ответы
        if (question.correctAnswer) {
          try {
            const correct = JSON.parse(question.correctAnswer);
            if (Array.isArray(correct)) {
              setCorrectOptions(question.options.map((_: any, idx: number) => correct.includes(idx)));
            } else {
              setCorrectOptions(question.options.map((_: any, idx: number) => correct === idx));
            }
          } catch {
            setCorrectOptions(question.options.map(() => false));
          }
        } else {
          setCorrectOptions(question.options.map(() => false));
        }
      } else {
        setOptions(['']);
        setCorrectOptions([false]);
      }
      setCodeTemplate(question.codeTemplate || '');
      setExpectedOutput(question.expectedOutput || '');
      setXpReward(question.xpReward || 5);
    } else {
      // Новый вопрос
      setQuestionText('');
      setQuestionType('text_input');
      setCorrectAnswer('');
      setOptions(['']);
      setCorrectOptions([false]);
      setCodeTemplate('');
      setExpectedOutput('');
      setXpReward(5);
    }
  }, [question]);

  const handleAddOption = () => {
    setOptions([...options, '']);
    setCorrectOptions([...correctOptions, false]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
      setCorrectOptions(correctOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCorrectOptionToggle = (index: number) => {
    if (questionType === 'single_choice') {
      // Для одного варианта - только один может быть правильным
      const newCorrect = options.map((_, i) => i === index);
      setCorrectOptions(newCorrect);
    } else {
      // Для нескольких вариантов - можно выбрать несколько
      const newCorrect = [...correctOptions];
      newCorrect[index] = !newCorrect[index];
      setCorrectOptions(newCorrect);
    }
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      setError('Текст вопроса обязателен');
      return;
    }

    if (questionType === 'single_choice' || questionType === 'multiple_choice') {
      if (options.some(opt => !opt.trim())) {
        setError('Все опции должны быть заполнены');
        return;
      }
      if (!correctOptions.some(correct => correct)) {
        setError('Нужно указать хотя бы один правильный ответ');
        return;
      }
    }

    if (questionType === 'text_input' && !correctAnswer.trim()) {
      setError('Правильный ответ обязателен для текстового ввода');
      return;
    }

    if (questionType === 'code_editor' && !expectedOutput.trim()) {
      setError('Ожидаемый результат обязателен для редактора кода');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const payload: any = {
        questionText,
        questionType,
        correctAnswer: null,
        options: null,
        codeTemplate: null,
        expectedOutput: null,
        xpReward,
      };

      if (questionType === 'text_input') {
        payload.correctAnswer = correctAnswer;
      } else if (questionType === 'single_choice' || questionType === 'multiple_choice') {
        payload.options = options;
        // Сохраняем индексы правильных ответов
        payload.correctAnswer = JSON.stringify(
          correctOptions.map((correct, idx) => correct ? idx : null).filter((idx) => idx !== null)
        );
      } else if (questionType === 'code_editor') {
        payload.codeTemplate = codeTemplate;
        payload.expectedOutput = expectedOutput;
      }

      if (question) {
        // Обновление существующего вопроса
        await axios.put(
          `/api/admin/questions/${question.id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        setError('Не указан ID урока');
        return;
      }

      onSave();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Ошибка сохранения вопроса');
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-tg-bg-light rounded-2xl border border-tg-border/50 shadow-tg-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--tg-bg-light)', border: '1px solid var(--tg-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-tg-text mb-6">
              {question ? 'Редактировать вопрос' : 'Новый вопрос'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-tg-muted mb-2">Текст вопроса *</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20 resize-none"
                  style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-tg-muted mb-2">Тип вопроса *</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as typeof questionType)}
                  className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
                  style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                >
                  <option value="text_input">Текстовый ввод</option>
                  <option value="single_choice">Выбор одного варианта</option>
                  <option value="multiple_choice">Выбор нескольких вариантов</option>
                  <option value="code_editor">Редактор кода</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-tg-muted mb-2">XP за правильный ответ *</label>
                <input
                  type="number"
                  value={xpReward}
                  onChange={(e) => setXpReward(parseInt(e.target.value, 10) || 5)}
                  min="1"
                  max="100"
                  className="w-32 px-4 py-2 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
                  style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                />
              </div>

              {questionType === 'text_input' && (
                <div>
                  <label className="block text-sm font-semibold text-tg-muted mb-2">Правильный ответ *</label>
                  <input
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
                    style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                  />
                </div>
              )}

              {(questionType === 'single_choice' || questionType === 'multiple_choice') && (
                <div>
                  <label className="block text-sm font-semibold text-tg-muted mb-2">Варианты ответов *</label>
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type={questionType === 'single_choice' ? 'radio' : 'checkbox'}
                          checked={correctOptions[index]}
                          onChange={() => handleCorrectOptionToggle(index)}
                          className="w-5 h-5 text-tg-accent"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Вариант ${index + 1}`}
                          className="flex-1 px-4 py-2 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
                          style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                        />
                        {options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="text-red-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="w-full px-4 py-2 rounded-xl bg-tg-bg-secondary border border-tg-border/50 text-tg-text hover:bg-tg-hover transition-colors text-sm"
                      style={{ background: 'var(--tg-bg-secondary)' }}
                    >
                      + Добавить вариант
                    </button>
                  </div>
                </div>
              )}

              {questionType === 'code_editor' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-tg-muted mb-2">Шаблон кода (необязательно)</label>
                    <textarea
                      value={codeTemplate}
                      onChange={(e) => setCodeTemplate(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-tg-accent/20 resize-none"
                      style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                      placeholder="def hello_world():&#10;    # Ваш код здесь"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-tg-muted mb-2">Ожидаемый результат *</label>
                    <textarea
                      value={expectedOutput}
                      onChange={(e) => setExpectedOutput(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20 resize-none"
                      style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
                      placeholder="Hello, World!"
                    />
                  </div>
                </>
              )}

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
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default QuestionEditor;
