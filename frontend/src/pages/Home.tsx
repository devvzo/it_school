import type { FC } from 'react';
import ProgressCard from '../components/ProgressCard';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';

const Home: FC = () => {
  const { progress } = useProgress();
  const { user } = useAuth();

  if (!progress || !user) return null;

  return (
    <ProgressCard
      streakDays={progress.streakDays}
      todayXp={progress.todayXp}
      minXp={progress.minXp}
      userName={user.name}
    />
  );
};

export default Home;
