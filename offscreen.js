// 作成者：boban
const audio = new Audio();
let queue = Promise.resolve();
async function play(message) {
  audio.src = message.failed ? 'failure.wav' : 'success.wav';
  audio.volume = Math.max(0, Math.min(1, Number(message.volume) || 0));
  await new Promise((resolve,reject)=>{
    const timer = setTimeout(()=>{audio.pause(); cleanup(); reject(new Error('再生がタイムアウトしました'));},5000);
    function cleanup(){clearTimeout(timer);audio.onended=null;audio.onerror=null;}
    audio.onended=()=>{cleanup();resolve();};
    audio.onerror=()=>{cleanup();reject(new Error('音源を読み込めませんでした'));};
    audio.play().catch(error=>{cleanup();reject(error);});
  });
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id !== chrome.runtime.id || message.target !== 'audio') return;
  queue = queue.catch(()=>{}).then(()=>play(message));
  queue.then(()=>reply({ok:true}),error=>reply({ok:false,error:error.message}));
  return true;
});
