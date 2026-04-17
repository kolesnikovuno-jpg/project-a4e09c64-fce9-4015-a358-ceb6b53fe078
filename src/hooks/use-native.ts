import { useEffect, useState } from "react";

/**
 * Detects if app is running inside Capacitor native shell (iOS/Android).
 */
export const useIsNative = () => {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    setIsNative(Boolean(w.Capacitor?.isNativePlatform?.()));
  }, []);

  return isNative;
};
