// Run the signed executable itself: development Electron cannot catch dyld's
// signed-app library restrictions. Uses an isolated profile and local media.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const appPath = resolve(process.env.ANTENNA_TEST_APP || 'release/mac-arm64/Antenna.app');
const video = resolve(process.env.ANTENNA_SMOKE_VIDEO || '../work/sample.mp4');
const output = resolve(process.env.ANTENNA_SMOKE_OUTPUT || '../work');
const profile = mkdtempSync(join(tmpdir(), 'antenna-signed-smoke-'));
const server = createServer();
await new Promise(r => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
await new Promise(r => server.close(r));
const child = spawn(join(appPath, 'Contents/MacOS/Antenna'), [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1'], {stdio:'ignore'});
const delay = ms => new Promise(r=>setTimeout(r,ms));
let socket;
try {
  let target;
  for (let i=0;i<100;i++) {
    try { target=(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page'); } catch {}
    if(target) break;
    await delay(100);
  }
  assert.ok(target, 'signed app must launch');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let seq=0;
  const pending=new Map();
  socket.onmessage=({data})=>{const msg=JSON.parse(data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result);}};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const js=async expression=>{
    const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await delay(700);
  assert.equal(await js('window.electron.playbackBackend'),'embedded');
  const poster='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#354354"/></svg>').toString('base64');
  const cache={baseUrl:'https://example.invalid',username:'fixture',cachedAt:Date.now(),channels:[],groups:[],movies:[{id:1,streamId:1,name:'Horizonte',url:pathToFileURL(video).href,poster,backdrop:poster,rating:8,group:'Cinema'}],movieGroups:['Cinema'],series:[{id:1,seriesId:1,name:'Série de teste',poster,group:'Séries',episodes:[{name:'Primeiro encontro',season:1,episodeNum:1,url:pathToFileURL(video).href,poster:'https://127.0.0.1:1/unavailable.jpg'}]}],seriesGroups:['Séries']};
  await js(`localStorage.setItem('livebox_xtreamCreds',${JSON.stringify(JSON.stringify({baseUrl:cache.baseUrl,username:'fixture',password:'fixture'}))});localStorage.setItem('livebox_xtreamCache',${JSON.stringify(JSON.stringify(cache))});location.reload()`);
  await delay(1800);
  await js(`document.querySelector('.topnav-link:nth-child(4)').click()`);
  await delay(350);
  await js(`document.querySelector('.series-browse .poster-card').click()`);
  await delay(800);
  await js(`document.querySelector('.episode-row')?.scrollIntoView()`);
  await delay(700);
  assert.equal(await js(`document.querySelector('.episode-thumb')?.src`),poster,'failed episode image must use series fallback');
  assert.equal(await js(`document.querySelector('.episode-thumb').naturalWidth > 0`),true);
  await js(`document.querySelector('.topnav-link:nth-child(1)').click()`);
  await delay(300);
  await js(`window.__times=[];window.electron.mpv.onEvent(e=>{if(e.type==='time')window.__times.push(e.value)});document.querySelector('.billboard .btn-primary').click()`);
  for(let i=0;i<100 && !(await js('window.__times.some(t=>t>1)'));i++) await delay(100);
  assert.ok(await js('window.__times.some(t=>t>1)'), 'signed native playback must advance');
  await js(`window.electron.mpv.command('pause',true)`);
  await delay(500);
  assert.ok(await js(`!!document.querySelector('[aria-label="Avançar 10 segundos"]')`));
  const screenshot=await call('Page.captureScreenshot',{format:'png'});
  writeFileSync(join(output,'antenna-player-controls.png'),Buffer.from(screenshot.data,'base64'));
  await js(`document.querySelector('[aria-label="Avançar 10 segundos"]').click()`);
  await delay(800);
  assert.ok(await js('window.__times.at(-1)>=10'), 'skip control must seek');
  await js('window.electron.pip.set(true)');await delay(500);
  assert.equal(await js('document.body.classList.contains("pip-active")'),true);
  await js('window.electron.pip.set(false)');await delay(500);
  assert.equal(await js('document.body.classList.contains("pip-active")'),false);
  console.log('PASS: signed application loads embedded engine, decodes video, seeks, preserves PiP, and recovers failed episode artwork.');
} finally {
  socket?.close();
  child.kill('SIGTERM');
  await delay(700);
}
