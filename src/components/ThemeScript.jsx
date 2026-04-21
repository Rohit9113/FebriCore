// src/components/ThemeScript.jsx
//
// ✅ IMPORTANT: Flash of Wrong Theme (FOWT) prevent karta hai
//
// Problem without this:
//   1. Page load hota hai → HTML dark theme se start karta hai
//   2. React hydrate hota hai → localStorage read karta hai → light switch
//   3. User sees FLASH — dark se light mein jump
//
// Solution:
//   Yeh script <head> mein run hota hai, React se pehle
//   localStorage read karta hai aur immediately data-theme set karta hai
//   No flash, seamless

export default function ThemeScript() {
  // Inline script — Next.js server se HTML mein inject hoga
  // dangerouslySetInnerHTML kyunki yeh raw JS hai, JSX nahi
  const script = `
    (function() {
      try {
        var saved = localStorage.getItem('fabricore_theme');
        var theme = saved === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      } catch(e) {
        // localStorage unavailable — dark default
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}