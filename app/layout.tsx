import type { Metadata } from "next";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build",
  description: "Manufacturing operations platform",
  icons: { icon: "/Build-Logo.ico" },
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('build-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistPixelSquare.variable} style={{ height: "100%" }} suppressHydrationWarning>
      <body style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
