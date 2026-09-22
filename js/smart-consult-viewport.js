// Page-local viewport adaptation. No keyboard assumptions, timers or body locks elsewhere.
export function viewportBox(viewport, fallbackHeight) {
  const height = Number.isFinite(viewport?.height) && viewport.height > 0 ? viewport.height : fallbackHeight;
  const top = Number.isFinite(viewport?.offsetTop) ? Math.max(0, viewport.offsetTop) : 0;
  return {height, top};
}
export function nearBottom(log) {
  return log.scrollHeight - log.clientHeight - log.scrollTop <= 48;
}
export function installViewport(win, doc) {
  const root=doc.documentElement, log=doc.querySelector('#chatLog');
  if (!root.classList.contains('consult-page') || !log) return;
  let frame=0, anchored=nearBottom(log);
  const remember=()=>{anchored=nearBottom(log);};
  const update=()=>{
    frame=0;
    // Pinch zoom remains accessible; do not resize the app to a magnified viewport.
    const viewport=win.visualViewport;
    if (viewport && viewport.scale !== 1) return;
    const box=viewportBox(viewport,win.innerHeight);
    const previous=log.scrollTop;
    root.style.setProperty('--app-height',`${box.height}px`);
    root.style.setProperty('--app-top',`${box.top}px`);
    log.scrollTop=anchored ? log.scrollHeight : previous;
  };
  const schedule=()=>{if (!frame) frame=win.requestAnimationFrame(update);};
  log.addEventListener('scroll',remember,{passive:true});
  win.visualViewport?.addEventListener('resize',schedule,{passive:true});
  win.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  win.addEventListener('resize',schedule,{passive:true});
  win.addEventListener('orientationchange',schedule,{passive:true});
  win.addEventListener('pageshow',schedule,{passive:true});
  update();
}
if (typeof window !== 'undefined') installViewport(window,document);
