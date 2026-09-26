import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import ThemeSwitch from "@/components/ThemeSwitch";

export const metadata: Metadata = {
  title: "GST Guru",
  description: "Learn Indian GST a few questions at a time.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = {
  themeColor: "#edf1ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before first paint so a saved dark choice never flashes the light theme.
const themeBootScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <div className="shell">
          <aside className="rail">
            <Link href="/" className="wordmark">
              GST<span>.</span>Guru
            </Link>
            <Nav />
            <p className="muted small rail-foot">Your progress is saved on this machine.</p>
          </aside>
          <div className="page">
            <header className="topbar">
              <Link href="/" className="wordmark topbar-mark">
                GST<span>.</span>Guru
              </Link>
              <ThemeSwitch />
            </header>
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
