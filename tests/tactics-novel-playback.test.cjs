const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const failureStatus = "動画を読み込めませんでした。再生でもう一度試せます。";

function sourceSection(app) {
  const start=app.indexOf("function initializeTacticsPanel()");
  const stop=app.indexOf("function syncTacticsChapterFromScroll()",start);
  assert.ok(start>=0 && stop>start);
  return app.slice(start,stop);
}

async function scenario(app,mode) {
  const playButton=Object.assign(new EventTarget(),{setAttribute(){}});
  const replayButton=new EventTarget();
  const messages=[];
  const status={
    get textContent(){return messages.at(-1) || "";},
    set textContent(message){messages.push(message);}
  };
  const video=Object.assign(new EventTarget(),{paused:true,error:null,ended:false,currentTime:4,dataset:{},muted:false,volume:1});
  const tasks=[];
  const attempts=[];
  video.play=()=>{
    if(mode==="immediate-new-error" && attempts.length) return Promise.reject(new DOMException("Blocked new play","NotAllowedError"));
    if(video.paused) tasks.push(()=>video.dispatchEvent(new Event("play")));
    video.paused=false;
    return new Promise((resolve,reject)=>attempts.push({resolve,reject}));
  };
  video.pause=()=>{
    if(video.paused)return;
    video.paused=true;
    const interrupted=attempts.at(-1);
    tasks.push(()=>{video.dispatchEvent(new Event("pause"));interrupted.reject(new DOMException("Play interrupted by pause","AbortError"));});
  };
  const novel={id:"tactics-novel",setAttribute(){}}, basics={id:"tactics-basics",setAttribute(){}};
  const chapterButtons=[novel,basics].map(article=>Object.assign(new EventTarget(),{dataset:{tacticsTarget:article.id},classList:{toggle(){}},setAttribute(){}}));
  const context={
    els:{tacticsNovelVideo:video,tacticsNovelPlay:playButton,tacticsNovelReplay:replayButton,tacticsNovelVideoStatus:status,tacticsNovelStage:{hidden:false},
      tacticsChapterList:{querySelectorAll:()=>chapterButtons},tacticsContent:{querySelectorAll:()=>[novel,basics]},
      tacticsPanel:{classList:{toggle(){}}}},
    state:{screen:"tactics",tacticsChapterId:"tactics-basics"},
    window:{matchMedia:()=>new EventTarget(),addEventListener(){}},
    document:{hidden:false,getElementById:id=>[novel,basics].find(el=>el.id===id)},
    REDUCED_MOTION_QUERY:"(prefers-reduced-motion: reduce)",
    syncTacticsNovelScrollRegion:()=>false,keyboardContextKey:()=>"tactics",prefersReducedMotion:()=>false
  };
  vm.runInNewContext(sourceSection(app)+"\ninitializeTacticsPanel()",context);
  chapterButtons[0].dispatchEvent(new Event("click"));
  playButton.dispatchEvent(new Event("click"));
  if(mode==="pause" || mode==="restart")playButton.dispatchEvent(new Event("click"));
  if(mode==="leave")chapterButtons[1].dispatchEvent(new Event("click"));
  if(mode==="background") {
    context.document.hidden=true;
    vm.runInNewContext("syncTacticsNovelVideo()",context);
  }
  if(mode==="restart") playButton.dispatchEvent(new Event("click"));
  if(["native-pause","native-restart","late-pause-before-error","native-pause-media-error","native-pause-unsupported","native-pause-native-restart","immediate-new-error"].includes(mode)) video.pause();
  if(["native-restart","late-pause-before-error","native-pause-unsupported","immediate-new-error"].includes(mode)) playButton.dispatchEvent(new Event("click"));
  if(mode==="native-pause-native-restart") void video.play();
  if(mode==="native-pause-media-error")video.error={code:2};
  await new Promise(resolve=>setImmediate(resolve));
  while(tasks.length){ tasks.shift()(); await new Promise(resolve=>setImmediate(resolve)); }
  if(mode==="late-pause-before-error") attempts[1].reject(new DOMException("New playback interrupted by resource reload","AbortError"));
  if(mode==="native-pause-unsupported") attempts[1].reject(new DOMException("No source","NotSupportedError"));
  if(["native-restart","native-pause-native-restart"].includes(mode)) attempts[1].resolve();
  if(mode==="abort-error" || mode==="unsupported") {
    video.paused=true;
    attempts[0].reject(new DOMException("Current media failed",mode==="abort-error"?"AbortError":"NotSupportedError"));
  } else if(mode==="restart") {
    attempts[1].resolve();
  } else if(mode==="success") {
    attempts[0].resolve();
  }
  await new Promise(resolve=>setImmediate(resolve));
  if(mode==="pause") assert.equal(video.paused,true);
  if(mode==="leave" || mode==="background"){assert.equal(video.paused,true);assert.equal(video.currentTime,0);}
  if(mode==="restart") assert.equal(video.paused,false);
  return {status:status.textContent,errors:messages.filter(message=>message===failureStatus).length};
}

const cases = [
  ["pause", "custom pause cancels pending playback", false],
  ["leave", "chapter change cancels pending playback", false],
  ["background", "hiding the document cancels pending playback", false],
  ["restart", "cancelled custom playback cannot affect its replacement", false],
  ["success", "successful playback stays clear of errors", false],
  ["abort-error", "AbortError without a pause event is reported", true],
  ["unsupported", "unsupported media is reported", true],
  ["native-pause", "native pause cancels pending playback", false],
  ["native-restart", "late native pause does not affect a successful app replay", false],
  ["late-pause-before-error", "late native pause does not hide a newer AbortError", true],
  ["native-pause-media-error", "native pause does not hide an AbortError with a media error", true],
  ["native-pause-unsupported", "late native pause does not hide an unsupported-media error", true],
  ["native-pause-native-restart", "native pause followed by native replay avoids transient errors", false],
  ["immediate-new-error", "a late play or pause event does not erase a newer failure", true]
];

for (const [mode, name, reportsFailure] of cases) {
  test(name, async () => {
    const result = await scenario(app, mode);
    assert.deepEqual(result, {
      status: reportsFailure ? failureStatus : "",
      errors: reportsFailure ? 1 : 0
    });
  });
}
