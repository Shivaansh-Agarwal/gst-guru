import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "GST Guru",
  description: "Learn Indian GST a few questions at a time.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#17263a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="rail">
            <Link href="/" className="wordmark">
              GST<span>.</span>Guru
            </Link>
            <Nav />
            <p className="muted small rail-foot" style={{ marginTop: "auto" }}>
              Runs on your machine. Your progress stays in data/gst.db.
            </p>
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
