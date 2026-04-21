// src/app/layout.jsx
// ✅ NEW: ThemeProvider added for dark/light toggle

import "./globals.css";
import { AuthProvider }  from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext"; // ✅ NEW
import ThemeScript       from "@/components/ThemeScript"; // ✅ NEW — flash prevent

export const metadata = {
  title:       "FabriCore",
  description: "Smart business management system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* ✅ NEW: ThemeScript — page load pe theme flash prevent karta hai */}
        <ThemeScript />

        <link rel="icon" href="/weldicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0d0f18" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ThemeProvider wraps everything — useTheme() kahi bhi kaam karega */}
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}