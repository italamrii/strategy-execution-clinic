export function ThemeScript() {
  const source = `(function(){try{var m=document.cookie.match(/(?:^|; )clinic-theme=(light|dark)/);var t=m?m[1]:localStorage.getItem("clinic-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}else{document.documentElement.setAttribute("data-theme","light");}}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: source }}
    />
  );
}
