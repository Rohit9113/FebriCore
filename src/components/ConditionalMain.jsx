// src/components/ConditionalMain.jsx
"use client";
import { usePathname } from "next/navigation";

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