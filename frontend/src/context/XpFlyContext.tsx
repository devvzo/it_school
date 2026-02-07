import type { FC, ReactNode } from 'react';
import { createContext, useContext, useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

export interface XpFlyCall {
  id: number;
  amount: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onArrived: () => void;
}

interface XpFlyContextValue {
  registerTargetRef: (ref: React.RefObject<HTMLDivElement | null>) => () => void;
  flyXp: (amount: number, sourceRect: DOMRect | null, onArrived: () => void) => void;
}

const XpFlyContext = createContext<XpFlyContextValue | undefined>(undefined);

let nextId = 0;
const FLY_DURATION_MS = 880;

export const XpFlyProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const targetRefs = useRef<Set<React.RefObject<HTMLDivElement | null>>>(new Set());
  const [calls, setCalls] = useState<XpFlyCall[]>([]);

  const getTargetRect = useCallback((): DOMRect | null => {
    for (const ref of targetRefs.current) {
      const el = ref?.current;
      if (!el?.offsetParent) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return rect;
    }
    return null;
  }, []);

  const registerTargetRef = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    targetRefs.current.add(ref);
    return () => {
      targetRefs.current.delete(ref);
    };
  }, []);

  const flyXp = useCallback(
    (amount: number, sourceRect: DOMRect | null, onArrived: () => void) => {
      const targetRect = getTargetRect();
      const startX = sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth / 2;
      const startY = sourceRect ? sourceRect.top + sourceRect.height / 2 : window.innerHeight / 2;
      const endX = targetRect != null ? targetRect.left + targetRect.width / 2 : startX;
      const endY = targetRect != null ? targetRect.top + targetRect.height / 2 : startY;

      const id = nextId++;
      setCalls((prev) => [
        ...prev,
        { id, amount, startX, startY, endX, endY, onArrived },
      ]);
    },
    [getTargetRect]
  );

  const removeCall = useCallback((id: number) => {
    setCalls((prev) => {
      const call = prev.find((c) => c.id === id);
      if (call) call.onArrived();
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const contextValue = useMemo(
    () => ({ registerTargetRef, flyXp }),
    [registerTargetRef, flyXp]
  );

  const portalContent = useMemo(
    () =>
      createPortal(
        <div
          className="fixed inset-0 pointer-events-none z-[100]"
          style={{ contain: 'strict' }}
          aria-hidden="true"
        >
          {calls.map((call) => (
            <FlyingXp
              key={call.id}
              call={call}
              onComplete={() => removeCall(call.id)}
              duration={FLY_DURATION_MS}
            />
          ))}
        </div>,
        document.body
      ),
    [calls, removeCall]
  );

  return (
    <XpFlyContext.Provider value={contextValue}>
      {children}
      {typeof document !== 'undefined' && portalContent}
    </XpFlyContext.Provider>
  );
};

const XP_TEXT_COLOR = 'var(--tg-muted)';
const arcY = (t: number, h: number) => 4 * h * t * (1 - t);
// Один easing для всей анимации — меньше вычислений
const EASE = [0.25, 0.7, 0.35, 1] as const;

const FlyingXp: FC<{
  call: XpFlyCall;
  onComplete: () => void;
  duration: number;
}> = ({ call, onComplete, duration }) => {
  const dx = call.endX - call.startX;
  const dy = call.endY - call.startY;
  const dist = Math.hypot(dx, dy);
  const arcH = -Math.min(56, dist * 0.18 + 26);
  const sec = duration / 1000;

  // Только 3 ключевых кадра пути — минимум интерполяции, дуга сохраняется
  const path = useMemo(() => {
    const t = 0.5;
    return {
      x: [0, dx * t, dx] as const,
      y: [0, dy * t + arcY(t, arcH), dy] as const,
    };
  }, [dx, dy, arcH]);

  const t = useMemo(
    () => ({ duration: sec, ease: EASE }),
    [sec]
  );

  return (
    <motion.div
      className="absolute flex items-center justify-center text-[12px] font-semibold whitespace-nowrap"
      style={{
        left: call.startX,
        top: call.startY,
        transform: 'translate(-50%, -50%) translateZ(0)',
        color: XP_TEXT_COLOR,
        willChange: 'transform, opacity',
      }}
      initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
      animate={{
        x: path.x,
        y: path.y,
        scale: [0.6, 1, 0.4],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        x: t,
        y: t,
        scale: t,
        opacity: { duration: sec, times: [0, 0.08, 0.9, 1], ease: EASE },
      }}
      onAnimationComplete={onComplete}
    >
      +{call.amount} XP
    </motion.div>
  );
};

export const useXpFly = (): XpFlyContextValue => {
  const ctx = useContext(XpFlyContext);
  if (!ctx) {
    throw new Error('useXpFly must be used within XpFlyProvider');
  }
  return ctx;
};
