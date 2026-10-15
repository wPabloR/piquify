import Link from "next/link";
import { Clock, Gavel, Vote } from "lucide-react";
import type { AttentionItem } from "@/domain/views";

const copy: Record<AttentionItem["kind"], { action: string; Icon: typeof Vote }> = {
  vote: { action: "Vota el resultado", Icon: Vote },
  propose: { action: "Propón el resultado", Icon: Gavel },
  closing: { action: "Entra o cambia antes del cierre", Icon: Clock },
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {items.map((item) => {
        const { action, Icon } = copy[item.kind];
        return (
          <li key={item.piqueId}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-2xl border border-abismo/10 bg-white px-4 py-3 shadow-card transition-colors hover:border-marea/40 hover:bg-crema/40"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-crema text-marea">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wider text-marea">
                  {action}
                </span>
                <span className="mt-0.5 block font-display text-base font-semibold leading-snug text-abismo">
                  {item.question}
                </span>
                <span className="mt-1 block text-xs text-tinta-suave">
                  {item.playgroundName} · {item.dueLabel}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
