/**
 * Blocking inline script that applies a stored manual theme before first paint.
 * The preference lives in localStorage only, never in a cookie, so static routes stay static.
 */
const script = `(function(){try{var t=localStorage.getItem("ag-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
