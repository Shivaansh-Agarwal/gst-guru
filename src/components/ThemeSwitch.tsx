"use client";
import { useEffect, useState } from "react";

/** Light by default. Dark is remembered in localStorage and applied before paint by the layout. */
export default function ThemeSwitch() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      if (next) localStorage.setItem("theme", "dark");
      else localStorage.removeItem("theme");
    } catch {
      // Storage can be blocked; the choice still applies until reload.
    }
  }

  return (
    <button type="button" role="switch" aria-checked={dark} className="theme-toggle" onClick={toggle}>
      <span className="theme-track" aria-hidden>
        <span className="theme-thumb" />
      </span>
      <span>{dark ? "Dark" : "Light"}</span>
      <span className="visually-hidden"> theme. Switch to {dark ? "light" : "dark"}.</span>
    </button>
  );
}
