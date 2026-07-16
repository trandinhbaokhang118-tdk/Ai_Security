"use client";

/**
 * Trang Tài khoản — Lịch sử scan (`/account/history`).
 *
 * Hiển thị danh sách Scan_Record của người dùng dưới dạng bảng gồm 4 cột:
 *   - Ngày   → `record.timestamp` (đã ở dạng "DD/MM HH:mm" do lớp mock định
 *     dạng sẵn qua `formatScanTimestamp`; UI chỉ hiển thị — Requirement 14.3).
 *   - Loại   → URL/Email (`record.type`).
 *   - Điểm   → điểm rủi ro 0..100 (`record.score`).
 *   - Kết quả→ <RiskBadge score={record.score} showScore /> theo thang màu
 *     chuẩn (Requirement 14.2).
 *
 * Dữ liệu được nạp khi mount qua `getApiClient().getScanHistory()` (Requirement
 * 14.1). Guard đăng nhập do `app/account/layout.tsx` đảm nhiệm nên trang này chỉ
 * tập trung hiển thị. Khi danh sách rỗng → hiển thị trạng thái trống thân thiện.
 *
 * Là Client Component vì dùng `useEffect`/`useState` để nạp dữ liệu bất đồng bộ.
 *
 * _Requirements: 14.1, 14.2, 14.3_
 */

import { useEffect, useState } from "react";

import { getApiClient } from "@/lib/api";
import RiskBadge from "@/components/RiskBadge";
import type { ScanRecord } from "@/lib/types";

export default function AccountHistoryPage(): JSX.Element {
    // Danh sách lịch sử scan; null = đang tải, [] = đã tải nhưng rỗng.
    const [records, setRecords] = useState<ScanRecord[] | null>(null);

    useEffect(() => {
        let active = true;

        void getApiClient()
            .getScanHistory()
            .then((history) => {
                if (active) {
                    setRecords(history);
                }
            })
            .catch(() => {
                // Lỗi nạp dữ liệu → coi như không có bản ghi để tránh sập trang.
                if (active) {
                    setRecords([]);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const isLoading = records === null;
    const isEmpty = records !== null && records.length === 0;

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    Lịch sử scan
                </h1>
                <p className="text-sm text-neutral-600">
                    Xem lại các lần quét URL và email của bạn.
                </p>
            </header>

            {isLoading ? (
                <p className="text-sm text-neutral-500">Đang tải…</p>
            ) : isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-16 text-center">
                    <div className="text-3xl">🗒️</div>
                    <p className="text-sm font-medium text-neutral-600">
                        Chưa có lịch sử scan
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                    <table className="w-full min-w-[32rem] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                <th scope="col" className="px-4 py-3">
                                    Ngày
                                </th>
                                <th scope="col" className="px-4 py-3">
                                    Loại
                                </th>
                                <th scope="col" className="px-4 py-3">
                                    Điểm
                                </th>
                                <th scope="col" className="px-4 py-3">
                                    Kết quả
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {records!.map((record) => (
                                <tr
                                    key={record.id}
                                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                                >
                                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-neutral-700">
                                        {record.timestamp}
                                    </td>
                                    <td className="px-4 py-3 text-neutral-700">
                                        {record.type}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-neutral-700">
                                        {record.score}/100
                                    </td>
                                    <td className="px-4 py-3">
                                        <RiskBadge
                                            score={record.score}
                                            showScore
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
