/// <reference types="vite/client" />
interface LocalFileReport { path:string; name:string; size:number; modifiedAt:string; sha256:string; signatureStatus:string; signer:string; risk:'trusted'|'unknown'; reasons:string[] }
interface Window { desktop?: { platform:string; version:string; localSecurity:{ chooseExecutable:()=>Promise<LocalFileReport|null>; quarantine:(path:string)=>Promise<{ok:boolean;path:string;note:string}>; sandboxStatus:()=>Promise<{available:boolean;reason:string}>; openSandbox:(path:string)=>Promise<{ok:boolean;note:string}> } } }
