// 作成者：boban
const defaults={enabled:true,mode:'sound',volume:0.6,notification:true,failures:true,successText:'ダウンロードが完了しました',failureText:'ダウンロードに失敗しました'};
const $=id=>document.getElementById(id);
function update(){ $('volumeValue').textContent=Math.round(Number($('volume').value)*100)+'%';$('speechFields').hidden=$('mode').value!=='speech'; }
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
async function save(){const s={};for(const [key,value] of Object.entries(defaults))s[key]=typeof value==='boolean'?$(key).checked:typeof value==='number'?Number($(key).value):$(key).value;await chrome.storage.local.set(s);}
chrome.storage.local.get(defaults).then(s=>{for(const [key,value] of Object.entries(defaults)){if(typeof value==='boolean')$(key).checked=s[key];else $(key).value=s[key];}update();}).catch(e=>status(e.message,true));
$('volume').addEventListener('input',update);$('mode').addEventListener('change',update);
$('settings').addEventListener('submit',async e=>{e.preventDefault();try{await save();status('設定を保存しました。');}catch(e){status(e.message,true);}});
async function test(failed){$('test').disabled=$('testFailure').disabled=true;try{await save();if($('mode').value==='silent'||Number($('volume').value)===0){status('音なし、または音量0に設定されています。');return;}status('再生しています…');const r=await chrome.runtime.sendMessage({target:'background',type:'test',failed});if(!r?.ok)throw new Error(r?.error||'再生できませんでした');status('設定を保存し、テスト音を再生しました。');}catch(e){status(e.message,true);}finally{$('test').disabled=$('testFailure').disabled=false;}}
$('test').addEventListener('click',()=>test(false));$('testFailure').addEventListener('click',()=>test(true));
