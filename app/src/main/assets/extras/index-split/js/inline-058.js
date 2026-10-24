
(function(){
  try{
    const oldDecorate=decorateBulkSelectable;
    decorateBulkSelectable=function(root=document){
      const r=oldDecorate(root);
      root.querySelectorAll?.('#serialsList .item[data-bulk-kind="serials"]').forEach(el=>el.classList.add('bulkSelectable'));
      return r;
    };
    setTimeout(()=>document.querySelectorAll('#serialsList .item[data-bulk-kind="serials"]').forEach(el=>el.classList.add('bulkSelectable')),0);
  }catch(_){ }
})();
