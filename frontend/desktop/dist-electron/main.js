"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const allowedExtensions = new Set(['.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1']);
function ps(script, args = []) { return new Promise((resolve, reject) => (0, node_child_process_1.execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script, ...args], { windowsHide: true, timeout: 15000 }, (e, out, err) => e ? reject(new Error(String(err || e.message))) : resolve(String(out).trim()))); }
async function hashFile(filePath) { const hash = node_crypto_1.default.createHash('sha256'); const stream = node_fs_1.default.createReadStream(filePath); for await (const chunk of stream)
    hash.update(chunk); return hash.digest('hex'); }
async function inspectExecutable(filePath) {
    const stat = await promises_1.default.stat(filePath);
    const ext = node_path_1.default.extname(filePath).toLowerCase();
    if (!allowedExtensions.has(ext))
        throw new Error('Định dạng này không thuộc nhóm tệp thực thi được hỗ trợ.');
    let signature = { status: 'Unknown', signer: '' };
    try {
        const raw = await ps(`$s=Get-AuthenticodeSignature -LiteralPath $args[0]; [pscustomobject]@{status=$s.Status.ToString();signer=if($s.SignerCertificate){$s.SignerCertificate.Subject}else{''}}|ConvertTo-Json -Compress`, [filePath]);
        signature = JSON.parse(raw);
    }
    catch { /* signature unavailable */ }
    const suspicious = signature.status !== 'Valid';
    return { path: filePath, name: node_path_1.default.basename(filePath), size: stat.size, modifiedAt: stat.mtime.toISOString(), sha256: await hashFile(filePath), signatureStatus: signature.status, signer: signature.signer, risk: suspicious ? 'unknown' : 'trusted', reasons: suspicious ? ['Tệp không có chữ ký số hợp lệ', 'Chưa chạy tệp; cần kiểm tra trong môi trường cô lập'] : ['Chữ ký Authenticode hợp lệ', 'Danh tính nhà phát hành đã được Windows xác minh'] };
}
async function sandboxStatus() { if (process.platform !== 'win32')
    return { available: false, reason: 'Chỉ hỗ trợ Windows.' }; const exe = node_path_1.default.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsSandbox.exe'); try {
    await promises_1.default.access(exe);
    return { available: true, reason: 'Windows Sandbox đã sẵn sàng.' };
}
catch {
    return { available: false, reason: 'Windows Sandbox chưa được bật hoặc phiên bản Windows không hỗ trợ.' };
} }
function registerIpc() {
    electron_1.ipcMain.handle('local:choose', async () => { const r = await electron_1.dialog.showOpenDialog({ title: 'Chọn tệp thực thi để kiểm tra', properties: ['openFile'], filters: [{ name: 'Tệp thực thi', extensions: ['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'ps1'] }] }); return r.canceled ? null : inspectExecutable(r.filePaths[0]); });
    electron_1.ipcMain.handle('local:quarantine', async (_e, filePath) => { const source = node_path_1.default.resolve(filePath); await promises_1.default.access(source); const dir = node_path_1.default.join(electron_1.app.getPath('userData'), 'quarantine'); await promises_1.default.mkdir(dir, { recursive: true }); const target = node_path_1.default.join(dir, `${Date.now()}-${node_path_1.default.basename(source)}.quarantine`); await promises_1.default.copyFile(source, target); await promises_1.default.chmod(target, 0o400).catch(() => { }); return { ok: true, path: target, note: 'Đã sao chép vào kho cô lập. Bản gốc chưa bị xóa để tránh mất dữ liệu.' }; });
    electron_1.ipcMain.handle('local:sandbox-status', sandboxStatus);
    electron_1.ipcMain.handle('local:open-sandbox', async (_e, filePath) => { const status = await sandboxStatus(); if (!status.available)
        throw new Error(status.reason); const source = node_path_1.default.resolve(filePath); await promises_1.default.access(source); const dir = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'armor-sandbox-')); const sample = node_path_1.default.join(dir, node_path_1.default.basename(source)); await promises_1.default.copyFile(source, sample); const config = node_path_1.default.join(dir, 'AI-Security-Armor.wsb'); const escaped = dir.replace(/&/g, '&amp;'); await promises_1.default.writeFile(config, `<Configuration><Networking>Disable</Networking><ClipboardRedirection>Disable</ClipboardRedirection><PrinterRedirection>Disable</PrinterRedirection><MappedFolders><MappedFolder><HostFolder>${escaped}</HostFolder><SandboxFolder>C:\\ArmorSample</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder></MappedFolders><LogonCommand><Command>explorer.exe C:\\ArmorSample</Command></LogonCommand></Configuration>`); (0, node_child_process_1.spawn)(node_path_1.default.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsSandbox.exe'), [config], { detached: true, stdio: 'ignore', windowsHide: false }).unref(); return { ok: true, note: 'Đã mở Windows Sandbox: mạng, clipboard và máy in đều bị tắt. Tệp chưa tự động chạy.' }; });
}
function createWindow() { const win = new electron_1.BrowserWindow({ width: 1440, height: 900, minWidth: 1050, minHeight: 680, backgroundColor: '#070b12', title: 'AI Security Armor', webPreferences: { preload: node_path_1.default.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } }); win.removeMenu(); win.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('https://'))
    electron_1.shell.openExternal(url); return { action: 'deny' }; }); const devUrl = process.env.VITE_DEV_SERVER_URL; if (devUrl)
    win.loadURL(devUrl);
else
    win.loadFile(node_path_1.default.join(__dirname, '..', 'dist', 'index.html')); }
electron_1.app.whenReady().then(() => { registerIpc(); createWindow(); electron_1.app.on('activate', () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
    createWindow(); }); });
electron_1.app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    electron_1.app.quit(); });
