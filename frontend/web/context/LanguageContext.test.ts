import { describe, expect, it } from "vitest";

import { ENGLISH_TRANSLATIONS, translateText } from "./LanguageContext";

const CRITICAL_UI_COPY = [
  "Cài đặt",
  "Ngôn ngữ giao diện",
  "English đã sẵn sàng. Phạm vi bản dịch được kiểm tra tự động trong mỗi bản build.",
  "Nhìn kỹ trước khi tin.",
  "Dán tín hiệu đáng ngờ. Prewise sẽ bóc tách điều đang ẩn phía sau.",
  "XEM DEMO TƯƠNG TÁC ↗",
  "Phân tích",
  "Lịch sử",
  "Lịch sử cục bộ",
  "Lịch sử tài khoản",
  "Quyền riêng tư",
  "Khi tắt, lần phân tích mới chỉ được giữ trong tab hiện tại và không xuất hiện trong lịch sử cục bộ.",
] as const;

describe("English translation coverage", () => {
  it.each(CRITICAL_UI_COPY)("translates critical UI copy: %s", (source) => {
    expect(ENGLISH_TRANSLATIONS[source]).toBeTruthy();
    expect(translateText(source)).not.toBe(source);
  });

  it("does not retain the unfinished-language notice", () => {
    expect(
      ENGLISH_TRANSLATIONS["Bản dịch tiếng Anh đầy đủ sẽ được áp dụng khi gói ngôn ngữ hoàn tất."],
    ).toBeUndefined();
  });
});
