let socket=null,connected=false;const pending=new Map();
function platformFor(value){try{const u=new URL(value);const h=u.hostname;if(u.protocol!=="https:")return null;if(h==="lichess.org"||h.endsWith(".lichess.org"))return "lichess";if(h==="chess.com"||h.endsWith(".chess.com"))return "chesscom";}catch{}return null;}
function connect(){if(socket&&(socket.readyState===WebSocket.OPEN||socket.readyState===WebSocket.CONNECTING))return;try{socket=new WebSocket("ws://127.0.0.1:27301/extension");socket.addEventListener("open",()=>{connected=true;for(const p of pending.values())send(p);pending.clear();});socket.addEventListener("close",()=>{connected=false;socket=null;});socket.addEventListener("error",()=>{connected=false;});}catch{connected=false;}}
function send(p){if(!socket||socket.readyState!==WebSocket.OPEN){pending.set(p.tabId,p);connect();return;}socket.send(JSON.stringify({type:"platform-page",platform:p.platform,url:p.url}));}
function reportTab(tabId,url){const platform=platformFor(url);if(platform)send({tabId,platform,url});}
chrome.tabs.onUpdated.addListener((tabId,change,tab)=>{if(change.status==="complete"&&tab.url)reportTab(tabId,tab.url);});
chrome.tabs.onActivated.addListener(async({tabId})=>{try{const tab=await chrome.tabs.get(tabId);if(tab.url)reportTab(tabId,tab.url);}catch{}});
chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m?.type==="chessist:page"&&s.tab?.id!=null)reportTab(s.tab.id,m.url);if(m?.type==="chessist:status"){connect();reply({connected});}return true;});
async function reportExistingTabs(){try{const tabs=await chrome.tabs.query({});for(const tab of tabs)if(tab.id!=null&&tab.url)reportTab(tab.id,tab.url);}catch{}}
chrome.runtime.onStartup.addListener(()=>{connect();reportExistingTabs();});
chrome.runtime.onInstalled.addListener(()=>{connect();reportExistingTabs();});
