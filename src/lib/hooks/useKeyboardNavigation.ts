import { useState, useCallback, useEffect } from 'react';

interface UseKeyboardNavigationOptions {
  enabled?: boolean;
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { enabled = true, onLeft, onRight, onUp, onDown } = options;
  const [keyState, setKeyState] = useState<{
    leftPressed: boolean;
    rightPressed: boolean;
    upPressed: boolean;
    downPressed: boolean;
  }>({
    leftPressed: false,
    rightPressed: false,
    upPressed: false,
    downPressed: false,
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      
      if (key === 'ArrowLeft') {
        setKeyState((prev) => ({ ...prev, leftPressed: true }));
        onLeft?.();
        e.preventDefault();
      } else if (key === 'ArrowRight') {
        setKeyState((prev) => ({ ...prev, rightPressed: true }));
        onRight?.();
        e.preventDefault();
      } else if (key === 'ArrowUp') {
        setKeyState((prev) => ({ ...prev, upPressed: true }));
        onUp?.();
        e.preventDefault();
      } else if (key === 'ArrowDown') {
        setKeyState((prev) => ({ ...prev, downPressed: true }));
        onDown?.();
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      
      if (key === 'ArrowLeft') {
        setKeyState((prev) => ({ ...prev, leftPressed: false }));
      } else if (key === 'ArrowRight') {
        setKeyState((prev) => ({ ...prev, rightPressed: false }));
      } else if (key === 'ArrowUp') {
        setKeyState((prev) => ({ ...prev, upPressed: false }));
      } else if (key === 'ArrowDown') {
        setKeyState((prev) => ({ ...prev, downPressed: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, onLeft, onRight, onUp, onDown]);

  return keyState;
}
