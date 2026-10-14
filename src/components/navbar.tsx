"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Shell, Zap } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { signOut } from "@/app/auth/actions";
import { Avatar } from "@/components/avatar";
import type { Viewer } from "@/domain/views";

export function Navbar({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-abismo/10 bg-crema/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-abismo"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-marea text-crema shadow-sm">
            <Shell className="h-5 w-5" aria-hidden />
          </span>
          Piquify
        </Link>

        {viewer && (
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            <Link
              href="/"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/" ? "bg-espuma text-marea" : "text-tinta-suave hover:text-abismo"
              }`}
            >
              Mis playgrounds
            </Link>
            <Link
              href="/invitations"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/invitations"
                  ? "bg-espuma text-marea"
                  : "text-tinta-suave hover:text-abismo"
              }`}
            >
              Invitaciones
            </Link>
          </nav>
        )}

        {viewer && <SearchBox />}

        {viewer ? (
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <div className="flex items-center gap-1.5 rounded-xl bg-abismo px-3 py-2 text-crema">
              <Zap className="h-4 w-4 text-arena" aria-hidden />
              <span className="font-display text-sm font-bold tabular-nums">
                {viewer.points}
              </span>
              <span className="hidden text-xs text-espuma/70 sm:inline">pts</span>
            </div>
            <Link
              href="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-tinta-suave transition-colors hover:bg-espuma hover:text-marea"
              aria-label={`${viewer.notifications} notificaciones sin leer`}
            >
              <Bell className="h-5 w-5" aria-hidden />
              {viewer.notifications > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                  {viewer.notifications}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              className="hidden items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-espuma sm:flex"
            >
              <Avatar name={viewer.name} />
              <span className="hidden text-sm font-medium text-abismo md:block">
                {viewer.name.split(" ")[0]}
              </span>
              <ChevronDown className="h-4 w-4 text-tinta-suave" aria-hidden />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl px-3 py-2 text-sm font-medium text-tinta-suave hover:text-abismo"
              >
                Salir
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="ml-auto rounded-xl bg-marea px-4 py-2 text-sm font-semibold text-crema"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
