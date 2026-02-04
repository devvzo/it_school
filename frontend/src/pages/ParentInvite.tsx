import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../components/Spinner';

interface InviteInfo {
  parentName: string;
  childName: string;
}

const ParentInvite: FC = () => {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<'accept' | 'reject' | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('Неверная ссылка приглашения');
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get<InviteInfo>(`/api/parents/invite/${token}`);
        setInfo(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Приглашение не найдено или устарело');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleRespond = async (action: 'accept' | 'reject') => {
    if (!token || responding) return;
    setResponding(action);
    setError(null);
    try {
      const res = await axios.post<{ message: string }>(`/api/parents/invite/${token}/respond`, { action });
      setDoneMessage(res.data.message);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка обработки запроса');
    } finally {
      setResponding(null);
    }
  };

  return (
    <section className="flex-1 bg-tg-bg-light/80 rounded-xl sm:rounded-2xl md:rounded-3xl border border-tg-border/50 shadow-tg-md p-4 sm:p-5 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-4 sm:space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="space-y-3 text-center">
            <h1 className="text-lg sm:text-xl font-bold">Приглашение недоступно</h1>
            <p className="text-sm sm:text-base text-red-500 dark:text-red-400">{error}</p>
            <p className="text-xs sm:text-sm text-tg-muted">
              Если вы считаете, что это ошибка, обратитесь к своему родителю или в поддержку школы.
            </p>
          </div>
        ) : doneMessage ? (
          <div className="space-y-4 text-center">
            <h1 className="text-lg sm:text-xl font-bold">Запрос обработан</h1>
            <p className="text-sm sm:text-base text-tg-text">{doneMessage}</p>
            <p className="text-xs sm:text-sm text-tg-muted">
              Вы можете закрыть эту страницу или перейти на главную.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              На главную
            </Link>
          </div>
        ) : info ? (
          <div className="space-y-4">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
              Запрос на родительский контроль
            </h1>
            <p className="text-sm sm:text-base text-tg-text">
              <strong>{info.parentName}</strong> запрашивает доступ к контролю за вашим прогрессом
              в IT‑школе для аккаунта <strong>{info.childName}</strong>.
            </p>
            <div className="rounded-xl border border-tg-border/40 bg-tg-bg-secondary/60 px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-tg-muted space-y-1.5">
              <p>После подтверждения родитель получит доступ:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>к списку ваших курсов и статусу прохождения;</li>
                <li>к прогрессу по урокам и домашним заданиям;</li>
                <li>к вашему дневному прогрессу и выполнению минимального XP;</li>
                <li>к общей статистике обучения (без доступа к паролю и личной переписке).</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleRespond('accept')}
                disabled={responding === 'accept'}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {responding === 'accept' ? 'Подтверждаем...' : 'Подтвердить'}
              </button>
              <button
                type="button"
                onClick={() => handleRespond('reject')}
                disabled={responding === 'reject'}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-tg-border/60 bg-tg-bg text-xs sm:text-sm font-semibold text-tg-text hover:bg-tg-bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {responding === 'reject' ? 'Отклоняем...' : 'Отклонить'}
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-tg-muted">
              Если вы не ожидали этот запрос, нажмите «Отклонить». Это не повлияет на ваш доступ к
              курсам.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ParentInvite;

