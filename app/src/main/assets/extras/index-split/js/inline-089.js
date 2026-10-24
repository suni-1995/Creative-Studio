
(function(){
  const previousBack=window.handleNativeBack;
  window.handleNativeBack=function(){
    const br=document.getElementById('studioBreakroom');
    if(br&&!br.classList.contains('hidden')){
      const back=br.querySelector('[data-br-back]');
      if(back){back.click();return 'handled';}
      return 'handled';
    }
    return typeof previousBack==='function'?previousBack():'exit';
  };
})();
