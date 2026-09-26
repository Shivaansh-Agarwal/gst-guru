import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import ThemeSwitch from "@/components/ThemeSwitch";
import { loadContent, topicGroups } from "@/lib/content";

export const metadata: Metadata = {
  title: "GST Guru",
  description: "Learn Indian GST a few questions at a time.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#10171d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before first paint so a saved light or dark choice never flashes the other theme.
const themeBootScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Short labels for the return shortcuts in the rail, e.g. "GSTR-1: outward supplies" becomes "GSTR-1".
  const returns = (topicGroups(loadContent().topics).find((g) => g.label === "Returns")?.topics ?? []).map((t) => ({
    id: t.id,
    label: t.name.includes(":") ? t.name.split(":")[0] : "Other returns",
  }));
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
            <Nav returns={returns} />
            <div className="rail-foot">
              <ThemeSwitch />
              <p className="muted small">Your progress is saved on this machine.</p>
            </div>
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
