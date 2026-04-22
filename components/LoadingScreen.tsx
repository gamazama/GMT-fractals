
import React, { useEffect, useRef, useState } from 'react';

// Generic loading scene.
//
// GMT's LoadingScreen was a rich splash with a CPU fractal spinner, formula
// picker, GMF file drop, lite-mode toggle, etc. The engine ships a minimal
// splash: progress shell + auto-boot once the store is hydrated. Apps that
// want a richer loading experience replace this component.

interface LoadingScreenProps {
  isReady: boolean;
  onFinished: () => void;
  startupMode: 'default' | 'url';
  bootEngine: (force?: boolean) => void;
  isHydrated: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isReady,
  onFinished,
  bootEngine,
  isHydrated,
}) => {
  const [opacity, setOpacity] = useState(1);
  const [isVisible, setIsVisible] = useState(true);
  const hasBootedRef = useRef(false);

  // Trigger engine boot as soon as the store is hydrated.
  useEffect(() => {
    if (isHydrated && !hasBootedRef.current) {
      hasBootedRef.current = true;
      bootEngine();
    }
  }, [isHydrated, bootEngine]);

  // Fade out once the scene is ready.
  useEffect(() => {
    if (!isReady) return;
    const fadeT = setTimeout(() => setOpacity(0), 100);
    const doneT = setTimeout(() => {
      setIsVisible(false);
      onFinished();
    }, 600);
    return () => { clearTimeout(fadeT); clearTimeout(doneT); };
  }, [isReady, onFinished]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-500"
      style={{ opacity }}
    >
      <div className="text-white text-sm font-mono tracking-widest opacity-60">
        {isHydrated ? 'Booting…' : 'Loading…'}
      </div>
    </div>
  );
};
