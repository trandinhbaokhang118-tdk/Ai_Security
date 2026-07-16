import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';

const allowedExtensions = new Set(['.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1']);
function ps(script: string, args: string[] = []): Promise<string> { return new Promise((resolve, reject) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script, ...args], { windowsHide: true, timeout: 15000 }, (e, out, err) => e ? reject(new Error(String(err || e.message))) : resolve(String(out).trim()))); }
async function hashFile(filePath: string) { const hash = crypto.createHash('sha256'); const stream = fsSync.createReadStream(filePath); for await (const chunk of stream) hash.update(chunk as Buffer); return hash.digest('hex'); }
async function inspectExecutable(filePath: string) {
  const stat = await fs.stat(filePath); const ext = path.extname(filePath).toLowerCase(); if (!allowedExtensions.has(ext)) throw new Error('Định dạng này không thuộc nhóm tệp thực thi được hỗ trợ.');
  let signature = { status: 'Unknown', signer: '' };
  try { const raw = await ps(`$s=Get-AuthenticodeSignature -LiteralPath $args[0]; [pscustomobject]@{status=$s.Status.ToString();signer=if($s.SignerCertificate){$s.SignerCertificate.Subject}else{''}}|ConvertTo-Json -Compress`, [filePath]); signature = JSON.parse(raw); } catch { /* signature unavailable */ }
  const suspicious = signature.status !== 'Valid';
  return { path: filePath, name: path.basename(filePath), size: stat.size, modifiedAt: stat.mtime.toISOString(), sha256: await hashFile(filePath), signatureStatus: signature.status, signer: signature.signer, risk: suspicious ? 'unknown' : 'trusted', reasons: suspicious ? ['Tệp không có chữ ký số hợp lệ', 'Chưa chạy tệp; cần kiểm tra trong môi trường cô lập'] : ['Chữ ký Authenticode hợp lệ', 'Danh tính nhà phát hành đã được Windows xác minh'] };
}
async function sandboxStatus() { if (process.platform !== 'win32') return { available:false, reason:'Chỉ hỗ trợ Windows.' }; const exe=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsSandbox.exe'); try { await fs.access(exe); return {available:true,reason:'Windows Sandbox đã sẵn sàng.'}; } catch { return {available:false,reason:'Windows Sandbox chưa được bật hoặc phiên bản Windows không hỗ trợ.'}; } }
function registerIpc() {
  ipcMain.handle('local:choose', async () => { const r=await dialog.showOpenDialog({title:'Chọn tệp thực thi để kiểm tra',properties:['openFile'],filters:[{name:'Tệp thực thi',extensions:['exe','msi','bat','cmd','com','scr','ps1']}]}); return r.canceled?null:inspectExecutable(r.filePaths[0]); });
  ipcMain.handle('local:quarantine', async (_e, filePath:string) => { const source=path.resolve(filePath); await fs.access(source); const dir=path.join(app.getPath('userData'),'quarantine');await fs.mkdir(dir,{recursive:true});const target=path.join(dir,`${Date.now()}-${path.basename(source)}.quarantine`);await fs.copyFile(source,target);await fs.chmod(target,0o400).catch(()=>{});return {ok:true,path:target,note:'Đã sao chép vào kho cô lập. Bản gốc chưa bị xóa để tránh mất dữ liệu.'}; });
  ipcMain.handle('local:sandbox-status', sandboxStatus);
  ipcMain.handle('local:open-sandbox', async (_e,filePath:string) => { const status=await sandboxStatus();if(!status.available)throw new Error(status.reason);const source=path.resolve(filePath);await fs.access(source);const dir=await fs.mkdtemp(path.join(os.tmpdir(),'armor-sandbox-'));const sample=path.join(dir,path.basename(source));await fs.copyFile(source,sample);const config=path.join(dir,'AI-Security-Armor.wsb');const escaped=dir.replace(/&/g,'&amp;');await fs.writeFile(config,`<Configuration><Networking>Disable</Networking><ClipboardRedirection>Disable</ClipboardRedirection><PrinterRedirection>Disable</PrinterRedirection><MappedFolders><MappedFolder><HostFolder>${escaped}</HostFolder><SandboxFolder>C:\\ArmorSample</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder></MappedFolders><LogonCommand><Command>explorer.exe C:\\ArmorSample</Command></LogonCommand></Configuration>`);spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsSandbox.exe'),[config],{detached:true,stdio:'ignore',windowsHide:false}).unref();return {ok:true,note:'Đã mở Windows Sandbox: mạng, clipboard và máy in đều bị tắt. Tệp chưa tự động chạy.'}; });
}
function createWindow() { const win=new BrowserWindow({width:1440,height:900,minWidth:1050,minHeight:680,backgroundColor:'#070b12',title:'AI Security Armor',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});win.removeMenu();win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://'))shell.openExternal(url);return{action:'deny'}});const devUrl=process.env.VITE_DEV_SERVER_URL;if(devUrl)win.loadURL(devUrl);else win.loadFile(path.join(__dirname,'..','dist','index.html')); }
app.whenReady().then(()=>{registerIpc();createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
