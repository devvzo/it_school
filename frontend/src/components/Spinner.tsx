import type { FC } from 'react';
import { motion } from 'framer-motion';

interface SpinnerProps {
  size?: 'sm' | 'md';
}

const Spinner: FC<SpinnerProps> = ({ size = 'md' }) => {
  const dimension = size === 'sm' ? 16 : 24;

  return (
    <motion.span
      className="inline-block rounded-full border-2 border-t-transparent border-tg-accent"
      style={{ width: dimension, height: dimension }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
    />
  );
};

export default Spinner;

