import margincoinUrl from "@/assets/margincoin.svg";

/** Ícono oficial de la MARGINCOIN (SVG entregado por el equipo de marca). */
export function MargincoinIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <img src={margincoinUrl} alt="Margincoin" width={size} height={size} className={className} />;
}

export { margincoinUrl };
