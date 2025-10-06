import { useEffect, useState, useCallback } from 'react';

interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
}

export const useAccessibility = () => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false
  });

  useEffect(() => {
    // Check for system preferences
    const mediaQueries = {
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      largeText: window.matchMedia('(prefers-reduced-data: reduce)') // Approximate for large text
    };

    // Check for screen reader
    const checkScreenReader = () => {
      return (
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver') ||
        window.speechSynthesis?.getVoices().length > 0
      );
    };

    const updatePreferences = () => {
      setPreferences({
        reduceMotion: mediaQueries.reduceMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
        largeText: mediaQueries.largeText.matches,
        screenReader: checkScreenReader()
      });
    };

    // Initial check
    updatePreferences();

    // Listen for changes
    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updatePreferences);
    });

    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updatePreferences);
      });
    };
  }, []);

  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return {
    preferences,
    announceToScreenReader,
    focusElement
  };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = () => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((
    event: KeyboardEvent,
    items: NodeListOf<HTMLElement> | HTMLElement[],
    onSelect?: (index: number) => void
  ) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => {
          const next = prev < items.length - 1 ? prev + 1 : 0;
          items[next]?.focus();
          return next;
        });
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => {
          const next = prev > 0 ? prev - 1 : items.length - 1;
          items[next]?.focus();
          return next;
        });
        break;
      
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(focusedIndex);
        break;
      
      case 'Escape':
        event.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        break;
    }
  }, [focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown
  };
};

// Hook for focus management
export const useFocusManagement = () => {
  const [focusHistory, setFocusHistory] = useState<HTMLElement[]>([]);

  const saveFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      setFocusHistory(prev => [...prev, activeElement]);
    }
  }, []);

  const restoreFocus = useCallback(() => {
    const lastFocused = focusHistory[focusHistory.length - 1];
    if (lastFocused) {
      lastFocused.focus();
      setFocusHistory(prev => prev.slice(0, -1));
    }
  }, [focusHistory]);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  return {
    saveFocus,
    restoreFocus,
    trapFocus
  };
};
