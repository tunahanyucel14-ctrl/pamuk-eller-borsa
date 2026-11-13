"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Tarayıcıda oyun ilerlemesini korur. İlk yükleme tamamlanmadan varsayılan
 * değerler depoya yazılmaz; böylece kayıtlı oyun yanlışlıkla sıfırlanmaz.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        setValue(parsed);
      }
    } catch {
      // Depolama kapalıysa uygulama varsayılan değerlerle çalışmaya devam eder.
    } finally {
      setReady(true);
    }
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Kota veya tarayıcı izni sorunu oyun ekranını durdurmamalı.
    }
  }, [key, ready, value]);

  return [value, setValue, ready];
}
