"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export function PrewiseShell({children}:{children:ReactNode}){
 const path=usePathname(); const [open,setOpen]=useState(false);
 return <div className="app-ui"><header className="app-top"><Link href="/" className="brand"><Image src="/prewise-logo.png" width={34} height={34} alt=""/><b>PREWISE</b></Link><nav><Link className={path==="/analyze"?"active":""} href="/analyze">Phân tích</Link><Link className={path==="/history"?"active":""} href="/history">Lịch sử</Link><Link className={path==="/methodology"?"active":""} href="/methodology">Minh bạch</Link></nav><div className="app-tools"><span className="privacy-pill">● Riêng tư</span><Link href="/settings" aria-label="Cài đặt">⚙</Link><button onClick={()=>setOpen(!open)} aria-label="Menu">ND</button></div></header>{children}</div>
}

export function RiskDial({score}:{score:number}){const level=score>=85?"Nghiêm trọng":score>=70?"Cao":score>=40?"Trung bình":score>=15?"Thấp":"An toàn";return <div className="risk-dial" style={{"--score":`${score*3.6}deg`} as React.CSSProperties}><div><strong>{score}</strong><small>/100</small></div><span>{level}</span></div>}

export type Finding={title:string;detail:string;severity:"high"|"medium"|"low";evidence:string};
export const demoFindings:Finding[]=[
 {title:"Tên miền có dấu hiệu giả mạo",detail:"Tên miền sử dụng ký tự và cấu trúc gần giống một dịch vụ tài chính đáng tin cậy.",severity:"high",evidence:"secure-paypaI-support.com"},
 {title:"Tạo cảm giác khẩn cấp",detail:"Nội dung thúc ép người nhận hành động ngay để tránh khóa tài khoản.",severity:"medium",evidence:"xác minh trong vòng 30 phút"},
 {title:"Yêu cầu dữ liệu nhạy cảm",detail:"Biểu mẫu đích yêu cầu thông tin đăng nhập và mã xác thực.",severity:"high",evidence:"password • OTP • card details"}
];

export function useLocalHistory(){const [items,setItems]=useState<any[]>([]);useEffect(()=>{try{setItems(JSON.parse(localStorage.getItem("prewise-history")||"[]"))}catch{}},[]);return items}
