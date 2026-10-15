import { useEffect, useState } from "react";
import { BRAND_ICON, HEADER_ICONS, imgUrl } from "../lib/assets.js";
import ThemeSwitch from "./ThemeSwitch.jsx";

/** Una palabra del logotipo, letra a letra; --k escalona la ola. */
function LogoWord({ text, className, start }) {
  return (
    <span className={className}>
      {[...text].map((ch, i) => <i key={i} style={{ "--k": start + i }}>{ch}</i>)}
    </span>
  );
}

/** Icono de botón sacado de un objeto del juego; sin datos, cae al glifo de siempre. */
function GameIcon({ path, fallback, kind }) {
  if (!path) return <span aria-hidden="true">{fallback}</span>;
  return <img className="btn-icon" data-kind={kind} src={imgUrl(path)} alt="" />;
}

/** HEADER · estilo ventana de juego Dofus */
export default function Header({ onOverlay, onReset }) {
  const [scrolled, setScrolled] = useState(false);

  // Header: sólido en cuanto hay scroll. El progreso ya no va aquí: vive en la franja de
  // la ventana de los pasos
  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(sync); };
    window.addEventListener("scroll", onScroll, { passive: true });
    sync();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className={scrolled ? "is-scrolled" : undefined}>
      <div className="title-bar">
        <div className="title-bar-inner">
          <div className="brand">
            {BRAND_ICON && <img className="brand-icon" id="brandIcon" alt="" aria-hidden="true" src={imgUrl(BRAND_ICON)} />}
            <span className="sr-only">Dofus Silvestre</span>
            {/* Letras sueltas para la ola al pasar el ratón; el nombre ya se anuncia arriba */}
            <span className="logo" aria-hidden="true">
              <LogoWord text="Dofus" className="w1" start={0} />
              <LogoWord text="Silvestre" className="w2" start={5} />
            </span>
          </div>
          <div className="spacer"></div>
          <button className="icon-btn primary has-icon" id="overlayBtn" aria-label="Abrir overlay sobre el juego" onClick={onOverlay}>
            <GameIcon path={HEADER_ICONS?.overlay} fallback="⧉" kind="spyglass" />
            <span className="lbl">Overlay</span>
          </button>
          <ThemeSwitch />
          <button className="icon-btn danger has-icon" id="resetBtn" aria-label="Reiniciar progreso" onClick={onReset}>
            <GameIcon path={HEADER_ICONS?.reset} fallback="↺" kind="hourglass" />
            <span className="lbl">Reiniciar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
