import { getRiskLevel } from "../shared/risk.js";
const $ = (id) => document.getElementById(id);
const sections = ["disabled", "loading", "unsupported", "result", "offline"];
let currentTab = null;
function show(id){sections.forEach((name)=>$(name).hidden=name!==id)}
function validPage(url){return /^https?:\/\//i.test(url||"")}
function setConnection(ok,text){const el=$("gateway-status");el.textContent=text;el.className=`connection ${ok===true?"online":ok===false?"offline":""}`}
function list(id,items,renderer){const ul=$(id);ul.replaceChildren();(items||[]).slice(0,5).forEach((item)=>ul.appendChild(renderer(item)));$(id+"-section")?.toggleAttribute("hidden",!ul.children.length)}
function render(entry,tab){
  if(!entry||entry.status==="loading")return show("loading");
  if(entry.error){setConnection(false,entry.error.type==="timeout"?"Gateway phản hồi quá chậm":"Gateway không khả dụng");$("error-title").textContent=entry.error.type==="timeout"?"Gateway phản hồi quá chậm":"Không thể kiểm tra trang";$("error-message").textContent=entry.error.message||"Kiểm tra cấu hình Gateway và thử lại.";return show("offline")}
  if(entry.url!==tab.url)return scan(true);
  setConnection(true,`Gateway hoạt động · ${entry.latencyMs||0} ms`);
  const level=getRiskLevel(entry.score);const card=$("risk-card");card.style.setProperty("--risk",level.color);$("score").textContent=entry.score;$("risk-label").textContent=level.label;$("risk-summary").textContent={safe:"Trang này có vẻ an toàn",warn:"Hãy thận trọng với trang này",danger:"Trang này có rủi ro cao"}[level.key];$("scan-time").textContent=`Đã kiểm tra ${new Date(entry.completedAt).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`;
  let parsed;try{parsed=new URL(tab.url)}catch{parsed={hostname:""}}$("hostname").textContent=parsed.hostname;$("url").textContent=tab.url;$("recommendation").textContent={safe:"Bạn có thể tiếp tục, nhưng vẫn không nên chia sẻ thông tin nhạy cảm khi chưa xác minh.",warn:"Không nhập mật khẩu hoặc thông tin thanh toán trước khi xác minh website.",danger:"Nên rời khỏi trang và không cung cấp thông tin cá nhân hay đăng nhập."}[level.key];
  list("reasons",entry.result?.reasons,(r)=>{const li=document.createElement("li");li.textContent=`• ${r}`;return li});
  list("evidence",entry.result?.evidence,(e)=>{const li=document.createElement("li");li.className="evidence-row";const sev=document.createElement("span");sev.className=`sev ${e.severity||"info"}`;sev.textContent=e.severity||"info";const msg=document.createElement("span");msg.textContent=e.message||"";li.append(sev,msg);return li});
  $("leave-page").hidden=level.key!=="danger";show("result")
}
async function scan(force=false){if(!currentTab||!validPage(currentTab.url))return show("unsupported");show("loading");const entry=await chrome.runtime.sendMessage({type:"ASSESS_URL",url:currentTab.url,tabId:currentTab.id,force});render(entry,currentTab)}
async function init(){try{const state=await chrome.runtime.sendMessage({type:"GET_PROTECTION_STATE"});$("protection-enabled").checked=state?.enabled===true;if(!state?.enabled)return show("disabled");[currentTab]=await chrome.tabs.query({active:true,currentWindow:true});if(!currentTab||!validPage(currentTab.url))return show("unsupported");const entry=await chrome.runtime.sendMessage({type:"GET_TAB_RESULT",tabId:currentTab.id,url:currentTab.url});entry?render(entry,currentTab):scan()}catch{$("error-message").textContent="Tiện ích gặp lỗi khi đọc trạng thái. Hãy tải lại extension.";show("offline")}}
$("protection-enabled").addEventListener("change",async(e)=>{await chrome.runtime.sendMessage({type:"SET_PROTECTION_STATE",enabled:e.target.checked});e.target.checked?init():show("disabled")});$("rescan").addEventListener("click",()=>scan(true));$("retry-error").addEventListener("click",()=>scan(true));$("copy-url").addEventListener("click",async()=>{if(currentTab?.url){await navigator.clipboard.writeText(currentTab.url);$("copy-url").textContent="✓";setTimeout(()=>$("copy-url").textContent="⧉",1200)}});$("leave-page").addEventListener("click",()=>currentTab?.id&&chrome.tabs.update(currentTab.id,{url:"chrome://newtab"}));$("open-settings").addEventListener("click",()=>chrome.runtime.openOptionsPage());init();
