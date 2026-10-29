import { useSyncExternalStore } from "react";

/** Suscripción a una media query: el layout cambia de panel a hoja al cruzar el corte. */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    cb => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
  );
}
