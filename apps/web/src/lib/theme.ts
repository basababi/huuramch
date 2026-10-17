export const THEME_STORAGE_KEY = 'khuuramch:theme';

export type ThemeChoice = 'auto' | 'dark' | 'light';
export type Theme = 'dark' | 'light';

export function isTvPath(pathname: string): boolean {
  return pathname === '/tv' || pathname.startsWith('/tv/');
}

/** Daytime is 07:00–18:59 local time. */
export function isDaytime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 7 && hour < 19;
}

/**
 * Resolution rules (DECISIONS.md D-004):
 * - an explicit choice always wins;
 * - phones default to dark: games happen at night in dim rooms;
 * - the TV view is light by day unless the system asks for dark, and dark at night.
 */
export function resolveTheme(
  choice: ThemeChoice,
  ctx: { pathname: string; now: Date; prefersDark: boolean },
): Theme {
  if (choice !== 'auto') return choice;
  if (isTvPath(ctx.pathname)) return isDaytime(ctx.now) && !ctx.prefersDark ? 'light' : 'dark';
  return 'dark';
}

export function parseThemeChoice(value: string | null | undefined): ThemeChoice {
  return value === 'dark' || value === 'light' ? value : 'auto';
}

/**
 * Inline <head> script: applies the theme before first paint so there is no flash.
 * It mirrors `resolveTheme` in ES5 because it runs before any bundle loads.
 * `?theme=dark|light` overrides everything without being remembered (tests, screenshots, QA).
 */
export const themeBootScript = `(function(){
var d=document.documentElement,c=null,q=null;
try{q=new URLSearchParams(location.search).get('theme')}catch(e){}
if(q==='dark'||q==='light'){d.setAttribute('data-theme',q);d.setAttribute('data-theme-choice',q);return}
try{c=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}
if(c!=='dark'&&c!=='light')c='auto';
var t=c;
if(c==='auto'){
var p=location.pathname;
if(p==='/tv'||p.indexOf('/tv/')===0){
var h=new Date().getHours(),sd=false;
try{sd=window.matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}
t=(h>=7&&h<19&&!sd)?'light':'dark'
}else{t='dark'}
}
d.setAttribute('data-theme',t);d.setAttribute('data-theme-choice',c);
})();`;
