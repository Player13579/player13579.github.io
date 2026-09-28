/** 永続台帳。addのユニーク制約がタブ間も含む線形化点。GPU/音はcommit完了前に実行しない。 */
export class IndexedDBCauseLedger {
  constructor(db) { this.db=db; }
  static open(name='dva-independent-facility-causes-v1') {
    if(!globalThis.indexedDB) return Promise.reject(new Error('IndexedDBが利用不可。再発火を避けるため停止します。'));
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(name,1);
      req.onupgradeneeded=()=>req.result.createObjectStore('causes',{keyPath:'key'});
      req.onerror=()=>reject(req.error);
      req.onblocked=()=>reject(new Error('台帳のversion変更がブロックされています。'));
      req.onsuccess=()=>{ const db=req.result; db.onversionchange=()=>db.close(); resolve(new IndexedDBCauseLedger(db)); };
    });
  }
  claim(key,fingerprint,meta={}) {
    return new Promise((resolve,reject)=>{
      let outcome;
      const tx=this.db.transaction('causes','readwrite');
      const store=tx.objectStore('causes');
      const read=store.get(key);
      read.onsuccess=()=>{
        const old=read.result;
        if(old) {outcome=old.fingerprint===fingerprint?'duplicate':'conflict';return;}
        // readwrite transactionの直列化と主キーaddで、get→set競合を排除する。
        const add=store.add({key,fingerprint,meta,claimed:true});
        add.onsuccess=()=>{outcome='claimed';};
      };
      tx.oncomplete=()=>resolve(outcome);
      tx.onerror=()=>reject(tx.error??new Error('台帳書込み失敗'));
      tx.onabort=()=>reject(tx.error??new Error('台帳中断'));
    });
  }
  close(){this.db.close();}
}
/** テスト・隔離プレビュー専用。同一インスタンス内の原子的claim。永続性を主張しない。 */
export class MemoryCauseLedger {
  constructor(){this.records=new Map();this.kind='memory_preview_only';}
  async claim(key,fingerprint,meta={}) {
    const old=this.records.get(key);
    if(old) return old.fingerprint===fingerprint?'duplicate':'conflict';
    this.records.set(key,{fingerprint,meta}); return 'claimed';
  }
}
