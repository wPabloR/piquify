import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { PlaygroundSummary } from "@/domain/views";

export function PlaygroundRow({ playground }: { playground: PlaygroundSummary }) {
  return (
    <Link
      href={`/playgrounds/${playground.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-abismo/10 bg-white px-4 py-3.5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-laguna hover:shadow-card"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-arena/60 text-xl" aria-hidden>
        {playground.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-display text-base font-bold text-abismo">{playground.name}</span>
          {playground.unread > 0 && (
            <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
              {playground.unread}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-tinta-suave">
          {playground.openPiques} piques abiertos · vas {playground.myRank}º de {playground.memberCount} · {playground.lastActivity}
        </span>
      </span>
      <span className="hidden -space-x-2 sm:flex">
        {playground.members.slice(0, 4).map((member) => (
          <Avatar key={member.id} name={member.name} size="sm" ring />
        ))}
      </span>
      <span className="hidden text-right md:block">
        <span className="block font-display text-sm font-bold tabular-nums text-abismo">
          {playground.pot.toLocaleString("es-ES")}
        </span>
        <span className="block text-[11px] text-tinta-suave">pts en juego</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-tinta-suave transition-transform group-hover:translate-x-0.5 group-hover:text-marea" aria-hidden />
    </Link>
  );
}
