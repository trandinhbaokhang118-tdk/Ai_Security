"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readStoredAccessToken } from "@/lib/auth-session";

type Period = "monthly" | "yearly";
type Payment = {
  orderId: string; reference: string; amountVnd: number; planTier: string;
  billingPeriod: Period; expiresAt: string | null; bankAccount: string;
  bankName: string; accountName: string; transferContent: string; qrUrl: string; status: string;
};

const apiBase = () => (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const formatMoney = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount) + "đ";

function QrPreview() {
  return <main className="checkout-page"><section className="checkout-card">
    <header><span>THANH TOÁN / VIETQR</span><h1>Quét QR để thanh toán PRO.</h1><p>Mã QR đã sẵn sàng. Hệ thống đang khởi tạo đơn thanh toán bảo mật.</p></header>
    <div className="checkout-grid"><div className="sepay-qr"><div className="qr-frame"><strong>Đang tạo QR bảo mật…</strong></div><small>Vui lòng chờ mã đơn riêng được tạo</small></div><dl className="payment-details"><div><dt>Trạng thái</dt><dd className="payment-pending"><i />Đang tạo mã đơn</dd></div></dl></div>
  </section></main>;
}

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { session, setSession } = useAuth();
  const period: Period = params.get("period") === "yearly" ? "yearly" : "monthly";
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const creating = useRef(false);

  useEffect(() => {
    if (creating.current) return;
    creating.current = true;
    const token = session?.token ?? readStoredAccessToken();
    if (!token) { router.replace(`/auth?mode=login&next=${encodeURIComponent(`/account/checkout?period=${period}`)}`); return; }
    fetch(`${apiBase()}/v1/sandbox-cloud/subscription-payments`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ planTier: "pro", billingPeriod: period }),
    }).then(async response => {
      if (response.status === 401) {
        setSession(null);
        router.replace(`/auth?mode=login&next=${encodeURIComponent(`/account/checkout?period=${period}`)}`);
        throw new Error("");
      }
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? "Không tạo được đơn thanh toán.");
      return response.json() as Promise<Payment>;
    }).then(setPayment).catch(reason => { if (reason instanceof Error && reason.message) setError(reason.message); }).finally(() => setLoading(false));
  }, [period, router, session?.token, setSession]);

  const paymentOrderId = payment?.orderId;
  const paymentStatus = payment?.status;

  useEffect(() => {
    if (!paymentOrderId || paymentStatus !== "pending") return;
    const token = readStoredAccessToken();
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`${apiBase()}/v1/sandbox-cloud/subscription-payments/${paymentOrderId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) setPayment(await response.json() as Payment);
      } catch { /* Giữ màn QR để người dùng có thể tiếp tục thanh toán. */ }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [paymentOrderId, paymentStatus]);

  const copyContent = async () => { if (payment) await navigator.clipboard?.writeText(payment.transferContent); };
  if (loading) return <QrPreview />;
  if (error) return <main className="checkout-page"><section className="checkout-card checkout-error"><span>THANH TOÁN / SEPAY</span><h1>Không thể tạo mã thanh toán</h1><p>{error}</p><Link href="/auth">Đăng nhập</Link><Link href="/account/billing">Quay lại chọn gói</Link></section></main>;
  if (!payment) return null;
  if (payment.status === "paid") return <main className="checkout-page"><section className="checkout-card checkout-success"><span>THANH TOÁN THÀNH CÔNG</span><h1>Gói PRO đã được kích hoạt.</h1><p>Quyền truy cập của bạn đã được cập nhật. Bạn có thể bắt đầu dùng các tính năng Pro ngay bây giờ.</p><Link href="/account">Đi tới tài khoản →</Link></section></main>;
  if (payment.status === "expired") return <main className="checkout-page"><section className="checkout-card checkout-error"><span>ĐƠN ĐÃ HẾT HẠN</span><h1>Mã QR không còn hiệu lực.</h1><p>Vui lòng quay lại chọn gói để tạo một đơn thanh toán mới.</p><Link href={`/account/checkout?period=${period}`}>Tạo mã QR mới</Link></section></main>;

  return <main className="checkout-page"><section className="checkout-card">
    <header><span>THANH TOÁN AN TOÀN / SEPAY</span><h1>Quét QR để nâng cấp PRO.</h1><p>{period === "yearly" ? "Gói PRO theo năm" : "Gói PRO theo tháng"} · hệ thống tự kích hoạt sau khi SePay xác nhận giao dịch.</p></header>
    <div className="checkout-grid"><div className="sepay-qr"><div className="qr-frame">{payment.qrUrl ? <Image src={payment.qrUrl} unoptimized width={320} height={320} alt={`Mã QR SePay thanh toán ${formatMoney(payment.amountVnd)}`} priority /> : <strong>SePay QR chưa được cấu hình</strong>}</div><b>{formatMoney(payment.amountVnd)}</b><small>Quét bằng ứng dụng ngân hàng có hỗ trợ VietQR</small></div>
      <dl className="payment-details"><div><dt>Ngân hàng</dt><dd>{payment.bankName}</dd></div><div><dt>Số tài khoản</dt><dd>{payment.bankAccount}</dd></div><div><dt>Chủ tài khoản</dt><dd>{payment.accountName}</dd></div><div><dt>Nội dung chuyển khoản</dt><dd><code>{payment.transferContent}</code><button type="button" onClick={copyContent}>Sao chép</button></dd></div><div><dt>Trạng thái</dt><dd className="payment-pending"><i />Đang chờ SePay xác nhận</dd></div></dl>
    </div>
    <footer><p>Không thay đổi số tiền hoặc nội dung chuyển khoản. Mã đơn: <code>{payment.reference}</code></p><Link href="/account/billing">← Đổi gói</Link></footer>
  </section></main>;
}

export default function CheckoutPage() {
  return <Suspense fallback={<main className="checkout-page"><p>Đang chuẩn bị thanh toán…</p></main>}><CheckoutContent /></Suspense>;
}
