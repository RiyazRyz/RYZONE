(function(){
"use strict";
const KEY="ryzoneSelectedTheme";
const css=document.createElement("link");
css.rel="stylesheet";css.href="./ryzone-themes.css";css.id="ryzone-themes-css";
document.head.appendChild(css);
function current(){return localStorage.getItem(KEY)||"2";}
function setTheme(value){
 const theme=value==="1"?"1":"2";
 localStorage.setItem(KEY,theme);
 document.documentElement.dataset.ryzoneTheme=theme;
 document.documentElement.style.colorScheme="dark";
 updateBrand();
 window.dispatchEvent(new CustomEvent("ryzone-theme-changed",{detail:{theme}}));
}
function updateBrand(){
 const theme=current();
 document.documentElement.dataset.ryzoneTheme=theme;
 document.querySelectorAll(".ryzon-unified-name").forEach(el=>{
  if(theme==="2") el.innerHTML='R<span class="ryzone-y">Y<i>✓</i></span>Z';
  else el.textContent="RYZONE";
 });
 document.querySelectorAll(".brand-name,.ryzone-wordmark").forEach(el=>{
  if(theme==="2") el.innerHTML='R<span class="ryzone-y">Y<i>✓</i></span>Z';
  else el.textContent="RYZONE";
 });
}
function chooser(){
 if(document.getElementById("ryzoneThemeChooser"))return;
 const overlay=document.createElement("div");
 overlay.id="ryzoneThemeChooser";
 overlay.className="ryzone-theme-overlay";
 overlay.innerHTML='<section class="ryzone-theme-dialog" role="dialog" aria-modal="true" aria-labelledby="ryzoneThemeTitle"><div class="ryzone-theme-globe">🌍</div><div class="ryzone-theme-kicker">ONE APP • ENDLESS POSSIBILITIES</div><h2 id="ryzoneThemeTitle">Choose Your RYZONE Theme</h2><p class="ryzone-theme-help">Select a look. You can change it anytime.</p><button type="button" class="ryzone-theme-choice" data-theme="1"><strong>THEME 1</strong><span class="ryzone-theme-preview classic">🌍 RYZONE</span><small>Classic Gold Logo</small></button><button type="button" class="ryzone-theme-choice" data-theme="2"><strong>THEME 2</strong><span class="ryzone-theme-preview threeD">RYZ<span>✓</span></span><small>3D RYZ • Green Tick • Golden Globe</small></button><button type="button" class="ryzone-theme-confirm" id="ryzoneThemeConfirm" disabled>CONTINUE</button></section>';
 document.body.appendChild(overlay);
 let picked=current();
 overlay.querySelectorAll("[data-theme]").forEach(btn=>{
  btn.addEventListener("click",()=>{
   picked=btn.dataset.theme;
   overlay.querySelectorAll("[data-theme]").forEach(x=>x.classList.toggle("selected",x===btn));
   overlay.querySelector("#ryzoneThemeConfirm").disabled=false;
  });
 });
 overlay.querySelector("#ryzoneThemeConfirm").addEventListener("click",()=>{
  setTheme(picked);overlay.remove();
 });
}
function addSwitcher(){
 if(location.pathname.endsWith("/index.html")||location.pathname==="/"||document.getElementById("ryzoneThemeSwitch"))return;
 const btn=document.createElement("button");
 btn.id="ryzoneThemeSwitch";btn.type="button";btn.className="ryzone-theme-switch";
 btn.textContent="THEME";btn.setAttribute("aria-label","Change RYZONE theme");
 btn.addEventListener("click",chooser);document.body.appendChild(btn);
}
function start(){
 setTheme(current());
 updateBrand();
 const observer=new MutationObserver(updateBrand);
 observer.observe(document.body,{childList:true,subtree:true});
 addSwitcher();
 const isEntry=location.pathname.endsWith("/index.html")||location.pathname==="/";
 if(isEntry&&!localStorage.getItem(KEY))chooser();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();