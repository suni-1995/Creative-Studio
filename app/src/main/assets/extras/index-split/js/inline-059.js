
(()=>{
  let resumeTimer=0;
  function refreshProjectList(){
    if(currentProjectId)return;
    clearTimeout(resumeTimer);
    resumeTimer=setTimeout(()=>{try{window.renderProjects?.()}catch(e){console.error('project list resume render failed',e)}},80);
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshProjectList()});
  window.addEventListener('pageshow',refreshProjectList);
})();
