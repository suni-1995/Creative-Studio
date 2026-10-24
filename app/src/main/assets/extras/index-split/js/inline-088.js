
(function(){
 function swapMusicHeaderOrder(){
   var wrap=document.querySelector('#music .uiux1v17RefreshWrap');
   var count=document.getElementById('musicCount');
   var refresh=wrap&&wrap.querySelector('.musicRefreshBtn');
   if(wrap&&count&&refresh&&wrap.firstElementChild!==count){wrap.insertBefore(count,refresh);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',swapMusicHeaderOrder,{once:true});
 else swapMusicHeaderOrder();
})();
