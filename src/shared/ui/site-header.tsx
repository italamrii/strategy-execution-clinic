"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({
  signedIn = false,
  unreadNotifications = 0,
  canAdmin = false,
}: {
  signedIn?: boolean;
  unreadNotifications?: number;
  canAdmin?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const links = [
    ["/", t("home")],
    ["/about", t("about")],
    ["/tracks", t("tracks")],
    ["/membership", t("membership")],
    ["/how-it-works", t("howItWorks")],
    ["/consultations", t("consultations")],
    ["/knowledge", t("knowledge")],
    ["/policies", t("policies")],
  ] as const;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label={t("home")}>
          <strong>عيادة الاستراتيجية والتنفيذ</strong>
          <span>STRATEGY &amp; EXECUTION CLINIC</span>
        </Link>
        <nav className="site-header__nav" aria-label={t("primary")}>
          {links.map(([href, label]) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "is-active" : undefined}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="site-header__actions">
          <ThemeToggle />
          <LanguageSwitcher />
          {canAdmin ? (
            <Link className="header-login" href="/admin">
              {t("admin")}
            </Link>
          ) : null}
          {signedIn ? (
            <Link className="header-login" href="/account">
              {t("account")}
              {unreadNotifications > 0 ? <b className="numeric">{unreadNotifications}</b> : null}
            </Link>
          ) : (
            <Link className="header-login" href="/login">
              {t("login")}
            </Link>
          )}
          <Link className="header-join" href="/membership/apply">
            {t("join")}
          </Link>
        </div>
        <button
          className="menu-trigger"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
      </div>
      <div
        className={`mobile-drawer${open ? " is-open" : ""}`}
        id="mobile-navigation"
        aria-hidden={!open}
        ref={drawerRef}
      >
        <div className="mobile-drawer__top">
          <div className="wordmark">
            <strong>عيادة الاستراتيجية والتنفيذ</strong>
            <span>STRATEGY &amp; EXECUTION CLINIC</span>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label={t("closeMenu")}>
            ×
          </button>
        </div>
        <nav>
          {links.map(([href, label], index) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "is-active" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="numeric">0{index + 1}</span>
                {label}
                <i aria-hidden>↗</i>
              </Link>
            );
          })}
        </nav>
        <div className="mobile-drawer__actions">
          <ThemeToggle />
          <LanguageSwitcher />
          {canAdmin ? (
            <Link href="/admin" onClick={() => setOpen(false)}>
              {t("admin")}
            </Link>
          ) : null}
          <Link href={signedIn ? "/account" : "/login"} onClick={() => setOpen(false)}>
            {signedIn ? t("account") : t("login")}
          </Link>
          <Link
            className="institutional-button institutional-button--primary"
            href="/membership/apply"
            onClick={() => setOpen(false)}
          >
            {t("join")}
          </Link>
        </div>
      </div>
    </header>
  );
}
