"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, LayoutGrid, LogOut, Mail, User, X } from "lucide-react";
import { PiquifyLogoMark } from "@/components/logo";
import { SearchBox } from "@/components/search-box";
import { Avatar } from "@/components/avatar";
import { signOut } from "@/app/auth/actions";
import type { Viewer } from "@/domain/views";

export function AppSidebar({
  open,
  onClose,
  viewer,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  viewer: Viewer;
  pathname: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const media = window.matchMedia("(min-width: 768px)");
    function collapse() {
      if (media.matches) onClose();
    }

    document.addEventListener("keydown", onKey);
    media.addEventListener("change", collapse);
    return () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", collapse);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-[min(19rem,88vw)] flex-col bg-crema shadow-lift"
      >
        <div className="flex items-center gap-2 border-b border-abismo/10 px-4 py-3">
          <span
            id={titleId}
            className="flex min-w-0 flex-1 items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-abismo"
          >
            <PiquifyLogoMark />
            Piquify
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-tinta-suave hover:bg-espuma hover:text-abismo"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="border-b border-abismo/10 px-4 py-3">
          <SearchBox className="relative w-full" placeholder="Buscar" />
        </div>

        <nav aria-label="Menú" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <SidebarLink href="/" active={pathname === "/"}>
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Mis playgrounds
          </SidebarLink>
          <SidebarLink href="/invitations" active={pathname === "/invitations"}>
            <Mail className="h-4 w-4" aria-hidden />
            Invitaciones
          </SidebarLink>
          <SidebarLink href="/notifications" active={pathname === "/notifications"}>
            <span className="relative">
              <Bell className="h-4 w-4" aria-hidden />
              {viewer.notifications > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                  {viewer.notifications}
                </span>
              )}
            </span>
            Notificaciones
          </SidebarLink>
          <SidebarLink href="/profile" active={pathname.startsWith("/profile")}>
            <User className="h-4 w-4" aria-hidden />
            Perfil
          </SidebarLink>
        </nav>

        <div className="mt-auto border-t border-abismo/10 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar name={viewer.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-abismo">{viewer.name}</p>
              <p className="truncate text-xs text-tinta-suave">@{viewer.handle}</p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-tinta-suave hover:bg-espuma hover:text-abismo"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Salir
            </button>
          </form>
        </div>
      </div>
      <button
        type="button"
        className="min-h-0 min-w-0 flex-1 bg-abismo/45"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
    </div>,
    document.body,
  );
}

function SidebarLink({
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
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-espuma text-marea" : "text-tinta-suave hover:bg-white hover:text-abismo"
      }`}
    >
      {children}
    </Link>
  );
}
