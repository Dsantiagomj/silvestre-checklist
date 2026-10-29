import { useId } from "react";

/**
 * El símbolo de misión del juego: la «!» verde con contorno oscuro de la ventana de
 * Misiones. DofusDB no da imagen a las misiones, así que se dibuja aquí.
 */
export default function QuestMark({ className = "" }) {
  const id = useId();
  return (
    <svg className={"quest-mark " + className} viewBox="0 0 24 32" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6f57a" />
          <stop offset=".55" stopColor="#8fd13a" />
          <stop offset="1" stopColor="#4e8f1b" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke="#13200a" strokeWidth="2.2" strokeLinejoin="round" paintOrder="stroke">
        <path d="M7.4 3.2c0-1.1.9-1.9 2-1.9h5.2c1.1 0 2 .8 2 1.9l-1.6 16.2c-.1.9-.8 1.5-1.7 1.5h-2.6c-.9 0-1.6-.6-1.7-1.5z" />
        <circle cx="12" cy="26.6" r="3.6" />
      </g>
      {/* Brillo, como en el icono del juego */}
      <path d="M9.6 3.6h2.2l-.9 10.2h-.6z" fill="#fff" opacity=".55" />
    </svg>
  );
}
