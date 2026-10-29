// ---------------------------------------------------------------------------
// La vista que se va: mientras AnimatePresence la anima hacia fuera convive con la
// que llega, así que no debe repetir ids (#journal, #mapCard…) ni recibir clics.
// ---------------------------------------------------------------------------
import { createContext, useContext } from "react";

export const LeavingContext = createContext(false);

/** true dentro de la vista que se está yendo. */
export const useLeaving = () => useContext(LeavingContext);

/** El id solo en la vista que se queda. */
export const useLiveId = id => (useLeaving() ? undefined : id);

/** Lo mismo para varios ids en un componente: live("x") da "x" solo en la que se queda. */
export const useLiveIds = () => {
  const leaving = useLeaving();
  return id => (leaving ? undefined : id);
};
