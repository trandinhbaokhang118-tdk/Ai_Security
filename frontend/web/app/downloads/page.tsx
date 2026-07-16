import type {Metadata} from "next";
import {Download, MonitorDown, Puzzle, ShieldCheck} from "lucide-react";
import {PrewiseShell} from "@/components/PrewiseUI";

export const metadata:Metadata={title:"Tải xuống · Prewise",description:"Tải ứng dụng Prewise và tiện ích mở rộng trình duyệt."};
const products=[
 {icon:<MonitorDown aria-hidden/>,name:"Prewise cho Windows",version:"Sắp ra mắt",detail:"Ứng dụng bảo vệ trên máy tính, kiểm tra liên kết và tệp trước khi mở.",action:"Thông báo khi phát hành"},
 {icon:<Puzzle aria-hidden/>,name:"Tiện ích trình duyệt",version:"Sắp ra mắt",detail:"Cảnh báo website đáng ngờ trực tiếp trên Chrome, Edge và các trình duyệt Chromium.",action:"Tham gia danh sách chờ"},
];
export default function DownloadsPage(){return <PrewiseShell><main id="main-content" className="inner-page downloads-page"><header className="inner-head"><span>PREWISE / DOWNLOADS</span><h1>Tải lớp bảo vệ<br/>đến thiết bị của bạn.</h1><p>Ứng dụng và extension hiện chưa có bản phát hành công khai. Trang này sẽ là nơi cung cấp bộ cài đã ký và liên kết cửa hàng chính thức.</p></header><section className="download-grid" aria-label="Sản phẩm có thể tải">{products.map(product=><article key={product.name}><div className="download-icon">{product.icon}</div><span>{product.version}</span><h2>{product.name}</h2><p>{product.detail}</p><button type="button" disabled>{product.action}</button></article>)}</section><aside className="download-safety"><ShieldCheck aria-hidden/><div><b>Chỉ tải từ nguồn chính thức</b><p>Prewise sẽ công bố checksum và chữ ký số cho từng bản phát hành. Không cài các tệp mang tên Prewise từ nguồn bên ngoài.</p></div></aside></main></PrewiseShell>}
