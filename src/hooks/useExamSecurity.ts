import { useState, useEffect, useRef } from 'react';

interface UseExamSecurityProps {
  /** Indicates whether the exam is currently active. Security listeners will look at this. */
  isActive: boolean;
  /** Indicates whether the exam has already been submitted (either by user or by system). */
  hasSubmitted: boolean;
  /** Callback triggered when a 3rd violation or critical tab/window switch occurs. */
  onAutoSubmit: (isViolation?: boolean) => Promise<void> | void;
  /** Maximum tab/window switching violations allowed before auto-submission. Defaults to 3. */
  maxViolations?: number;
  /** Debounce grace period in milliseconds to prevent double firing. Defaults to 2000ms. */
  gracePeriodMs?: number;
}

interface UseExamSecurityReturn {
  /** The current count of tab/window focus losses. */
  tabLossCount: number;
  /** Whether the warning modal should be shown to the user. */
  showWarningModal: boolean;
  /** Call this function to close/dismiss the warning modal. */
  setShowWarningModal: (show: boolean) => void;
  /** Reset violation counters (useful if admin overrides or resets). */
  resetViolations: () => void;
}

/**
 * useExamSecurity
 * 
 * A highly secured React hook designed for proctored online exams in TypeScript.
 * It provides multi-layer protection against browser tab-switching, window blur events,
 * and accidental window closing or reloading.
 */
export function useExamSecurity({
  isActive,
  hasSubmitted,
  onAutoSubmit,
  maxViolations = 3,
  gracePeriodMs = 2000,
}: UseExamSecurityProps): UseExamSecurityReturn {
  const [tabLossCount, setTabLossCount] = useState<number>(0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const lastViolationTime = useRef<number>(0);

  // Maintain atomic, stable references to prevents stale state captures in event listeners
  const isActiveRef = useRef<boolean>(isActive);
  const hasSubmittedRef = useRef<boolean>(hasSubmitted);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const tabLossCountRef = useRef<number>(tabLossCount);
  const maxViolationsRef = useRef<number>(maxViolations);

  // Sync references with state Changes
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { hasSubmittedRef.current = hasSubmitted; }, [hasSubmitted]);
  useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);
  useEffect(() => { tabLossCountRef.current = tabLossCount; }, [tabLossCount]);
  useEffect(() => { maxViolationsRef.current = maxViolations; }, [maxViolations]);

  // 1. Tab Switching & Focus Loss Protection (visibilitychange + blur)
  useEffect(() => {
    // If the exam is not active or already submitted, do not register listeners
    if (!isActive || hasSubmitted) return;

    const handleViolation = () => {
      // Return fast if exam ended or was submitted
      if (!isActiveRef.current || hasSubmittedRef.current) return;

      const now = Date.now();
      // Debounce window blur/visibility change events to prevent double counting in certain engines
      if (now - lastViolationTime.current < gracePeriodMs) return;
      lastViolationTime.current = now;

      const currentCount = tabLossCountRef.current;
      const nextCount = currentCount + 1;

      console.warn(`[Assessment Security] Tab switch or focus loss detected. Violation count: ${nextCount}/${maxViolationsRef.current}`);

      if (nextCount >= maxViolationsRef.current) {
        // Exceeded maximum allowances - auto submit immediately
        setTabLossCount(nextCount);
        onAutoSubmitRef.current(true);
      } else {
        // Show warnings for 1st and 2nd violations
        setTabLossCount(nextCount);
        setShowWarningModal(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('[Assessment Security] Document visibility switched to hidden.');
        handleViolation();
      }
    };

    const handleWindowBlur = () => {
      console.log('[Assessment Security] Window focus blur event fired.');
      handleViolation();
    };

    // Register primary security event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Clean up cleanly on unmount or on status transition (e.g., submission completion)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isActive, hasSubmitted, gracePeriodMs]);

  // 2. Accidental Tab Close / Reload Protection (beforeunload)
  useEffect(() => {
    if (!isActive || hasSubmitted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isActiveRef.current || hasSubmittedRef.current) return;

      // Modern browser prompt requirement
      const confirmationMessage = 'An exam is currently in progress. Switching tabs or closing the window may trigger immediate submission or loss of score.';
      e.preventDefault();
      e.returnValue = confirmationMessage;

      // Note: While the check is blocking, some browsers won't wait for async requests during unload.
      // Therefore, the beforeunload prompt is the primary block to make them reconsider.
      return confirmationMessage;
    };

    const handleUnload = () => {
      // Trigger submission attempt for backup when unload actually occurs
      if (isActiveRef.current && !hasSubmittedRef.current) {
        onAutoSubmitRef.current(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [isActive, hasSubmitted]);

  const resetViolations = () => {
    setTabLossCount(0);
    setShowWarningModal(false);
  };

  return {
    tabLossCount,
    showWarningModal,
    setShowWarningModal,
    resetViolations,
  };
}
