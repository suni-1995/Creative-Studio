
(function(){
  if(typeof window.collectBackupFileIds==='function'){
    const base=window.collectBackupFileIds;
    window.collectBackupFileIds=function(){const ids=new Set(base.apply(this,arguments));for(const s of(db.stories||[]))for(const id of(s.imageIds||[]))if(id)ids.add(id);return [...ids]};
  }
})();
