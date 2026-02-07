import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { useProgress } from '../context/ProgressContext';
import { useXpFly } from '../context/XpFlyContext';

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

interface Lesson {
  id: number;
  moduleId: number;
  title: string;
  content: string;
  xpReward: number;
  orderIndex: number;
  questions: Question[];
}

interface QuestionResult {
  questionId: number;
  isCorrect: boolean;
  userAnswer: any;
  correctAnswer: any;
  xpEarned: number;
}

interface QuestionProgress {
  completed: boolean;
  xpEarned: number;
}

const markdownToHtml = (text: string): string => {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Жирный **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Курсив _text_
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  // Инлайн-код `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Переводы строк
  html = html.replace(/\n/g, '<br />');

  return html;
};

const LessonLearn: FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { refreshProgress } = useProgress();
  const { flyXp } = useXpFly();
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [results, setResults] = useState<Record<number, QuestionResult>>({});
  const [questionProgress, setQuestionProgress] = useState<Record<number, QuestionProgress>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showError, setShowError] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [nextLesson, setNextLesson] = useState<{ id: number; title: string } | null>(null);
  const [prevLesson, setPrevLesson] = useState<{ id: number; title: string } | null>(null);
  const [codeOutput, setCodeOutput] = useState<Record<number, string>>({});

  useEffect(() => {
    if (lessonId && token) {
      loadLesson();
    }
  }, [lessonId, token]);

  const loadLesson = async () => {
    try {
      // Сбрасываем навигацию перед загрузкой нового урока, чтобы не тянуть старые значения
      setPrevLesson(null);
      setNextLesson(null);
      // Всегда начинаем новый урок с первого задания
      setCurrentQuestionIndex(0);
      const res = await axios.get<Lesson>(`/api/courses/lessons/${lessonId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLesson(res.data);
      
      // Загружаем прогресс по вопросам
      const progressRes = await axios.get<{ progress: Record<number, QuestionProgress> }>(
        `/api/questions/lesson/${lessonId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setQuestionProgress(progressRes.data.progress);

      // Восстанавливаем ответы из прогресса
      const restoredAnswers: Record<number, any> = {};
      const restoredResults: Record<number, QuestionResult> = {};
      res.data.questions.forEach((question) => {
        const progress = progressRes.data.progress[question.id];
        if (progress?.completed) {
          // Если вопрос уже решен, показываем правильный ответ
          // Для multiple_choice восстанавливаем индексы правильных ответов
          let restoredAnswer: any = null;
          if (question.questionType === 'multiple_choice') {
            try {
              const correctIndices = JSON.parse(question.correctAnswer || '[]');
              restoredAnswer = Array.isArray(correctIndices) ? correctIndices : [];
            } catch {
              restoredAnswer = [];
            }
          }
          
          restoredResults[question.id] = {
            questionId: question.id,
            isCorrect: true,
            userAnswer: restoredAnswer,
            correctAnswer: question.correctAnswer,
            xpEarned: progress.xpEarned,
          };
        } else {
          // Инициализируем пустой ответ для multiple_choice как массив индексов
          if (question.questionType === 'multiple_choice') {
            restoredAnswers[question.id] = [];
          }
        }
      });
      setAnswers(restoredAnswers);
      setResults(restoredResults);

      // Если все вопросы по уроку уже выполнены, отмечаем урок как завершенный
      if (res.data.questions.length === 0) {
        // Урок без заданий считаем пройденным: сразу отмечаем как завершенный
        try {
          await axios.post(
            `/api/courses/lessons/${lessonId}/complete`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch (e) {
          console.error('Ошибка автоматического завершения урока без заданий:', e);
        }
        setCompleted(true);
      } else {
        const allCompleted = res.data.questions.every(
          (question) => progressRes.data.progress[question.id]?.completed
        );
        setCompleted(allCompleted);
      }
      
      // Загружаем навигацию между уроками
      if (courseId) {
        const courseRes = await axios.get(`/api/courses/${courseId}/learn`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allLessons: { id: number; title: string; moduleId: number; orderIndex: number }[] = [];
        courseRes.data.modules.forEach((module: any) => {
          module.lessons.forEach((l: any) => {
            allLessons.push({ id: l.id, title: l.title, moduleId: module.id, orderIndex: l.orderIndex });
          });
        });
        
        const currentIndex = allLessons.findIndex(l => l.id === parseInt(lessonId!));
        if (currentIndex > 0) {
          setPrevLesson(allLessons[currentIndex - 1]);
        } else {
          setPrevLesson(null);
        }
        if (currentIndex < allLessons.length - 1) {
          setNextLesson(allLessons[currentIndex + 1]);
        } else {
          setNextLesson(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, value: any) => {
    // Не позволяем изменять ответ, если вопрос уже решен правильно
    const progress = questionProgress[questionId];
    if (progress?.completed) {
      return;
    }
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleChoiceChange = (questionId: number, optionIndex: number, checked: boolean) => {
    // Не позволяем изменять ответ, если вопрос уже решен правильно
    const progress = questionProgress[questionId];
    if (progress?.completed) {
      return;
    }
    
    const currentAnswer = answers[questionId] || [];
    // Используем индексы вместо текста для избежания проблем с одинаковыми вариантами
    const currentIndices = Array.isArray(currentAnswer) ? currentAnswer : [];
    const updatedIndices = checked
      ? [...currentIndices, optionIndex]
      : currentIndices.filter((idx: number) => idx !== optionIndex);
    
    setAnswers((prev) => ({ ...prev, [questionId]: updatedIndices }));
  };

  const checkAnswer = (question: Question): QuestionResult => {
    const userAnswer = answers[question.id];
    let isCorrect = false;
    let correctAnswer = question.correctAnswer;

    if (question.questionType === 'text_input') {
      isCorrect = userAnswer?.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase();
      correctAnswer = question.correctAnswer;
    } else if (question.questionType === 'single_choice') {
      try {
        const correctIndices = JSON.parse(question.correctAnswer || '[]');
        if (Array.isArray(correctIndices) && correctIndices.length > 0) {
          const correctIndex = correctIndices[0];
          const correctOption = question.options?.[correctIndex];
          isCorrect = userAnswer === correctOption;
          correctAnswer = correctOption;
        } else {
          isCorrect = userAnswer === question.correctAnswer;
          correctAnswer = question.correctAnswer;
        }
      } catch {
        isCorrect = userAnswer === question.correctAnswer;
        correctAnswer = question.correctAnswer;
      }
    } else if (question.questionType === 'multiple_choice') {
      try {
        const correctIndices = JSON.parse(question.correctAnswer || '[]');
        // userAnswer хранится как массив ИНДЕКСОВ (см. handleMultipleChoiceChange)
        const userIndices = Array.isArray(userAnswer) ? userAnswer : [];
        const sortedCorrect = [...correctIndices].sort((a, b) => a - b);
        const sortedUser = [...userIndices].sort((a, b) => a - b);
        isCorrect = 
          sortedCorrect.length === sortedUser.length &&
          sortedCorrect.every((idx: number, i: number) => idx === sortedUser[i]);
        correctAnswer = correctIndices.map((idx: number) => question.options[idx]).join(', ');
      } catch {
        isCorrect = false;
      }
    } else if (question.questionType === 'code_editor') {
      const output = codeOutput[question.id];
      if (output) {
        isCorrect = output.trim() === question.expectedOutput?.trim();
      } else {
        isCorrect = userAnswer?.trim() === question.expectedOutput?.trim();
      }
      correctAnswer = question.expectedOutput;
    }

    const xpEarned = isCorrect ? (question.xpReward || 5) : 0;
    
    return {
      questionId: question.id,
      isCorrect,
      userAnswer,
      correctAnswer,
      xpEarned,
    };
  };

  const handleRunCode = async (question: Question) => {
    const code = answers[question.id] || question.codeTemplate || '';
    if (!code.trim()) {
      alert('Введите код для выполнения');
      return;
    }

    try {
      const res = await axios.post<{ output: string; error: boolean }>(
        '/api/code/execute',
        { code },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (res.data.error) {
        setCodeOutput((prev) => ({ ...prev, [question.id]: `Ошибка: ${res.data.output}` }));
      } else {
        setCodeOutput((prev) => ({ ...prev, [question.id]: res.data.output }));
      }
    } catch (e: any) {
      setCodeOutput((prev) => ({ 
        ...prev, 
        [question.id]: `Ошибка: ${e?.response?.data?.message || e?.message || 'Не удалось выполнить код'}` 
      }));
    }
  };

  const handleSubmitAnswer = async () => {
    if (!lesson) return;

    const currentQuestion = lesson.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Проверяем, что вопрос отвечен
    const answer = answers[currentQuestion.id];
    if (currentQuestion.questionType === 'code_editor') {
      if (!codeOutput[currentQuestion.id] && (!answer || answer.trim() === '')) {
        alert('Пожалуйста, введите код и запустите его');
        return;
      }
    } else if (!answer || (Array.isArray(answer) && answer.length === 0) || (typeof answer === 'string' && answer.trim() === '')) {
      alert('Пожалуйста, ответьте на вопрос');
      return;
    }

    setSubmitting(true);

    // Проверяем ответ
    const result = checkAnswer(currentQuestion);
    setResults((prev) => ({ ...prev, [currentQuestion.id]: result }));

    if (result.isCorrect && result.xpEarned > 0) {
      // Начисляем сразу и запускаем полёт одновременно — бейдж обновляется, пока летит «+N XP»
      const sourceRect = submitButtonRef.current?.getBoundingClientRect() ?? null;

      const saveAndRefresh = async () => {
        try {
          await axios.post(
            `/api/questions/${currentQuestion.id}/complete`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setQuestionProgress((prev) => ({
            ...prev,
            [currentQuestion.id]: { completed: true, xpEarned: result.xpEarned },
          }));
          await refreshProgress();
        } catch (e) {
          console.error('Ошибка сохранения прогресса по вопросу:', e);
          alert('Ошибка сохранения прогресса. Попробуйте обновить страницу.');
          setSubmitting(false);
        }
      };

      void saveAndRefresh();
      flyXp(result.xpEarned, sourceRect, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (currentQuestionIndex < lesson.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setAnswers((prev) => {
            const next = { ...prev };
            delete next[lesson.questions[currentQuestionIndex + 1]?.id];
            return next;
          });
        } else {
          const updatedProgress = { ...questionProgress, [currentQuestion.id]: { completed: true, xpEarned: result.xpEarned } };
          const allCompleted = lesson.questions.every((q) => updatedProgress[q.id]?.completed);
          if (allCompleted) {
            try {
              await axios.post(
                `/api/courses/lessons/${lessonId}/complete`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setCompleted(true);
            } catch (e: any) {
              console.error(e);
              alert(e?.response?.data?.message || 'Ошибка сохранения прогресса');
            }
          }
        }
        setSubmitting(false);
      });
      return;
    } else {
      // Неправильный ответ - показываем красный индикатор на 3 секунды
      setShowError((prev) => ({ ...prev, [currentQuestion.id]: true }));
      
      setTimeout(() => {
        setShowError((prev) => ({ ...prev, [currentQuestion.id]: false }));
        setResults((prev) => {
          const next = { ...prev };
          delete next[currentQuestion.id];
          return next;
        });
        // Очищаем ответ для повторной попытки
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[currentQuestion.id];
          return next;
        });
        // Не удаляем код при неправильном ответе - оставляем его для исправления
      }, 3000);
    }

    setSubmitting(false);
  };

  const getQuestionStatus = (questionId: number): 'pending' | 'correct' | 'incorrect' => {
    const progress = questionProgress[questionId];
    if (progress?.completed) {
      return 'correct';
    }
    const result = results[questionId];
    if (!result) return 'pending';
    if (showError[questionId]) return 'incorrect';
    return result.isCorrect ? 'correct' : 'incorrect';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-tg-muted">Необходима авторизация</p>
      </div>
    );
  }

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
          <Link
            to={`/courses/${courseId}/learn`}
            className="px-4 py-2 rounded-xl bg-tg-accent text-white hover:bg-tg-accent-soft transition-colors"
          >
            Назад к курсу
          </Link>
        </div>
      </div>
    );
  }

  const hasQuestions = lesson.questions.length > 0;
  const currentQuestion = hasQuestions ? lesson.questions[currentQuestionIndex] : null;
  const totalXpEarned = Object.values(questionProgress).reduce((sum, p) => sum + p.xpEarned, 0);
  const currentQuestionProgress = currentQuestion ? questionProgress[currentQuestion.id] : undefined;
  const isQuestionCompleted = currentQuestionProgress?.completed || false;

  return (
    <div className="space-y-6">
      {/* Навигация */}
      <div className="space-y-3">
        {/* Ссылка к курсу + номер задания */}
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/courses/${courseId}/learn`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-tg-muted hover:text-tg-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>К курсу</span>
          </Link>
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-tg-bg-light border border-tg-border/50 text-[11px] sm:text-xs text-tg-muted">
            {lesson.questions.length > 0
              ? `Задание ${currentQuestionIndex + 1} из ${lesson.questions.length}`
              : 'Без заданий'}
          </div>
        </div>

        {/* Навигация по урокам */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (prevLesson) {
                navigate(`/courses/${courseId}/lessons/${prevLesson.id}`);
              }
            }}
            disabled={!prevLesson}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-tg-border/50 bg-tg-bg-light text-tg-text hover:bg-tg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--tg-bg-light)' }}
            title={
              prevLesson
                ? `Назад: ${prevLesson.title}`
                : 'Это первый урок'
            }
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Предыдущий урок</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (nextLesson && completed) {
                navigate(`/courses/${courseId}/lessons/${nextLesson.id}`);
              }
            }}
            disabled={!nextLesson || !completed}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-tg-border/50 bg-tg-bg-light text-tg-text hover:bg-tg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--tg-bg-light)' }}
            title={
              !nextLesson
                ? 'Это последний урок'
                : completed
                ? `Дальше: ${nextLesson.title}`
                : 'Сначала завершите текущий урок'
            }
          >
            <span>Следующий урок</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Заголовок урока */}
      <div className="bg-tg-bg-light rounded-2xl md:rounded-3xl border border-tg-border/50 p-5 md:p-6 shadow-tg-md" style={{ background: 'var(--tg-bg-light)' }}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-tg-text leading-snug">
              {lesson.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-tg-muted">
              {hasQuestions && (
                <span className="inline-flex px-2.5 py-1 rounded-full bg-tg-accent/10 text-tg-accent font-medium">
                  Заработано за урок: {totalXpEarned} XP
                </span>
              )}
              <span className="inline-flex px-2.5 py-1 rounded-full bg-tg-bg-secondary text-tg-muted font-medium" style={{ background: 'var(--tg-bg-secondary)' }}>
                Всего за задания: {lesson.questions.reduce((sum, q) => sum + (q.xpReward || 5), 0)} XP
              </span>
            </div>
          </div>
        </div>
        <div
          className="prose prose-invert max-w-none text-sm sm:text-base text-tg-text prose-headings:text-tg-text prose-p:text-tg-text prose-strong:text-tg-text prose-code:text-tg-accent"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(lesson.content) }}
        />
      </div>

      {/* Вопросы и задания */}
      {hasQuestions && (
        <div className="bg-tg-bg-light rounded-2xl border border-tg-border/50 p-6" style={{ background: 'var(--tg-bg-light)' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-tg-text">Вопросы и задания</h2>
              <p className="text-xs text-tg-muted">
                Отвечайте на вопросы по очереди. Правильные ответы подсвечиваются зелёным.
              </p>
            </div>
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-tg-bg-secondary text-tg-muted" style={{ background: 'var(--tg-bg-secondary)' }}>
              {currentQuestionIndex + 1} / {lesson.questions.length}
            </span>
          </div>

          {/* Индикаторы прогресса (квадратики) */}
          <div className="flex flex-wrap gap-2 mb-5">
            {lesson.questions.map((question, index) => {
              const status = getQuestionStatus(question.id);
              const isCurrent = index === currentQuestionIndex;
              const progress = questionProgress[question.id];
              
              return (
                <div
                  key={question.id}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 flex items-center justify-center font-semibold text-xs sm:text-sm transition-all ${
                    isCurrent
                      ? 'border-tg-accent bg-tg-accent/15 text-tg-accent'
                      : status === 'correct'
                      ? 'border-tg-success-border bg-tg-success-bg text-tg-success-text'
                      : status === 'incorrect' && showError[question.id]
                      ? 'border-tg-error-border bg-tg-error-bg text-tg-error-text animate-pulse'
                      : 'border-tg-border/40 bg-tg-bg text-tg-muted'
                  }`}
                  style={{
                    background: status === 'correct' 
                      ? 'var(--tg-success-bg)' 
                      : status === 'incorrect' && showError[question.id]
                      ? 'var(--tg-error-bg)'
                      : undefined,
                    color: status === 'correct' 
                      ? 'var(--tg-success-text)' 
                      : status === 'incorrect' && showError[question.id]
                      ? 'var(--tg-error-text)'
                      : undefined,
                    cursor: (progress?.completed || index === currentQuestionIndex || (index === currentQuestionIndex + 1 && questionProgress[lesson.questions[currentQuestionIndex]?.id]?.completed)) ? 'pointer' : 'not-allowed',
                    opacity: (progress?.completed || index === currentQuestionIndex || (index === currentQuestionIndex + 1 && questionProgress[lesson.questions[currentQuestionIndex]?.id]?.completed)) ? 1 : 0.5
                  }}
                  onClick={() => {
                    // Можно перейти к:
                    // 1. Уже решенным вопросам
                    // 2. Текущему вопросу
                    // 3. Следующему вопросу, если предыдущий решен
                    const canNavigate = 
                      progress?.completed || 
                      index === currentQuestionIndex ||
                      (index === currentQuestionIndex + 1 && questionProgress[lesson.questions[currentQuestionIndex]?.id]?.completed);
                    
                    if (canNavigate) {
                      setCurrentQuestionIndex(index);
                    }
                  }}
                  title={status === 'pending' ? `Вопрос ${index + 1}` : status === 'correct' ? 'Правильно' : 'Неправильно'}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>

          {/* Текущий вопрос */}
          {currentQuestion && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isQuestionCompleted
                      ? 'border-tg-success-border bg-tg-success-bg/60'
                      : showError[currentQuestion.id]
                      ? 'border-tg-error-border bg-tg-error-bg/70'
                      : results[currentQuestion.id]?.isCorrect
                      ? 'border-tg-success-border bg-tg-success-bg/60'
                      : 'bg-tg-bg border-tg-border/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-tg-text font-semibold text-base sm:text-lg mb-1">
                        {currentQuestion.questionText}
                      </p>
                      {!isQuestionCompleted && (
                        <span className="text-xs text-tg-muted">+{currentQuestion.xpReward || 5} XP за правильный ответ</span>
                      )}
                      {isQuestionCompleted && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ color: 'var(--tg-success-text)', background: 'var(--tg-success-bg)' }}>
                          ✓ Задание выполнено • +{currentQuestionProgress.xpEarned} XP
                        </span>
                      )}
                    </div>
                    {(isQuestionCompleted || results[currentQuestion.id]?.isCorrect) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ color: 'var(--tg-success-text)' }}
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                    {showError[currentQuestion.id] && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ color: 'var(--tg-error-text)' }}
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </motion.div>
                    )}
                  </div>

                  {currentQuestion.questionType === 'text_input' && (
                    <input
                      type="text"
                      value={answers[currentQuestion.id] || (isQuestionCompleted ? currentQuestion.correctAnswer || '' : '')}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      disabled={isQuestionCompleted}
                      className={`w-full px-4 py-3 rounded-xl border text-tg-text focus:outline-none focus:ring-2 transition-all ${
                        isQuestionCompleted
                          ? 'border-tg-success-border'
                          : showError[currentQuestion.id]
                          ? 'border-tg-error-border'
                          : 'bg-tg-bg-light border-tg-border/50 focus:ring-tg-accent/20'
                      }`}
                      style={{ 
                        background: isQuestionCompleted 
                          ? 'var(--tg-success-bg)' 
                          : showError[currentQuestion.id]
                          ? 'var(--tg-error-bg)'
                          : 'var(--tg-bg-light)',
                      }}
                    />
                  )}

                  {currentQuestion.questionType === 'single_choice' && currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option: string, idx: number) => {
                        // Определяем правильный ответ для single_choice
                        let correctOption = currentQuestion.correctAnswer;
                        try {
                          const correctIndices = JSON.parse(currentQuestion.correctAnswer || '[]');
                          if (Array.isArray(correctIndices) && correctIndices.length > 0) {
                            correctOption = currentQuestion.options[correctIndices[0]];
                          }
                        } catch {
                          // Используем correctAnswer как есть
                        }
                        
                        const isSelected = answers[currentQuestion.id] === option || (isQuestionCompleted && option === correctOption);
                        const isCorrect = isQuestionCompleted && option === correctOption;
                        return (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isQuestionCompleted
                                ? isCorrect
                                  ? 'border-tg-success-border'
                                  : 'opacity-50 border-tg-border/30'
                                : showError[currentQuestion.id] && isSelected
                                ? 'border-tg-error-border'
                                : 'bg-tg-bg-light border-tg-border/50 hover:border-tg-accent/50'
                            } ${isQuestionCompleted ? '' : 'cursor-pointer'}`}
                            style={{ 
                              background: isQuestionCompleted && isCorrect
                                ? 'var(--tg-success-bg)' 
                                : showError[currentQuestion.id] && isSelected
                                ? 'var(--tg-error-bg)'
                                : isQuestionCompleted
                                ? 'var(--tg-bg-secondary)'
                                : 'var(--tg-bg-light)',
                            }}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              value={option}
                              checked={isSelected}
                              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                              disabled={isQuestionCompleted}
                              className="w-4 h-4 text-tg-accent"
                            />
                            <span className="text-tg-text flex-1">{option}</span>
                            {isQuestionCompleted && isCorrect && (
                              <span className="text-xs" style={{ color: 'var(--tg-success-text)' }}>✓ Правильный ответ</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option: string, idx: number) => {
                        // Определяем правильные ответы для multiple_choice
                        let correctOptions: string[] = [];
                        try {
                          const correctIndices = JSON.parse(currentQuestion.correctAnswer || '[]');
                          if (Array.isArray(correctIndices)) {
                            correctOptions = correctIndices.map((idx: number) => currentQuestion.options[idx]).filter(Boolean);
                          }
                        } catch {
                          // Используем correctAnswer как есть
                          if (currentQuestion.correctAnswer) {
                            correctOptions = currentQuestion.correctAnswer.split(',').map(s => s.trim());
                          }
                        }
                        
                        // Используем индексы вместо текста для правильной работы с одинаковыми вариантами
                        const selectedIndices = answers[currentQuestion.id] || [];
                        const isSelected = Array.isArray(selectedIndices) && selectedIndices.includes(idx);
                        const isCorrect = isQuestionCompleted && correctOptions.includes(option);
                        return (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isQuestionCompleted
                                ? isCorrect
                                  ? 'border-tg-success-border'
                                  : 'opacity-50 border-tg-border/30'
                                : showError[currentQuestion.id] && isSelected
                                ? 'border-tg-error-border'
                                : 'bg-tg-bg-light border-tg-border/50 hover:border-tg-accent/50'
                            } ${isQuestionCompleted ? '' : 'cursor-pointer'}`}
                            style={{ 
                              background: isQuestionCompleted && isCorrect
                                ? 'var(--tg-success-bg)' 
                                : showError[currentQuestion.id] && isSelected
                                ? 'var(--tg-error-bg)'
                                : isQuestionCompleted
                                ? 'var(--tg-bg-secondary)'
                                : 'var(--tg-bg-light)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleMultipleChoiceChange(currentQuestion.id, idx, e.target.checked)}
                              disabled={isQuestionCompleted}
                              className="w-4 h-4 text-tg-accent"
                            />
                            <span className="text-tg-text flex-1">{option}</span>
                            {isQuestionCompleted && isCorrect && (
                              <span className="text-xs" style={{ color: 'var(--tg-success-text)' }}>✓ Правильный ответ</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.questionType === 'code_editor' && (
                    <div className="space-y-3">
                      <textarea
                        value={answers[currentQuestion.id] || currentQuestion.codeTemplate || (isQuestionCompleted ? currentQuestion.codeTemplate || '' : '')}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        disabled={isQuestionCompleted}
                        rows={12}
                        className={`w-full px-4 py-3 rounded-xl border font-mono text-sm focus:outline-none focus:ring-2 resize-none transition-all ${
                          isQuestionCompleted
                            ? 'border-tg-success-border text-tg-text'
                            : showError[currentQuestion.id]
                            ? 'border-tg-error-border text-tg-text'
                            : 'bg-tg-bg-light border-tg-border/50 text-tg-text focus:ring-tg-accent/20'
                        }`}
                        style={{ 
                          background: isQuestionCompleted 
                            ? 'var(--tg-success-bg)' 
                            : showError[currentQuestion.id]
                            ? 'var(--tg-error-bg)'
                            : 'var(--tg-bg-light)',
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRunCode(currentQuestion)}
                          disabled={isQuestionCompleted}
                          className="px-4 py-2 rounded-xl bg-tg-bg-secondary border border-tg-border/50 text-tg-text hover:bg-tg-hover transition-colors text-sm font-medium disabled:opacity-50"
                          style={{ background: 'var(--tg-bg-secondary)' }}
                        >
                          ▶ Запустить код
                        </button>
                        {currentQuestion.expectedOutput && (
                          <div className="flex-1 p-3 rounded-xl bg-tg-bg-secondary text-tg-muted text-sm" style={{ background: 'var(--tg-bg-secondary)' }}>
                            Ожидаемый результат: {currentQuestion.expectedOutput}
                          </div>
                        )}
                      </div>
                      {codeOutput[currentQuestion.id] && (
                        <div className="p-3 rounded-xl bg-tg-bg border border-tg-border/50 font-mono text-sm text-tg-text">
                          <div className="text-xs text-tg-muted mb-1">Вывод:</div>
                          {codeOutput[currentQuestion.id]}
                        </div>
                      )}
                      {isQuestionCompleted && (
                        <div className="p-3 rounded-xl border" style={{ background: 'var(--tg-success-bg)', borderColor: 'var(--tg-success-border)' }}>
                          <div className="text-xs mb-1" style={{ color: 'var(--tg-success-text)' }}>Ожидаемый результат:</div>
                          <div className="text-sm text-tg-text font-mono">{currentQuestion.expectedOutput}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {isQuestionCompleted && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 rounded-xl border border-tg-success-border"
                      style={{ background: 'var(--tg-success-bg)' }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--tg-success-text)' }}>
                        Отлично! Это задание полностью зачтено, XP уже добавлены в ваш дневной прогресс.
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Кнопка отправки */}
                {!isQuestionCompleted && (
                  <div className="flex justify-end">
                    <button
                      ref={submitButtonRef}
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={submitting || showError[currentQuestion.id]}
                      className="px-6 py-3 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-white font-semibold transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Проверка...' : showError[currentQuestion.id] ? 'Попробуйте еще раз' : 'Проверить ответ'}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

    </div>
  );
};

export default LessonLearn;
