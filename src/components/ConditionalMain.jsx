// src/components/ConditionalMain.jsx
//
// ✅ NEW: pt-16 sirf un pages pe lagao jahan Navbar visible hai
//
// Problem pehle:
//   layout.jsx mein <main className="pt-16"> always tha
//   Dashboard pe bhi pt-16 tha — lekin wahan Navbar nahi hoti
//   Isliye Dashboard content 64px upar se push hota tha unnecessarily
//
// Solution:
//   Yeh client component pathname check karta hai
//   Agar Navbar visible hai (not /dashboard, not /employee/dashboard)
//   toh pt-16 lagao — warna nahi
//
// Routes jinpe Navbar NAHI hoti (pt-16 nahi lagega):
//   /dashboard/*          — apna sidebar + mobile tab bar hai
//   /employee/dashboard/* — apna full layout hai

"use client";
import { usePathname } from "next/navigation";

// ✅ Jin routes pe Navbar nahi hoti — wahan pt-16 nahi chahiye
const NO_NAVBAR_ROUTES = [
  "/dashboard",
  "/employee/dashboard",
];

export default function ConditionalMain({ children }) {
  const pathname = usePathname();

  // Check karo kya current route pe Navbar hide hai
  const isNavbarHidden = NO_NAVBAR_ROUTES.some(
    (route) => pathname?.startsWith(route)
  );

  return (
    <main className={isNavbarHidden ? "" : "pt-16"}>
      {children}
    </main>
  );
}