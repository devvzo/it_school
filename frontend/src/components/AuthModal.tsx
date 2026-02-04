import type { FC, KeyboardEvent } from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'login' | 'register' | 'verify' | 'reset';
type VerifyFlow = 'register' | 'reset' | null;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  lastName?: string;
  email: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
}

interface ResetFormValues {
  email: string;
}

interface VerifyFormValues {
  email: string;
  code: string;
  password?: string;
  confirmPassword?: string;
}

const panelVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const passwordStrength = (value: string): 'weak' | 'medium' | 'strong' => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) return 'weak';
  if (score === 2 || score === 3) return 'medium';
  return 'strong';
};

const strengthLabel: Record<ReturnType<typeof passwordStrength>, string> = {
  weak: 'Слабый пароль',
  medium: 'Средний пароль',
  strong: 'Надёжный пароль',
};

const strengthColor: Record<ReturnType<typeof passwordStrength>, string> = {
  weak: 'bg-red-500 dark:bg-red-500',
  medium: 'bg-yellow-500 dark:bg-yellow-400',
  strong: 'bg-emerald-500 dark:bg-emerald-500',
};

const AuthModal: FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [verifyFlow, setVerifyFlow] = useState<VerifyFlow>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [verifyEmail, setVerifyEmail] = useState<string>('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>();

  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    watch: watchRegister,
    formState: { errors: registerErrors },
  } = useForm<RegisterFormValues>();

  const {
    register: resetRegister,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetFormValues>();

  const {
    register: verifyRegister,
    handleSubmit: handleVerifySubmit,
    setValue: setVerifyValue,
    formState: { errors: verifyErrors },
  } = useForm<VerifyFormValues>();

  const currentPassword = watchRegister('password', '');
  const pwdStrength = passwordStrength(currentPassword);

  useEffect(() => {
    if (mode === 'verify' && verifyFlow === 'register') {
      setTimeout(() => {
        document.getElementById('code-0')?.focus();
      }, 100);
    }
  }, [mode, verifyFlow]);

  const close = () => {
    onClose();
    setTimeout(() => {
      setMode('login');
      setVerifyFlow(null);
      setError(null);
      setCodeDigits(['', '', '', '', '', '']);
      setCodeStatus('idle');
      setVerifyEmail('');
    }, 200);
  };

  const onSubmitLogin = async (data: LoginFormValues) => {
    setError(null);
    try {
      const res = await axios.post('/api/auth/login', data);
      login(res.data.user, res.data.token);
      close();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка входа');
    }
  };

  const onSubmitRegister = async (data: RegisterFormValues) => {
    setError(null);
    if (registerLoading) return;
    setRegisterLoading(true);
    try {
      await axios.post('/api/auth/register', {
        name: `${data.lastName?.trim() ?? ''} ${data.name}`.trim(),
        email: data.email,
        password: data.password,
      });
      setVerifyEmail(data.email);
      setVerifyFlow('register');
      setMode('verify');
      setCodeDigits(['', '', '', '', '', '']);
      setCodeStatus('idle');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка регистрации');
    } finally {
      setRegisterLoading(false);
    }
  };

  const onSubmitReset = async (data: ResetFormValues) => {
    setError(null);
    if (resetLoading) return;
    setResetLoading(true);
    try {
      await axios.post('/api/auth/request-reset', data);
      setVerifyEmail(data.email);
      setVerifyFlow('reset');
      setMode('verify');
      setCodeDigits(['', '', '', '', '', '']);
      setCodeStatus('idle');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка запроса сброса');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCodeChange = async (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Только цифры
    
    const newDigits = [...codeDigits];
    newDigits[index] = value.slice(-1); // Только последний символ
    setCodeDigits(newDigits);
    setError(null);
    setCodeStatus('idle');

    // Автоматический переход на следующее поле
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }

    // Проверка кода при заполнении всех полей
    if (newDigits.every(d => d !== '') && newDigits.length === 6) {
      const code = newDigits.join('');
      await verifyCode(code);
    }
  };

  const handleCodeKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyCode = async (code: string) => {
    if (code.length !== 6) return;
    
    setCodeStatus('checking');
    setError(null);

    try {
      if (verifyFlow === 'reset') {
        // Для сброса пароля нужен пароль
        return;
      } else {
        const res = await axios.post('/api/auth/verify-email', {
          email: verifyEmail,
          code: code,
        });
        setCodeStatus('success');
        login(res.data.user, res.data.token);
        setTimeout(() => {
          close();
          window.location.reload();
        }, 2000);
      }
    } catch (e: any) {
      setCodeStatus('error');
      setError(e?.response?.data?.message ?? 'Неверный код');
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        document.getElementById('code-0')?.focus();
      }, 100);
    }
  };

  const onSubmitVerify = async (data: VerifyFormValues) => {
    setError(null);
    try {
      if (verifyFlow === 'reset') {
        const code = codeDigits.join('');
        if (code.length !== 6) {
          setError('Введите код из 6 цифр');
          return;
        }
        if (!data.password || !data.confirmPassword) {
          setError('Введите новый пароль и его подтверждение');
          return;
        }
        if (data.password !== data.confirmPassword) {
          setError('Пароли не совпадают');
          return;
        }
        await axios.post('/api/auth/reset-password', {
          email: verifyEmail,
          token: code,
          password: data.password,
        });
        setError(null);
        setMode('login');
        setVerifyFlow(null);
        setCodeDigits(['', '', '', '', '', '']);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка подтверждения');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-3 sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          style={{
            background:
              'radial-gradient(circle at top, rgba(15, 23, 42, 0.28), transparent 55%), rgba(15, 23, 42, 0.28)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            className="w-full max-w-md mx-auto rounded-3xl border shadow-[0_22px_50px_rgba(15,23,42,0.35)] overflow-hidden"
            style={{
              background: 'var(--tg-bg-light)',
              border: '1px solid var(--tg-border)',
            }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок */}
            <div
              className="px-6 py-5 flex items-start justify-between"
              style={{
                borderBottom: '1px solid var(--tg-border)',
                background: 'var(--tg-bg-secondary)',
              }}
            >
                <div className="flex-1 pr-4">
                  <h2 className="text-xl font-bold text-tg-text mb-1.5">
                    {mode === 'login' && 'Вход в IT School'}
                    {mode === 'register' && 'Регистрация'}
                    {mode === 'verify' &&
                      (verifyFlow === 'reset' ? 'Сброс пароля' : 'Подтверждение email')}
                    {mode === 'reset' && 'Восстановление пароля'}
                  </h2>
                  <p className="text-sm text-tg-muted leading-relaxed">
                    {mode === 'login' && 'Продолжите обучение или начните новый курс'}
                    {mode === 'register' && 'Создайте аккаунт за пару секунд'}
                    {mode === 'verify' &&
                      (verifyFlow === 'reset'
                        ? 'Введите код из письма и новый пароль'
                        : 'Код отправлен на вашу почту')}
                    {mode === 'reset' && 'Мы отправим код для восстановления на вашу почту'}
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={close}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-tg-muted hover:text-tg-text transition-colors duration-200 flex-shrink-0"
                  style={{
                    background: 'var(--tg-hover)',
                  }}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Закрыть"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              <div className="p-6 sm:p-7">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-xl"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <p className="text-sm text-red-500 dark:text-red-400 font-medium flex items-center gap-2">
                      <span>⚠</span>
                      {error}
                    </p>
                  </motion.div>
                )}
                <AnimatePresence mode="wait">
                  {mode === 'login' && (
                    <motion.form
                      key="login"
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                      onSubmit={handleLoginSubmit(onSubmitLogin)}
                    >
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-tg-muted mb-1.5">
                          Электронная почта
                        </label>
                        <input
                          type="email"
                          className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                          style={{
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                          }}
                          placeholder="you@example.com"
                          {...loginRegister('email', { required: 'Введите email' })}
                        />
                        {loginErrors.email && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                            <span>⚠</span>
                            {loginErrors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-tg-muted mb-1.5">
                          Пароль
                        </label>
                        <input
                          type="password"
                          className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                          style={{
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                          }}
                          placeholder="Введите пароль"
                          {...loginRegister('password', { required: 'Введите пароль' })}
                        />
                        {loginErrors.password && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                            <span>⚠</span>
                            {loginErrors.password.message}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => setMode('reset')}
                          className="text-tg-accent hover:text-tg-accent-soft transition-colors font-medium"
                        >
                          Забыли пароль?
                        </button>
                      </div>
                      <motion.button
                        type="submit"
                        className="w-full mt-4 text-sm font-semibold py-3.5 rounded-2xl transition-all duration-200 text-white"
                        style={{
                          background: 'var(--tg-accent)',
                          boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)',
                        }}
                        whileHover={{ 
                          scale: 1.02,
                          boxShadow: '0 6px 16px rgba(42, 171, 238, 0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Войти
                      </motion.button>
                      <p className="text-xs text-center text-tg-muted pt-3">
                        Нет аккаунта?{' '}
                        <button
                          type="button"
                          className="text-tg-accent hover:underline font-semibold transition-all"
                          onClick={() => setMode('register')}
                        >
                          Зарегистрироваться
                        </button>
                      </p>
                    </motion.form>
                  )}

                  {mode === 'register' && (
                    <motion.form
                      key="register"
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                      onSubmit={handleRegisterSubmit(onSubmitRegister)}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2.5">
                          <label className="block text-xs font-semibold text-tg-muted mb-1.5">Имя</label>
                          <input
                            type="text"
                            className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                            style={{
                              background: 'var(--tg-bg)',
                              border: '1px solid var(--tg-border)',
                            }}
                            placeholder="Иван"
                            {...registerRegister('name', { required: 'Введите имя' })}
                          />
                          {registerErrors.name && (
                            <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                              <span>⚠</span>
                              {registerErrors.name.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2.5">
                          <label className="block text-xs font-semibold text-tg-muted mb-1.5">Фамилия</label>
                          <input
                            type="text"
                            className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                            style={{
                              background: 'var(--tg-bg)',
                              border: '1px solid var(--tg-border)',
                            }}
                            placeholder="Иванов"
                            {...registerRegister('lastName')}
                          />
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-tg-muted mb-1.5">Электронная почта</label>
                        <input
                          type="email"
                          className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                          style={{
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                          }}
                          placeholder="you@example.com"
                          {...registerRegister('email', {
                            required: 'Введите email',
                            pattern: {
                              value: /^\S+@\S+\.\S+$/,
                              message: 'Неверный формат email',
                            },
                          })}
                        />
                        {registerErrors.email && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                            <span>⚠</span>
                            {registerErrors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-tg-muted mb-1.5">Пароль</label>
                        <input
                          type="password"
                          className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                          style={{
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                          }}
                          placeholder="Минимум 8 символов"
                          {...registerRegister('password', {
                            required: 'Введите пароль',
                            minLength: { value: 8, message: 'Минимум 8 символов' },
                            validate: (value) =>
                              /[A-Z]/.test(value) ||
                              'Пароль должен содержать хотя бы одну заглавную букву, цифру и символ',
                          })}
                        />
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-tg-bg overflow-hidden">
                            <div
                              className={`h-full ${strengthColor[pwdStrength]} transition-all`}
                              style={{
                                width:
                                pwdStrength === 'weak' ? '33%' : pwdStrength === 'medium' ? '66%' : '100%',
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-tg-muted">{strengthLabel[pwdStrength]}</span>
                        </div>
                        {registerErrors.password && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                            <span>⚠</span>
                            {registerErrors.password.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-tg-muted mb-1.5">Повторите пароль</label>
                        <input
                          type="password"
                          className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                          style={{
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                          }}
                          placeholder="Ещё раз пароль"
                          {...registerRegister('confirmPassword', {
                            required: 'Повторите пароль',
                            validate: (value, formValues) =>
                              value === formValues.password || 'Пароли не совпадают',
                          })}
                        />
                        {registerErrors.confirmPassword && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                            <span>⚠</span>
                            {registerErrors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                      <div className="flex items-start gap-2 text-xs text-tg-muted">
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-tg-border/50 bg-tg-bg text-tg-accent focus:ring-tg-accent focus:ring-2"
                          {...registerRegister('agree', { required: 'Подтвердите условия использования' })}
                        />
                        <span>
                          Я принимаю{' '}
                          <button type="button" className="text-tg-accent hover:text-[var(--tg-accent-soft)] underline transition-colors">
                            условия использования
                          </button>{' '}
                          и политику конфиденциальности.
                        </span>
                      </div>
                        {registerErrors.agree && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                            <span>⚠</span>
                            {registerErrors.agree.message}
                          </p>
                        )}

                      <motion.button
                        type="submit"
                        disabled={registerLoading}
                        className="w-full mt-4 text-sm font-semibold py-3.5 rounded-2xl transition-all duration-200 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: 'var(--tg-accent)',
                          boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)',
                        }}
                        whileHover={{ 
                          scale: registerLoading ? 1 : 1.02,
                          boxShadow: registerLoading ? '0 4px 12px rgba(42, 171, 238, 0.3)' : '0 6px 16px rgba(42, 171, 238, 0.4)',
                        }}
                        whileTap={{ scale: registerLoading ? 1 : 0.98 }}
                      >
                        {registerLoading ? 'Отправка кода...' : 'Зарегистрироваться'}
                      </motion.button>
                      <p className="text-xs text-center text-tg-muted pt-3">
                        Уже есть аккаунт?{' '}
                        <button
                          type="button"
                          className="text-tg-accent hover:underline font-semibold transition-all"
                          onClick={() => setMode('login')}
                        >
                          Войти
                        </button>
                      </p>
                    </motion.form>
                  )}

                  {mode === 'reset' && (
                    <motion.form
                      key="reset"
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                      onSubmit={handleResetSubmit(onSubmitReset)}
                    >
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-tg-muted mb-1.5">Электронная почта</label>
                        <input
                          type="email"
                          className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                          style={{
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                          }}
                          placeholder="you@example.com"
                          {...resetRegister('email', {
                            required: 'Введите email',
                            pattern: {
                              value: /^\S+@\S+\.\S+$/,
                              message: 'Неверный формат email',
                            },
                          })}
                        />
                        {resetErrors.email && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                            <span>⚠</span>
                            {resetErrors.email.message}
                          </p>
                        )}
                      </div>
                      <motion.button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full mt-4 text-sm font-semibold py-3.5 rounded-2xl transition-all duration-200 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: 'var(--tg-accent)',
                          boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)',
                        }}
                        whileHover={{ 
                          scale: resetLoading ? 1 : 1.02,
                          boxShadow: resetLoading ? '0 4px 12px rgba(42, 171, 238, 0.3)' : '0 6px 16px rgba(42, 171, 238, 0.4)',
                        }}
                        whileTap={{ scale: resetLoading ? 1 : 0.98 }}
                      >
                        {resetLoading ? 'Отправка...' : 'Отправить ссылку для сброса'}
                      </motion.button>
                      <p className="text-xs text-center text-tg-muted pt-3">
                        Вспомнили пароль?{' '}
                        <button
                          type="button"
                          className="text-tg-accent hover:underline font-semibold transition-all"
                          onClick={() => setMode('login')}
                        >
                          Войти
                        </button>
                      </p>
                    </motion.form>
                  )}

                  {mode === 'verify' && (
                    <motion.div
                      key="verify"
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {verifyFlow === 'register' && (
                        <>
                          <div className="space-y-4">
                            <div className="space-y-2.5">
                              <label className="block text-xs font-semibold text-tg-muted mb-1.5 text-center">
                                Введите код из письма
                              </label>
                              <div className="flex justify-center gap-2">
                                {codeDigits.map((digit, index) => (
                                  <input
                                    key={index}
                                    id={`code-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                    className="w-12 h-14 rounded-xl text-center text-xl font-bold transition-all duration-200"
                                    style={{
                                      background: codeStatus === 'error' 
                                        ? 'rgba(239, 68, 68, 0.1)' 
                                        : codeStatus === 'success'
                                        ? 'rgba(16, 185, 129, 0.1)'
                                        : 'var(--tg-bg)',
                                      border: codeStatus === 'error'
                                        ? '2px solid rgba(239, 68, 68, 0.5)'
                                        : codeStatus === 'success'
                                        ? '2px solid rgba(16, 185, 129, 0.5)'
                                        : '1px solid var(--tg-border)',
                                      color: 'var(--tg-text)',
                                    }}
                                    disabled={codeStatus === 'checking' || codeStatus === 'success'}
                                  />
                                ))}
                              </div>
                              {codeStatus === 'checking' && (
                                <p className="text-xs text-tg-muted text-center">Проверка кода...</p>
                              )}
                              {codeStatus === 'error' && (
                                <p className="text-xs text-red-500 dark:text-red-400 font-medium text-center flex items-center justify-center gap-1.5">
                                  <span>⚠</span>
                                  Неверный код
                                </p>
                              )}
                              {codeStatus === 'success' && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="p-3 rounded-xl text-center"
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                  }}
                                >
                                  <p className="text-sm text-emerald-500 dark:text-emerald-400 font-medium flex items-center justify-center gap-2">
                                    <span>✓</span>
                                    Аккаунт зарегистрирован! Сейчас вы будете перенаправлены на главную
                                  </p>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                      {verifyFlow === 'reset' && (
                        <motion.form
                          key="reset-verify"
                          onSubmit={handleVerifySubmit(onSubmitVerify)}
                          className="space-y-4"
                        >
                          <div className="space-y-2.5">
                            <label className="block text-xs font-semibold text-tg-muted mb-1.5 text-center">
                              Введите код из письма
                            </label>
                            <div className="flex justify-center gap-2">
                              {codeDigits.map((digit, index) => (
                                <input
                                  key={index}
                                  id={`code-reset-${index}`}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleCodeChange(index, e.target.value)}
                                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                  className="w-12 h-14 rounded-xl text-center text-xl font-bold transition-all duration-200"
                                  style={{
                                    background: 'var(--tg-bg)',
                                    border: '1px solid var(--tg-border)',
                                    color: 'var(--tg-text)',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2.5">
                            <label className="block text-xs font-semibold text-tg-muted mb-1.5">
                              Новый пароль
                            </label>
                            <input
                              type="password"
                              className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                          style={{
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                          }}
                              placeholder="Минимум 8 символов"
                              {...verifyRegister('password', {
                                minLength: { value: 8, message: 'Минимум 8 символов' },
                              })}
                            />
                            {verifyErrors.password && (
                              <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                                <span>⚠</span>
                                {verifyErrors.password.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2.5">
                            <label className="block text-xs font-semibold text-tg-muted mb-1.5">
                              Повторите новый пароль
                            </label>
                            <input
                              type="password"
                              className="w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 text-tg-text placeholder:text-tg-muted/60 focus:outline-none focus:border-tg-accent focus:ring-2 focus:ring-tg-accent/20"
                          style={{
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                          }}
                              placeholder="Ещё раз пароль"
                              {...verifyRegister('confirmPassword')}
                            />
                          </div>
                          <motion.button
                            type="submit"
                            className="w-full mt-4 text-sm font-semibold py-3.5 rounded-2xl transition-all duration-200 text-white"
                            style={{
                              background: 'var(--tg-accent)',
                              boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)',
                            }}
                            whileHover={{ 
                              scale: 1.02,
                              boxShadow: '0 6px 16px rgba(42, 171, 238, 0.4)',
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Подтвердить
                          </motion.button>
                        </motion.form>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;


