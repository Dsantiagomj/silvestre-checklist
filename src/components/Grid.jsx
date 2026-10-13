import { useEffect, useState } from "react";
import { STEPS } from "../data/steps.js";
import { stepMatches, useAppState } from "../state/store.js";
import Cell from "./Cell.jsx";

/** GRID · tablero de 100 pasos */
export default function Grid() {
  const s = useAppState();
  // La animación de entrada corre una sola vez; luego estorba a los filtros.
  const [reveal, setReveal] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setReveal(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="grid" id="grid" role="grid">
      {STEPS.map((step, i) => (
        <Cell key={step.n} step={step} index={i} reveal={reveal} done={!!s.done[step.n]}
          selected={s.selectedStep === step.n} dimmed={!stepMatches(s, step)} />
      ))}
    </div>
  );
}
