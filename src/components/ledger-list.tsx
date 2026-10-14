import Link from "next/link";
import type { LedgerMovementView } from "@/domain/views";

export function LedgerList({ items }: { items: LedgerMovementView[] }) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-tinta-suave">Todavía no hay movimientos.</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {items.map((item) => {
        const positive = item.amount > 0;
        const content = (
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-abismo">{item.label}</span>
              {(item.question || item.playgroundName) && (
                <span className="mt-0.5 block truncate text-xs text-tinta-suave">
                  {item.question ?? item.playgroundName}
                </span>
              )}
              <span className="mt-0.5 block text-xs text-tinta-suave">{item.when}</span>
            </span>
            <span
              className={`shrink-0 font-display text-sm font-bold tabular-nums ${
                positive ? "text-palma" : "text-coral"
              }`}
            >
              {positive ? `+${item.amount}` : item.amount} pts
            </span>
          </span>
        );
        return (
          <li key={item.id} className="rounded-xl bg-crema/70 px-3 py-2">
            {item.href ? (
              <Link href={item.href} className="block rounded-lg hover:bg-espuma/80">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
