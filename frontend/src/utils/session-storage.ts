// For session storage
import {useEffect, useState} from "react";

export function useSessionStorage(key: string, initialValue: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === "undefined") return initialValue;
    return sessionStorage.getItem(key) === "true";
  });

  useEffect(() => {
    sessionStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue];
}