import type {PricingTier} from "@/lib/types";
import PricingPlans from "@/components/PricingPlans";

const tiers:PricingTier[]=[
 {id:"free",name:"FREE",priceMonthly:0,priceYearly:0,highlighted:false,ctaLabel:"Bắt đầu miễn phí",features:[{label:"50 lượt Risk Core/ngày",included:true},{label:"5 AI credit/ngày (Evaluate hoặc Explain)",included:true},{label:"1 phân tích chuyên sâu/ngày",included:true},{label:"3 câu hỏi tiếp nối mỗi cuộc chat",included:true}]},
 {id:"pro",name:"PRO",priceMonthly:99000,priceYearly:79000,highlighted:true,ctaLabel:"Dùng thử 7 ngày",features:[{label:"Risk Core không giới hạn",included:true},{label:"50 AI credit + 10 lượt chuyên sâu/ngày",included:true},{label:"AI Evaluate tự động khi có ngữ cảnh",included:true},{label:"20 câu hỏi tiếp nối mỗi cuộc chat",included:true}]},
 {id:"team",name:"TEAM / API",priceMonthly:null,priceYearly:null,highlighted:false,ctaLabel:"Liên hệ đội ngũ",features:[{label:"100 AI credit + 100 lượt chuyên sâu/ngày",included:true},{label:"API key và MCP endpoint",included:true},{label:"50 câu hỏi tiếp nối mỗi cuộc chat",included:true},{label:"Dashboard, SLA và hỗ trợ kỹ thuật",included:true}]}
];
const faq=[
 ["Có thể bắt đầu mà không cần thẻ không?","Có. Gói Free không yêu cầu thẻ thanh toán và đủ để trải nghiệm các luồng phân tích chính."],
 ["Dữ liệu có được dùng để huấn luyện không?","Không mặc định. Nội dung chỉ được xử lý để trả kết quả theo chính sách quyền riêng tư của Prewise."],
 ["Team/API phù hợp với ai?","Dành cho đội ngũ cần bảo vệ AI agent, automation hoặc tích hợp Prewise vào sản phẩm nội bộ."]
];

export default function AccountBillingPage(){return <div className="pricing-page pricing-page-compact account-pricing"><PricingPlans tiers={tiers}/><section className="pricing-faq"><span>FAQ / CLARITY</span><h2>Điều cần biết trước khi chọn.</h2>{faq.map(item=><details key={item[0]}><summary>{item[0]}<i>＋</i></summary><p>{item[1]}</p></details>)}</section></div>}
