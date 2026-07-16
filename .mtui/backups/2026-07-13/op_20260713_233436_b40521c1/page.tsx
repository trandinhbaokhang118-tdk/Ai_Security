"use client";
import {useState} from "react";
import {FileWarning, Globe2, RotateCcw, ShieldCheck} from "lucide-react";
import {PrewiseShell} from "@/components/PrewiseUI";
import {getApiClient} from "@/lib/api";
import type {BrowserSandboxResult, ExeSandboxResult} from "@/lib/types";

export default function SandboxPage(){
 const [url,setUrl]=useState("https://example.com"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [web,setWeb]=useState<BrowserSandboxResult|null>(null),[exe,setExe]=useState<ExeSandboxResult|null>(null);
 async function scanUrl(){setBusy(true);setError("");setWeb(null);try{setWeb(await getApiClient().browserSandboxUrl(url))}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function scanExe(file?:File){if(!file)return;setBusy(true);setError("");setExe(null);try{setExe(await getApiClient().sandboxExecutable(file))}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 function reset(){setWeb(null);setExe(null);setError("");setUrl("https://example.com")}
 const verdict=exe?.verdict==="dangerous"?"NGUY HIỂM":exe?.verdict==="suspicious"?"ĐÁNG NGỜ":exe?.verdict==="no_obvious_theft_detected"?"CHƯA THẤY HÀNH VI ĐÁNH CẮP":"CHƯA XÁC ĐỊNH";
 return <PrewiseShell><main id="main-content" className="sandbox-page"><header className="sandbox-toolbar"><div><span>ISOLATED LAB / LIVE</span><b>Kiểm thử thực tế trước khi tin cậy</b></div><div className="sandbox-status"><i/>Cô lập, dữ liệu mồi, mạng EXE bị khóa</div><button onClick={reset}><RotateCcw/>Đặt lại</button></header>
 <section className="live-sandbox-grid">
  <article className="live-sandbox-card"><Globe2/><h2>Mở website thật</h2><p>Chromium headless thật sẽ truy cập trang, chạy JavaScript, điền thông tin mồi và chặn việc gửi chúng ra ngoài.</p><form onSubmit={e=>{e.preventDefault();void scanUrl()}}><input value={url} onChange={e=>setUrl(e.target.value)} aria-label="URL cần kiểm thử"/><button disabled={busy}>Mở và kiểm thử</button></form>{web&&<div className="sandbox-report"><strong>{web.canary.exfiltration_blocked?"PHÁT HIỆN Ý ĐỊNH LẤY DỮ LIỆU":"ĐÃ CHẠY XONG"}</strong><p>{web.page_title||web.final_url} · HTTP {web.status_code??"?"} · {Math.round(web.elapsed_ms)} ms</p><ul>{web.issues.map(x=><li key={x.code}>[{x.severity}] {x.message} {x.detail}</li>)}</ul><small>{web.network_events.length} yêu cầu mạng; {web.canary.fields_filled} trường dữ liệu mồi; {web.canary.form_submissions_blocked} lần gửi form bị chặn.</small></div>}</article>
  <article className="live-sandbox-card"><FileWarning/><h2>Chạy file EXE thật</h2><p>Tệp chỉ được chạy trong Windows Sandbox dùng một lần. Không clipboard, không thư mục máy thật, không mạng; theo dõi tiến trình, tệp tạo mới, Defender và chữ ký số.</p><label className="exe-picker"><input type="file" accept=".exe,application/vnd.microsoft.portable-executable" disabled={busy} onChange={e=>void scanExe(e.target.files?.[0])}/>{busy?"Đang kiểm thử…":"Chọn EXE để chạy cô lập"}</label>{exe&&<div className="sandbox-report"><strong>{verdict} · {exe.risk_score}/100</strong><p>SHA-256: <code>{exe.sha256}</code></p><ul>{exe.issues.map((x,i)=><li key={i}>{x}</li>)}</ul><small>{exe.processes.length} tiến trình · {exe.files_created.length} tệp tạo mới · {exe.network_attempts.length} dấu hiệu kết nối · chữ ký: {exe.signature_status||"không rõ"}</small></div>}</article>
 </section>{error&&<div className="sandbox-global-error">{error}</div>}<aside className="sandbox-truth"><ShieldCheck/><div><b>Giới hạn trung thực</b><p>Kết quả “chưa thấy hành vi đánh cắp” không phải bảo đảm tuyệt đối: mã độc có thể trì hoãn hoặc nhận biết máy ảo. Tính năng này chỉ chạy EXE khi Windows Sandbox đã được bật trên máy chủ.</p></div></aside>
 </main></PrewiseShell>
}