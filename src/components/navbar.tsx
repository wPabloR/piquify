"use client";

import { useCallback, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Zap } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { PiquifyLogoMark } from "@/components/logo";
import { SearchBox } from "@/components/search-box";
import { signOut } from "@/app/auth/actions";
import { Avatar } from "@/components/avatar";
import type { Viewer } from "@/domain/views";

export function Navbar({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const sidebarId = useId();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-abismo/10 bg-crema/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-4 sm:h-16 sm:gap-6 sm:px-5">
        {viewer ? (
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold tracking-tight text-abismo md:hidden"
            aria-expanded={menuOpen}
            aria-controls={sidebarId}
            onClick={() => setMenuOpen(true)}
          >
            <Brand />
            <ChevronDown className="h-4 w-4 shrink-0 text-tinta-suave" aria-hidden />
            <span className="sr-only">Abrir menú</span>
          </button>
        ) : (
          <Link href="/" className="min-w-0 md:hidden">
            <Brand />
          </Link>
        )}

        <Link href="/" className="hidden min-w-0 md:block">
          <Brand />
        </Link>

        {viewer && (
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            <NavItem href="/" active={pathname === "/"}>
              Mis playgrounds
            </NavItem>
            <NavItem href="/invitations" active={pathname === "/invitations"}>
              Invitaciones
            </NavItem>
          </nav>
        )}

        {viewer && <SearchBox className="relative ml-auto hidden min-w-0 max-w-64 flex-1 md:block" />}

        {viewer ? (
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:ml-0">
            <div className="flex items-center gap-1.5 rounded-xl bg-abismo px-2.5 py-1.5 text-crema sm:px-3 sm:py-2">
              <Zap className="h-4 w-4 text-arena" aria-hidden />
              <span className="font-display text-sm font-bold tabular-nums">{viewer.points}</span>
              <span className="hidden text-xs text-espuma/70 sm:inline">pts</span>
            </div>
            <Link
              href="/notifications"
              className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-tinta-suave transition-colors hover:bg-espuma hover:text-marea md:flex"
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
              className="hidden items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-espuma md:flex"
            >
              <Avatar name={viewer.name} />
              <span className="hidden text-sm font-medium text-abismo lg:block">
                {viewer.name.split(" ")[0]}
              </span>
              <ChevronDown className="h-4 w-4 text-tinta-suave" aria-hidden />
            </Link>
            <form action={signOut} className="hidden md:block">
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

      {viewer && (
        <div id={sidebarId}>
          <AppSidebar
            open={menuOpen}
            onClose={closeMenu}
            viewer={viewer}
            pathname={pathname}
          />
        </div>
      )}
    </header>
  );
}

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <PiquifyLogoMark />
      <span className="truncate">Piquify</span>
    </span>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-espuma text-marea" : "text-tinta-suave hover:text-abismo"
      }`}
    >
      {children}
    </Link>
  );
}
