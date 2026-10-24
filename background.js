// 作成者：boban
const DEFAULTS = {enabled:true, mode:'sound', volume:0.6, notification:true, failures:true, successText:'ダウンロードが完了しました', failureText:'ダウンロードに失敗しました'};
let creating;
async function ensureAudio() {
  const contexts = await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT'], documentUrls:[chrome.runtime.getURL('offscreen.html')]});
  if (contexts.length) return;
  if (!creating) creating = chrome.offscreen.createDocument({url:'offscreen.html', reasons:['AUDIO_PLAYBACK'], justification:'ウィンドウを開かずにダウンロード通知音を再生するため'}).finally(()=>{creating=null;});
  await creating;
}
async function output(settings, failed) {
  const volume = Math.max(0, Math.min(1, Number(settings.volume) || 0));
  if (settings.mode === 'sound' && volume > 0) {
    await ensureAudio();
    const result = await chrome.runtime.sendMessage({target:'audio', failed, volume});
    if (!result?.ok) throw new Error(result?.error || '通知音を再生できませんでした');
  } else if (settings.mode === 'speech' && volume > 0) {
    const voices = await new Promise(resolve=>chrome.tts.getVoices(resolve));
    const voice = voices.find(v=>v.lang?.startsWith('ja') && !v.remote);
    if (!voice) throw new Error('端末内の日本語音声がありません。「通知音」を選んでください。');
    await new Promise((resolve,reject)=>chrome.tts.speak(String(failed?settings.failureText:settings.successText).slice(0,200), {lang:voice.lang, voiceName:voice.voiceName, volume, enqueue:false}, ()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve()));
  }
}
async function handleDownload(delta) {
  if (!['complete','interrupted'].includes(delta.state?.current)) return;
  const settings = await chrome.storage.local.get(DEFAULTS);
  const failed = delta.state.current === 'interrupted';
  if (!settings.enabled || (failed && !settings.failures)) return;
  const tasks = [output(settings,failed)];
  if (settings.notification) tasks.push((async()=>{
    const [item] = await chrome.downloads.search({id:delta.id});
    const filename = item?.filename?.split(/[\\/]/).pop() || 'ダウンロード';
    await chrome.notifications.create(`download-${delta.id}`, {type:'basic',iconUrl:'icons/128.png', title:failed?'ダウンロードに失敗しました':'ダウンロードが完了しました',message:filename});
  })());
  for (const result of await Promise.allSettled(tasks)) if(result.status==='rejected') console.error('通知エラー:',result.reason);
}
chrome.downloads.onChanged.addListener(delta=>{handleDownload(delta).catch(console.error);});
chrome.action.onClicked.addListener(()=>chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if (sender.id !== chrome.runtime.id || message.target !== 'background' || message.type !== 'test') return;
  chrome.storage.local.get(DEFAULTS).then(s=>output(s,Boolean(message.failed))).then(()=>reply({ok:true}),e=>reply({ok:false,error:e.message}));
  return true;
});
