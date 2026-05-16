// src/components/ThemeScript.jsx
export default function ThemeScript() {
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