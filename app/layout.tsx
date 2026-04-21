import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "VoidDrop — Zero-Trace P2P File Sharing",
  description:
    "Drop files into the void. No accounts, no servers, no traces. Peer-to-peer file transfer via WebRTC — encrypted, instant, ephemeral.",
  keywords: ["file sharing", "p2p", "webrtc", "encrypted", "anonymous", "no account"],
  openGraph: {
    title: "VoidDrop",
    description: "Zero-trace peer-to-peer file sharing. No accounts. No storage.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{
        background: '#000000',
        color: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        minHeight: '100vh',
        overflowX: 'hidden',
      }}>
        {/* Dark radial gradient background */}
        <div style={{
          position: 'fixed',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(95,15,255,0.3) 0%, transparent 60%),
            radial-gradient(ellipse 50% 30% at 80% 80%, rgba(155,48,255,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 40% 25% at 10% 80%, rgba(0,229,255,0.06) 0%, transparent 40%),
            #000000
          `,
          zIndex: -2,
          pointerEvents: 'none',
        }} />
        {/* Grid overlay */}
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(155,48,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(155,48,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          zIndex: -1,
          pointerEvents: 'none',
        }} />
        {children}
      </body>
    </html>
  );
}
