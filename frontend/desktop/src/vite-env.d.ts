/// <reference types="vite/client" />
interface LocalFileReport { path:string; name:string; size:number; modifiedAt:string; sha256:string; signatureStatus:string; signer:string; risk:'trusted'|'unknown'; reasons:string[] }
interface DownloadGuardSettings { autoQuarantineDownloads:boolean }
interface QuarantineResult { ok:true; path:string; originalPath:string; note:string; report?:LocalFileReport }
interface Window { desktop?: { platform:string; version:string; openExternal:(url:string)=>Promise<{ok:boolean}>; localSecurity:{ chooseExecutable:()=>Promise<LocalFileReport|null>; quarantine:(path:string)=>Promise<QuarantineResult>; getDownloadGuardSettings:()=>Promise<DownloadGuardSettings>; setDownloadGuard:(enabled:boolean)=>Promise<DownloadGuardSettings>; onAutoQuarantined:(listener:(result:QuarantineResult)=>void)=>()=>void; sandboxStatus:()=>Promise<{available:boolean;reason:string}>; openSandbox:(path:string)=>Promise<{ok:boolean;note:string}> } } }
