# Thiết kế phát hiện lừa đảo cho Email và SMS

**Trạng thái:** Bản thiết kế trước khi triển khai  
**Ngày nghiên cứu:** 18/07/2026  
**Phạm vi:** Web app Prewise, bộ chấm điểm, AI Pro, kết nối Gmail và điều tra số gửi SMS

## 1. Kết luận ngắn

| Quyết định | Nội dung |
|---|---|
| Không dùng chung một bộ chấm cho Email và SMS | Hai kênh có dữ liệu kỹ thuật và kiểu lừa đảo khác nhau, phải có hai bộ tiêu chí riêng. |
| Mọi link đều dùng chung bộ điều tra website | Link trong chữ, nút bấm, mã QR và tệp đính kèm đều phải được bóc ra, mở trong môi trường cô lập và truy vết đến trang cuối. |
| Chấm theo nhiều bằng chứng kết hợp | Không kết luận chỉ vì một từ như “gấp”, chỉ vì domain mới, hoặc chỉ vì email không qua một kiểm tra kỹ thuật. |
| Có “ngưỡng tối thiểu bắt buộc” | Nếu nguồn uy tín xác nhận link độc hại, tệp có mã độc, hoặc có tổ hợp giả mạo + lấy OTP/tiền thì điểm không được phép thấp. |
| AI Pro không được tự quyết một mình | AI dùng để hiểu ý đồ, chuỗi hội thoại và giải thích; kết luận phải gắn với bằng chứng kỹ thuật, link, số gửi hoặc nội dung cụ thể. |
| Điểm rủi ro khác độ chắc chắn | `Rủi ro` nói mức nguy hiểm; `Độ chắc chắn` nói hệ thống đã kiểm tra được bao nhiêu và các nguồn có đồng thuận không. |

Mục tiêu không nên được quảng cáo là “phát hiện 100%”. Cách có thể chứng minh tốt hơn ứng dụng tương tự là công bố bộ kiểm thử, tỷ lệ bỏ sót, tỷ lệ báo nhầm và kết quả theo từng nhóm lừa đảo.

### Những điểm đã đối chiếu với ứng dụng tương tự

| Sản phẩm tham khảo | Khả năng công khai đáng học | Cơ hội khác biệt của Prewise |
|---|---|---|
| Bitdefender Scamio | Nhận Email, tin nhắn, ảnh, link và QR; hỏi thêm ngữ cảnh rồi đưa khuyến nghị | Đi xa hơn bằng tiêu đề kỹ thuật Gmail, đường đi thư và bằng chứng từ sandbox website |
| Norton Genie | Nhận nội dung/ảnh chụp, giải thích vì sao có thể là lừa đảo và cho hỏi tiếp | Không bắt người dùng copy Email; hiển thị rõ điểm đóng góp và nguồn nào chưa kiểm tra được |
| Trend Micro ScamCheck | Kiểm tra text, Email, URL, ảnh và số điện thoại trong cùng sản phẩm | Ghép uy tín số gửi với kịch bản SMS và trang cuối thay vì đưa các kết quả rời nhau |
| Google Messages | AI trên thiết bị nhận diện cuộc trò chuyện ban đầu vô hại nhưng dần chuyển thành lừa đảo | Đưa nhận diện nhiều lượt lên web app, hỗ trợ cả SMS dán vào và ảnh chụp, có báo cáo link chi tiết |
| Mục tiêu Prewise | Gmail + header kỹ thuật; số gửi SMS; link/QR/tệp; website sandbox; AI ngữ cảnh; giải thích có bằng chứng | Đây là hướng thiết kế; chỉ được tuyên bố tốt hơn sau khi đạt bộ kiểm thử tại mục 12 |

## 2. Vấn đề của hệ thống hiện tại

| Hiện trạng trong mã nguồn | Hệ quả |
|---|---|
| Email và SMS gần như cùng đi qua một mô hình phân loại văn bản | Không tận dụng được tiêu đề kỹ thuật Email và dữ liệu của số gửi SMS. |
| Email mới chủ yếu nhận `sender` và `subject` | Chưa so sánh đầy đủ From, Reply-To, Return-Path, SPF, DKIM, DMARC, đường đi thư và tệp đính kèm. |
| SMS chỉ được cộng nhẹ khi có link hoặc yêu cầu dữ liệu nhạy cảm | Dễ bỏ sót giả danh giao hàng, phạt nguội, tuyển dụng, đầu tư, “nhầm số”, kéo sang Telegram/Zalo và lừa đảo nhiều lượt. |
| Mô hình nhẹ hiện tại trộn dữ liệu Email và SMS | Điểm F1 cao trên tập thử chưa chứng minh hiệu quả trên tin nhắn mới, tiếng Việt không dấu hoặc chiến dịch mới. |
| Transformer đa ngôn ngữ đang bị tắt vì chất lượng chưa đạt | AI ngữ nghĩa chưa thực sự tham gia nhánh chấm Email/SMS hiện tại. |

## 3. Cách chấm điểm chung

### 3.1 Thang điểm đề xuất

| Điểm | Nhãn cho người dùng | Hành động mặc định |
|---:|---|---|
| 0–14 | Chưa thấy rủi ro rõ | Vẫn kiểm tra kênh chính thức nếu giao dịch quan trọng. |
| 15–39 | Cần lưu ý | Không vội làm theo; xem các dấu hiệu được nêu. |
| 40–59 | Đáng ngờ | Xác minh bằng app, website hoặc số điện thoại chính thức. |
| 60–79 | Rủi ro cao | Không bấm link, không trả lời, không chuyển tiền/cung cấp dữ liệu. |
| 80–100 | Rất nguy hiểm | Chặn tương tác, báo cáo lừa đảo và xử lý tài khoản nếu đã làm theo. |

Điểm là độ mạnh của bằng chứng, **không phải phần trăm chắc chắn đây là lừa đảo**.

### 3.2 Công thức

```text
Điểm nền = tổng điểm của 5 nhóm, tối đa 100
Điểm kết hợp = tối đa +15 khi nhiều dấu hiệu tạo thành một kịch bản lừa đảo
Điểm giảm = tối đa -10 từ dấu hiệu tốt; không được xóa bằng chứng độc hại đã xác nhận
Điểm cuối = giá trị lớn nhất giữa:
  - Điểm nền + Điểm kết hợp - Điểm giảm
  - Ngưỡng tối thiểu bắt buộc của dấu hiệu nghiêm trọng
```

Quy tắc chống báo nhầm:

- Email qua SPF/DKIM/DMARC không đồng nghĩa nội dung an toàn; tài khoản thật vẫn có thể bị chiếm.
- Email chuyển tiếp có thể làm SPF sai; phải xem DKIM và dấu vết chuyển tiếp trước khi cộng điểm nặng.
- HTTPS chỉ cho biết kết nối được mã hóa, không chứng minh website đáng tin.
- Số VoIP, trả trước, số nước ngoài hoặc domain mới chỉ là dấu hiệu phụ; không tự tạo kết luận cao.
- Một từ khóa đơn lẻ không được đủ để chấm mức “rủi ro cao”.

## 4. Bộ tiêu chí Email

### 4.1 Năm nhóm chấm điểm

| Nhóm | Điểm tối đa | Những gì phải kiểm tra | Ví dụ bằng chứng hiển thị cho người dùng |
|---|---:|---|---|
| 1. Danh tính người gửi | 25 | Tên hiển thị có khớp địa chỉ thật; From, Reply-To và Return-Path có khác nhau; domain có giả thương hiệu; SPF/DKIM/DMARC; đường đi máy chủ; domain/IP gửi có lịch sử xấu | “Tên hiển thị là Vietcombank nhưng thư được gửi từ domain khác”; “Nút trả lời chuyển sang một địa chỉ không liên quan” |
| 2. Link, nút bấm và mã QR | 30 | Chữ hiển thị có khác link thật; shortlink; chuyển hướng; domain giả chữ; link trong ảnh/QR/PDF; kết quả Web Risk/PhishTank/URLhaus; trang cuối có ô mật khẩu, OTP, thẻ hay tải tệp | “Nút ‘Xem hóa đơn’ đi tới domain mới tạo”; “Trang cuối yêu cầu mật khẩu Microsoft” |
| 3. Ý đồ và nội dung | 20 | Đòi OTP/mật khẩu/thẻ; đổi tài khoản nhận tiền; hóa đơn giả; giả sếp/đối tác/ngân hàng; đe dọa, thúc ép, giữ bí mật; quà thưởng/hoàn tiền; tuyển dụng, đầu tư, tống tiền | “Yêu cầu đổi số tài khoản và chuyển gấp”; “Tự nhận là lãnh đạo và yêu cầu giữ bí mật” |
| 4. Tệp và cách che giấu | 15 | Loại tệp thật có khớp đuôi; đuôi kép; tệp chạy được, script, macro, HTML/SVG/LNK/ISO; file nén có mật khẩu; chữ nằm trong ảnh để né lọc; QR; biểu mẫu HTML; mã độc trong sandbox | “Tệp nhìn như PDF nhưng loại thật là chương trình”; “Nội dung chính nằm trong ảnh và chứa QR” |
| 5. Ngữ cảnh và lịch sử | 10 | Người gửi có từng liên hệ; thư có thực sự thuộc chuỗi cũ; cách viết và chữ ký có đổi; hóa đơn/số tài khoản có khác; người nhận có phù hợp; Gmail đã xếp Spam/Phishing hay chưa | “Lần đầu người gửi này yêu cầu thanh toán”; “Số tài khoản khác các hóa đơn trước” |

### 4.2 Các tiêu chí kỹ thuật bắt buộc

| Mã | Kiểm tra | Mức ảnh hưởng |
|---|---|---|
| E-ID-01 | Tên hiển thị giả người/tổ chức nhưng domain thật không liên quan | Cao khi đi kèm yêu cầu hành động |
| E-ID-02 | Reply-To khác From và dẫn sang domain không liên quan | Trung bình đến cao |
| E-ID-03 | DMARC sai hoặc không khớp domain From | Cao nếu đang giả domain; không chấm một mình |
| E-ID-04 | SPF sai nhưng DKIM/DMARC và chuyển tiếp hợp lệ | Chỉ ghi nhận, không phạt nặng |
| E-ID-05 | Message-ID, Return-Path hoặc máy chủ gửi không phù hợp với người gửi tự nhận | Trung bình |
| E-ID-06 | Domain gần giống thương hiệu bằng chữ thay thế, dấu gạch, subdomain hoặc ký tự quốc tế | Cao |
| E-WEB-01 | Link hiển thị và link thật khác nhau | Trung bình đến cao |
| E-WEB-02 | Link/trang cuối được nguồn uy tín xác nhận lừa đảo hoặc phát tán mã độc | Rất cao, áp ngưỡng bắt buộc |
| E-WEB-03 | Trang cuối giả thương hiệu và thu mật khẩu/OTP/thẻ | Rất cao |
| E-FILE-01 | Loại tệp thật khác đuôi, đuôi kép hoặc có khả năng chạy mã | Cao đến rất cao |
| E-FILE-02 | QR hoặc link được giấu trong ảnh/tệp | Tự nó là trung bình; chấm theo trang đích |
| E-BEC-01 | Thay đổi tài khoản nhận tiền, thông tin thanh toán hoặc quy trình duyệt | Cao |
| E-BEC-02 | Giả sếp/đối tác + gấp + bí mật + chuyển tiền/mua thẻ quà | Rất cao |
| E-AI-01 | AI nhận diện kịch bản lừa đảo nhưng không có bằng chứng khác | Tối đa mức đáng ngờ, không tự chặn |

### 4.3 Ngưỡng tối thiểu bắt buộc cho Email

| Tình huống | Điểm cuối tối thiểu |
|---|---:|
| Link hoặc tệp được nguồn uy tín xác nhận độc hại | 90 |
| Website cuối giả thương hiệu và lấy mật khẩu/OTP/thẻ | 90 |
| Tệp được sandbox xác nhận chạy mã độc | 95 |
| DMARC sai + giả thương hiệu rõ + yêu cầu đăng nhập/chuyển tiền | 85 |
| Giả lãnh đạo/đối tác + đổi tài khoản nhận tiền + thúc ép/bí mật | 85 |
| QR dẫn tới trang mới, giả thương hiệu và có biểu mẫu đăng nhập | 85 |

## 5. Bộ tiêu chí SMS

### 5.1 Năm nhóm chấm điểm

| Nhóm | Điểm tối đa | Những gì phải kiểm tra | Ví dụ bằng chứng hiển thị cho người dùng |
|---|---:|---|---|
| 1. Số gửi và danh tính | 20 | Số có hợp lệ; quốc gia, nhà mạng, loại thuê bao; số ảo/VoIP; báo cáo spam/lạm dụng gần đây; tên thương hiệu tự nhận có khớp dữ liệu công khai; đầu số lạ; sender chữ không có số | “Số gửi là số ảo và đã có dấu hiệu lạm dụng gần đây”; “Tự nhận là ngân hàng nhưng số không thuộc kênh công khai” |
| 2. Link và website | 30 | Shortlink; domain giả thương hiệu; ký tự che giấu; chuyển hướng; Web Risk/PhishTank/URLhaus; trang cuối lấy OTP/thẻ/mật khẩu; tải APK/app điều khiển từ xa | “Link chuyển qua 3 trang và kết thúc tại trang giả giao hàng” |
| 3. Ý đồ và hành động yêu cầu | 25 | Phạt nguội/thu phí; bưu kiện; khóa tài khoản; hoàn tiền; việc làm; đầu tư/tiền số; vay; trúng thưởng; người thân gặp nạn; yêu cầu gọi lại, trả lời, chuyển sang Zalo/Telegram/WhatsApp; cung cấp OTP hay cài app | “Yêu cầu nộp phí nhỏ để nhận bưu kiện”; “Yêu cầu cài ứng dụng ngoài cửa hàng” |
| 4. Chuỗi hội thoại | 15 | Tin mở đầu vô hại rồi tăng dần lòng tin; “nhầm số”; tình cảm/đầu tư; chuyển nền tảng; thay đổi mục tiêu sang tiền hoặc dữ liệu; mâu thuẫn giữa các lượt | “Cuộc trò chuyện chuyển từ làm quen sang đầu tư tiền số” |
| 5. Chiến dịch và phản hồi cộng đồng | 10 | Nội dung/số/link trùng chiến dịch đã báo cáo; nhiều người báo trong thời gian ngắn; mẫu thay số nhưng giữ nguyên link/kịch bản; phản hồi “không phải lừa đảo” | “Nội dung này trùng 37 báo cáo giao hàng giả trong 24 giờ” |

### 5.2 Các tiêu chí bắt buộc

| Mã | Kiểm tra | Mức ảnh hưởng |
|---|---|---|
| S-ID-01 | Số gửi không hợp lệ, giả dạng hoặc quốc gia không phù hợp ngữ cảnh | Thấp đến trung bình; cần dấu hiệu khác |
| S-ID-02 | Số có báo cáo lạm dụng gần đây từ nguồn tin cậy | Cao |
| S-ID-03 | Số ảo/VoIP hoặc trả trước | Chỉ là dấu hiệu phụ, không tự kết luận |
| S-WEB-01 | Link rút gọn, che giấu hoặc domain giả thương hiệu | Cao |
| S-WEB-02 | Trang cuối lấy OTP/thẻ/mật khẩu hoặc ép tải APK/app điều khiển | Rất cao |
| S-CONT-01 | Bất ngờ yêu cầu khoản phí nhỏ, nợ/phạt hoặc xác nhận giao hàng qua link | Cao khi có link/thanh toán |
| S-CONT-02 | Yêu cầu gửi OTP, mã khôi phục, thông tin thẻ hoặc đăng nhập | Rất cao |
| S-CONT-03 | Yêu cầu chuyển tiền bằng tiền số, thẻ quà, tài khoản cá nhân hoặc “tài khoản an toàn” | Rất cao |
| S-CONT-04 | Tuyển việc dễ, làm nhiệm vụ nhận hoa hồng rồi nạp tiền trước | Rất cao |
| S-CONV-01 | “Nhầm số”/làm quen rồi kéo sang đầu tư, tình cảm hoặc chuyển tiền | Cao; AI Pro cần xem nhiều lượt |
| S-CONV-02 | Chuyển sang Telegram/Zalo/WhatsApp để tiếp tục giao dịch đáng ngờ | Trung bình; tăng mạnh khi đi cùng đầu tư/việc làm |
| S-AI-01 | AI nhận diện kịch bản nhưng thiếu dữ liệu số/link | Tối đa mức đáng ngờ, yêu cầu người dùng bổ sung ngữ cảnh |

### 5.3 Ngưỡng tối thiểu bắt buộc cho SMS

| Tình huống | Điểm cuối tối thiểu |
|---|---:|
| Link được xác nhận lừa đảo/mã độc | 90 |
| Trang cuối lấy OTP/thẻ/mật khẩu hoặc tải APK/app điều khiển | 90 |
| Giả ngân hàng/cơ quan/đơn vị giao hàng + link + yêu cầu tiền/dữ liệu | 80 |
| Yêu cầu gửi OTP, mã khôi phục hoặc chuyển tiền số/thẻ quà | 85 |
| Việc làm “làm nhiệm vụ” nhưng phải nạp tiền để rút tiền | 85 |
| Chuỗi “nhầm số”/tình cảm rồi chuyển sang đầu tư hoặc vay tiền | 80 |

## 6. Bộ điều tra website dùng chung cho Email và SMS

| Lớp | Phải làm | Điểm mạnh so với chỉ dùng danh sách đen |
|---|---|---|
| 1. Bóc link | Đọc URL trong chữ, HTML, nút bấm, ảnh, QR, PDF và tệp văn phòng | Bắt được link bị giấu hoặc người dùng không nhìn thấy |
| 2. Phân tích địa chỉ | Tách domain thật; phát hiện giả chữ, punycode, subdomain đánh lừa, IP thay domain, ký tự `@`, mã hóa, URL lồng và tham số chuyển hướng | Bắt website mới chưa kịp vào danh sách đen |
| 3. Đối chiếu nguồn nguy hiểm | Google Web Risk cho thương mại; PhishTank cho phishing; URLhaus cho phát tán mã độc; Spamhaus cho domain/IP xấu | Có bằng chứng từ nhiều nguồn độc lập |
| 4. Hạ tầng | RDAP để xem ngày tạo/domain; DNS, MX, nameserver, IP/ASN, chứng chỉ; so khớp thương hiệu | Phân biệt website chính thức và hạ tầng dùng nhanh/bỏ nhanh |
| 5. Truy vết cô lập | Mở bằng browser sandbox; theo redirect; chặn mạng nội bộ, tải tệp và gửi biểu mẫu; ghi trang cuối, script, request mạng | Bắt shortlink, CAPTCHA, chuyển hướng theo thiết bị và trang né máy quét |
| 6. Nhìn nội dung trang | OCR chữ trong ảnh; nhận logo/giao diện giả; tìm ô mật khẩu, OTP, thẻ, ví; form gửi sang domain khác; QR; nút tải app | Bắt website có URL bình thường nhưng hành vi nguy hiểm |
| 7. Kết hợp kịch bản | Ghép “thương hiệu bị giả + dữ liệu bị hỏi + hành động bị thúc ép + danh tiếng” | Giảm báo nhầm từ một dấu hiệu đơn lẻ |

Lưu ý: kết quả “không có trong danh sách đen” phải hiển thị là **“chưa có dữ liệu xấu”**, không phải “an toàn”.

## 7. Vai trò của AI trong gói Pro

| Khả năng Pro | Thiết kế an toàn |
|---|---|
| Hiểu ý đồ sâu | Tách người/tổ chức bị giả, lời hứa, mối đe dọa, dữ liệu/tiền bị yêu cầu và bước hành động tiếp theo. |
| Phân tích nhiều lượt | Đọc cả chuỗi SMS hoặc chuỗi Email để phát hiện lừa đảo nuôi lòng tin, BEC và thay đổi tài khoản thanh toán. |
| Đối chiếu ngữ cảnh | So với lịch sử người gửi, hóa đơn cũ, chữ ký, cách viết và kênh chính thức nếu người dùng cho phép. |
| Đọc ảnh và QR | OCR ảnh chụp, nội dung nằm trong ảnh, QR và tài liệu; mọi URL tìm được vẫn phải qua bộ điều tra website. |
| Giải thích dễ hiểu | Trả lời “Ai đang bị giả?”, “Họ muốn gì?”, “Bằng chứng nào mạnh nhất?”, “Tôi nên làm gì ngay?”. |
| Điều tra website sâu | Tóm tắt redirect, trang cuối, biểu mẫu, dấu vết trình duyệt và hạ tầng thành báo cáo dễ đọc. |

Giới hạn bắt buộc:

- Nội dung Email/SMS là dữ liệu không tin cậy; AI không được làm theo chỉ dẫn ẩn trong nội dung.
- AI không tự mở link ngoài sandbox, không gửi thư/tin, không điền dữ liệu thật và không gọi số điện thoại.
- AI chỉ được cộng/giảm tối đa 10 điểm nếu không có bằng chứng độc lập.
- Nếu AI lỗi hoặc không khả dụng, bộ luật + mô hình cục bộ + nguồn đối chứng vẫn phải cho kết quả đầy đủ.
- Không dùng Email/SMS người dùng để huấn luyện nếu chưa có lựa chọn đồng ý riêng.

## 8. API và dịch vụ nên tích hợp

| Ưu tiên | Dịch vụ | Dùng cho | Quyết định |
|---:|---|---|---|
| 1 | Gmail API | Cho người dùng chọn Email từ Gmail; lấy body, tiêu đề kỹ thuật, link và tệp của đúng thư đã chọn | **Bắt buộc cho luồng Gmail.** Dùng quyền `gmail.readonly`; quyền chỉ đọc metadata không đủ để phân tích body. |
| 1 | Google Cloud Web Risk | Kiểm tra URL phishing, social engineering và malware trong sản phẩm thương mại | **Nguồn chính cho link.** Safe Browsing miễn phí không dành cho sản phẩm thương mại. |
| 1 | RDAP + DNS resolver | Tuổi domain, nhà đăng ký, DNS/MX, IP và hạ tầng | **Bắt buộc, chi phí thấp.** RDAP là chuẩn thay WHOIS. |
| 1 | PhishTank | Đối chiếu URL phishing đã được cộng đồng/xác minh | **Giữ và hoàn thiện adapter hiện có.** Dùng làm nguồn thứ hai, không dùng một mình. |
| 1 | URLhaus | Đối chiếu URL phát tán mã độc | **Giữ và hoàn thiện adapter hiện có.** Kiểm tra điều khoản thương mại khi tăng tải. |
| 1 | IPQualityScore Phone | Xác thực số, quốc gia, nhà mạng, loại số, điểm gian lận, lạm dụng/spam gần đây | **Nên thử nghiệm cho MVP SMS.** Xác nhận riêng độ phủ và chất lượng số Việt Nam trước khi ký. |
| 2 | Spamhaus DQS/SIA | Danh tiếng domain/IP gửi Email, link trong Email và hạ tầng liên quan | **Nên dùng cho Pro/production** nếu ngân sách cho phép. |
| 2 | Telesign Intelligence | Điểm rủi ro số điện thoại và mã lý do ở quy mô doanh nghiệp | **Phương án enterprise** thay hoặc đối chứng IPQS. |
| 2 | VirusTotal API v3 trả phí | Góc nhìn nhiều máy quét cho URL, hash và tệp | **Chỉ dùng gói thương mại.** Public API không phù hợp để nhúng vào sản phẩm thương mại; không mặc định tải tệp riêng tư lên. |
| Nội bộ | ClamAV + YARA + file sandbox | Kiểm tra tệp cục bộ, loại tệp thật, mã độc/mẫu đáng ngờ | **Bắt buộc trước khi gửi hash/tệp cho dịch vụ ngoài.** |

Không chọn Twilio SMS Pumping Risk làm điểm uy tín của số gửi: tính năng đó chủ yếu phát hiện hành vi lợi dụng hệ thống gửi OTP, không phải kết luận một số vừa gửi tin cho người dùng có phải kẻ lừa đảo hay không. Twilio Basic/Line Type vẫn có thể làm nguồn dự phòng để chuẩn hóa và xác định loại số.

## 9. Thiết kế giao diện Email

### 9.1 Màn hình nhập

| Khu vực | Thành phần |
|---|---|
| Chọn nguồn | Hai nút: **Chọn từ Gmail** (nổi bật) và **Dán Email / tải file .eml** |
| Kết nối Gmail | Giải thích ngắn quyền chỉ đọc, “Prewise chỉ lấy thư bạn chọn”, nút Kết nối; có nút Ngắt kết nối trong Cài đặt |
| Hộp chọn thư | Ô tìm kiếm; bộ lọc Hộp thư đến/Spam/Chưa đọc; danh sách gồm người gửi thật, tên hiển thị, chủ đề, ngày, đoạn xem trước và nhãn Gmail |
| Xem trước an toàn | Hiển thị text đã vô hiệu hóa link/ảnh từ xa; cho chọn một thư; liệt kê số link và tệp trước khi quét |
| Chế độ | Nhanh: header + nội dung + đối chứng link; Cân bằng: thêm RDAP/DNS và HTTP sandbox; Chuyên sâu Pro: browser, ảnh/QR, tệp và AI ngữ cảnh |

### 9.2 Màn hình kết quả Email

| Thứ tự | Khối giao diện | Nội dung |
|---:|---|---|
| 1 | Kết luận | Điểm, nhãn rủi ro, độ chắc chắn, phạm vi đã kiểm tra và hành động ngay |
| 2 | Danh tính người gửi | Tên hiển thị, địa chỉ thật, Reply-To, domain; ba nhãn dễ hiểu “Nguồn gửi / Chữ ký / Khớp danh tính” thay vì chỉ ghi SPF/DKIM/DMARC |
| 3 | Họ đang muốn gì? | AI/rule tóm tắt người bị giả, yêu cầu tiền/dữ liệu, thời hạn và kênh hành động |
| 4 | Link và website | Mỗi dòng có chữ người dùng nhìn thấy → domain thật → trang cuối → mức rủi ro; nút xem báo cáo website cô lập |
| 5 | Tệp/QR | Tên tệp, loại thật, hash, kết quả quét, QR/link tìm thấy; không cho mở trực tiếp |
| 6 | Bằng chứng | Chia 5 nhóm đúng với bộ tiêu chí; mỗi bằng chứng có câu giải thích, điểm đóng góp và nguồn |
| 7 | Chi tiết kỹ thuật | Thu gọn mặc định: header gốc, đường đi thư, SPF/DKIM/DMARC/ARC, Message-ID, nguồn API chưa chạy |
| 8 | Hành động | Không trả lời; mở app/website chính thức; gọi số chính thức; báo phishing trên Gmail; đổi mật khẩu/khóa giao dịch nếu đã làm theo |

## 10. Thiết kế giao diện SMS

### 10.1 Màn hình nhập

| Trường | Thiết kế |
|---|---|
| Số gửi | Ô riêng, chọn quốc gia mặc định Việt Nam, tự chuẩn hóa dạng `+84`; chấp nhận “không có số/sender chữ” |
| Nội dung | Ô dán một tin hoặc cả chuỗi hội thoại; giữ mốc người gửi/người nhận và thời gian nếu có |
| Ảnh chụp | Cho tải ảnh để OCR ở Pro; che số tài khoản, OTP và dữ liệu nhạy cảm trước khi lưu |
| Ngữ cảnh | Các lựa chọn ngắn: “Tin bất ngờ”, “Đang chờ giao hàng”, “Có giao dịch thật”, “Đã trả lời/bấm link/chuyển tiền” |
| Hành động | Nút **Điều tra tin nhắn và số gửi**; nói rõ đây là kiểm tra uy tín, không truy tìm/doxxing danh tính cá nhân |

### 10.2 Màn hình kết quả SMS

| Thứ tự | Khối giao diện | Nội dung |
|---:|---|---|
| 1 | Kết luận | Điểm, nhãn, độ chắc chắn, “Không bấm/Không trả lời/Không chuyển tiền” khi cần |
| 2 | Số gửi | Hợp lệ, quốc gia, nhà mạng, loại số, dấu hiệu lạm dụng, số nguồn đã đối chiếu; không công khai tên/chủ thuê bao cá nhân |
| 3 | Kịch bản | Ví dụ: giao hàng giả, phạt/nợ giả, tuyển việc nạp tiền, đầu tư, giả người thân, “nhầm số” |
| 4 | Hành động bị yêu cầu | Bấm link, gọi lại, trả lời, gửi OTP, chuyển tiền, cài app hay chuyển sang nền tảng khác |
| 5 | Link và website | Chuỗi chuyển hướng, domain thật, trang cuối, dữ liệu trang muốn lấy và báo cáo sandbox |
| 6 | Diễn biến hội thoại | Dòng thời gian cho nhiều lượt; đánh dấu thời điểm chuyển từ bình thường sang xin tiền/dữ liệu |
| 7 | Bằng chứng và nguồn thiếu | 5 nhóm tiêu chí, điểm đóng góp; ghi rõ API nào không có dữ liệu thay vì coi là an toàn |
| 8 | Hành động | Tự gọi số chính thức, chặn số, báo spam, liên hệ ngân hàng/nhà mạng nếu đã mất dữ liệu hoặc tiền |

## 11. Luồng Gmail và bảo vệ dữ liệu

| Bước | Xử lý |
|---:|---|
| 1 | Người dùng bấm “Chọn từ Gmail” và cấp quyền chỉ đọc qua OAuth. |
| 2 | Backend giữ token được mã hóa; frontend không nhận refresh token. |
| 3 | Danh sách thư chỉ tải metadata tối thiểu và đoạn xem trước để người dùng chọn. |
| 4 | Chỉ sau khi người dùng bấm Phân tích, backend mới lấy bản đầy đủ của đúng thư đã chọn. |
| 5 | HTML được làm trơ; ảnh từ xa không tải trên trình duyệt người dùng; link/tệp được gửi sang pipeline cô lập. |
| 6 | Mặc định chỉ lưu hash, kết quả, bằng chứng đã che dữ liệu và đoạn trích tối thiểu; body/tệp thô bị xóa sau khi quét. |
| 7 | Người dùng có thể xóa kết quả, ngắt Gmail và thu hồi token. |

Quyền `gmail.readonly` là quyền bị hạn chế. Khi dữ liệu Gmail được truyền hoặc lưu trên server, Google có thể yêu cầu xác minh ứng dụng và đánh giá bảo mật. Thiết kế cũng phải được rà soát theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 đang có hiệu lực từ 01/01/2026. Đây là yêu cầu sản phẩm/pháp chế cần xác nhận, không chỉ là việc viết API.

## 12. Dữ liệu huấn luyện và cách chứng minh chất lượng

| Yêu cầu | Tiêu chuẩn chấp nhận trước khi phát hành |
|---|---|
| Tách mô hình | Email và SMS có model, feature và ngưỡng riêng; model nội dung không thay thế rule kỹ thuật. |
| Tập thử theo thời gian | Tập thử phải mới hơn tập huấn luyện; không để cùng domain/chiến dịch lọt vào cả hai phía. |
| Tiếng Việt thực tế | Có dấu, không dấu, viết tắt, sai chính tả, pha tiếng Anh, Unicode/zero-width và cách né từ khóa. |
| Đủ loại lừa đảo | Email có link, tệp, QR, BEC không link; SMS giao hàng, phạt/nợ, ngân hàng, OTP, việc làm, đầu tư, tình cảm, nhầm số nhiều lượt. |
| Mẫu lành khó | Email ngân hàng/giao hàng thật, marketing thật, OTP thật, domain mới hợp pháp, email chuyển tiếp và số VoIP hợp pháp. |
| Chỉ số chính | Tỷ lệ bắt được lừa đảo đã xác minh ≥ 95%; báo nhầm trên mẫu hợp pháp khó ≤ 3%; công bố riêng từng nhóm và tiếng Việt. |
| Tập nghiêm trọng | Link/tệp đã được xác nhận độc hại phải bắt ≥ 99%; không cho lỗi API biến thành “an toàn”. |
| Đối chiếu thị trường | Mỗi quý chạy cùng một bộ 300–500 mẫu mới qua Prewise và các công cụ công khai như Scamio, Genie, ScamCheck; ghi verdict, lý do, thời gian và dữ liệu cần nhập. |
| Chống né lọc | Tạo biến thể đổi chữ, URL rút gọn, QR, ảnh chứa chữ, HTML ẩn, chuyển hướng, nội dung do AI viết và hội thoại nhiều lượt. |
| Phản hồi | Có nút “Kết quả sai”; mẫu chỉ vào huấn luyện sau khi che dữ liệu và được người dùng đồng ý. |

Nguồn dữ liệu khởi đầu có thể dùng UCI SMS Spam để kiểm thử nền, SmishTank/Sting9 cho smishing mới, các corpus Email phishing/ham có header, dữ liệu URL hiện có và tập tiếng Việt tự thu thập có xác minh. Không nên dùng UCI SMS cũ làm thước đo chính vì chủ yếu là spam tiếng Anh, không đại diện lừa đảo hiện đại.

## 13. Kế hoạch triển khai đề xuất

| Giai đoạn | Việc làm | Điều kiện hoàn tất |
|---|---|---|
| 1. Nền chấm điểm | Tách Email/SMS core, schema bằng chứng, ngưỡng bắt buộc; cho mọi link đi qua URL core | Unit test cho từng tiêu chí và tổ hợp; không thay đổi score URL hiện có ngoài interface dùng chung |
| 2. Email đầy đủ | Parse `.eml`/MIME/header, SPF/DKIM/DMARC, link thật, QR, file scanner; UI kết quả Email | Bắt BEC không link, QR và link giả; forwarded mail không bị phạt sai hàng loạt |
| 3. SMS + số gửi | Form số + nội dung/chuỗi; IPQS pilot; UI số gửi và hội thoại | Có kiểm thử số Việt Nam, sender chữ, không có số và API không khả dụng |
| 4. Gmail | OAuth, danh sách thư, chọn một thư, scan, disconnect/delete | Qua rà soát bảo mật, quyền riêng tư và yêu cầu xác minh Google |
| 5. Pro AI | Hiểu kịch bản, nhiều lượt, OCR/QR, điều tra browser sâu, giải thích | AI bị giới hạn tool; kết quả luôn trỏ đến bằng chứng; fallback không AI hoạt động |
| 6. Benchmark | Bộ thử mới theo thời gian, dashboard bỏ sót/báo nhầm, so sánh định kỳ | Đạt cổng chất lượng tại mục 12 trước khi tuyên bố vượt ứng dụng khác |

## 14. Nguồn nghiên cứu chính

- [RFC 9989 — chuẩn DMARC mới, đồng thời nêu rõ DMARC pass không bảo đảm nội dung an toàn](https://www.rfc-editor.org/rfc/rfc9989.html)
- [Google Gmail sender guidelines — SPF, DKIM, DMARC, DNS và TLS](https://support.google.com/mail/answer/81126)
- [Gmail API — lấy nội dung đầy đủ của một message](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get)
- [Gmail API scopes — quyền bị hạn chế và yêu cầu đánh giá bảo mật](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Google Cloud Web Risk Lookup API](https://docs.cloud.google.com/web-risk/docs/lookup-api)
- [Google Safe Browsing — bản miễn phí không dành cho sản phẩm thương mại](https://developers.google.com/safe-browsing/reference/rest)
- [PhishTank API](https://dev.phishtank.com/api_info.php)
- [URLhaus Community API](https://urlhaus.abuse.ch/api/)
- [Spamhaus domain reputation API](https://docs.spamhaus.com/sia/docs/source/10-API-Interface/310-Domains.html)
- [VirusTotal API v3 và điều kiện Public API](https://docs.virustotal.com/docs/api-overview)
- [ICANN RDAP](https://www.icann.org/rdap/)
- [IPQualityScore Phone Validation API](https://www.ipqualityscore.com/documentation/phone-number-validation-api/overview)
- [Telesign Intelligence](https://developer.telesign.com/enterprise/docs/intelligence-cloud-overview)
- [MITRE ATT&CK — phishing bằng link](https://attack.mitre.org/techniques/T1566/002/)
- [Google Messages — phát hiện kịch bản lừa đảo nhiều lượt trên thiết bị](https://blog.google/products-and-platforms/platforms/android/new-android-features-march-2025/)
- [Bitdefender Scamio — kết hợp nội dung, ngữ cảnh, ảnh, QR và link](https://www.bitdefender.com/en-us/news/bitdefender-launches-scamio-a-powerful-scam-detection-service-driven-by-artificial-intelligence)
- [Trend Micro ScamCheck — kiểm tra text, email, URL, ảnh và số điện thoại](https://shop.trendmicro.com/en_us/products/trend-micro-check.asp)
- [UCI SMS Spam Collection](https://archive-beta.ics.uci.edu/dataset/228/sms%2Bspam%2Bcollection/files)
- [Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15](https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578/57730.htm)

## 15. Trạng thái triển khai production (18/07/2026)

| Khối | Đã chạy trong mã nguồn | Điều kiện hạ tầng |
|---|---|---|
| Email kỹ thuật | Đọc `.eml`/MIME, From/Reply-To/Return-Path/Message-ID/Received, SPF/DKIM/DMARC, link hiển thị khác link thật | Không cần dịch vụ ngoài |
| Email nội dung | Giả thương hiệu, thúc ép, lấy OTP/mật khẩu/tiền, chiếm tài khoản, đổi tài khoản thanh toán và BEC | AI ngữ cảnh là lớp cộng thêm; rule vẫn chạy khi AI tắt |
| Tệp và ảnh | Loại thật/đuôi kép, macro Office, PDF chủ động, archive mã hóa, URL trong tài liệu, QR, ClamAV và OCR | Production Compose chạy ClamAV riêng; Tesseract `vie+eng` nằm trong backend image |
| Website trong Email/SMS | Mọi URL lấy từ nội dung, HTML, QR, OCR và tệp đều đi qua URL Core theo độ sâu đã chọn | Nguồn đối chứng ngoài cần khóa riêng; thiếu nguồn luôn hiện “chưa khả dụng” |
| SMS | Kịch bản đơn/nhiều lượt, link, yêu cầu nhạy cảm, OTP hợp pháp, số Việt Nam/sender chữ, danh tiếng số | IPQS cần khóa server; rule định dạng số vẫn chạy độc lập |
| Sandbox tệp | Chỉ chạy tệp thực thi trong máy ảo Windows, chỉ ở Pro và khi bật cấu hình | Cần host Windows Sandbox tách biệt; mặc định không chạy tệp trên API server |
| Gmail | OAuth phía máy chủ có PKCE; token mã hóa và xoay khóa; tìm/chọn thư; lấy MIME gốc để chấm mà không gửi nội dung về trình duyệt; nhãn Spam/Phishing; ngắt kết nối và thu hồi token | Cần cấp thông tin OAuth thật, khai báo màn hình đồng ý, xác minh quyền `gmail.readonly` của Google và rà soát pháp lý trước khi bật công khai |

Các khóa production bổ sung đã có trong mã: giới hạn kích thước request trước khi đọc multipart; giới hạn số tệp/OCR/sandbox và tổng thời gian Email; không lưu đoạn xem trước của Email gốc; phản hồi chấm điểm không được cache, nhúng iframe hoặc gửi referrer; lỗi dịch vụ ngoài không lộ khóa; tài liệu API tắt ở production. Chế độ **Pro AI** chỉ chạy cho tài khoản trả phí, có quota riêng và hoàn quota nếu lớp AI lỗi.

Image production cài locale `en_US.UTF-8` để model ngôn ngữ ONNX của Email/SMS tải được, OCR Việt/Anh và Chromium. Cổng `/v1/health` chỉ báo tiến trình còn sống; cổng `/v1/ready` mới quyết định nhận lưu lượng và sẽ trả lỗi nếu database, model URL/text/prompt, OCR hoặc ClamAV bắt buộc chưa sẵn sàng. Chuỗi migration được tách đúng phiên bản và đã kiểm tra nâng lên mới nhất, hạ về rỗng rồi nâng lại trên PostgreSQL 16 sạch.

## 16. Chu trình tự kiểm tra và cải thiện

Mỗi thay đổi trên nhánh chính hoặc pull request phải đi qua cùng một chu trình trong GitHub Actions:

| Bước | Điều kiện đạt |
|---|---|
| 1. Kiểm tra mã | Python lint sạch; test dùng database tạm riêng, không chạm dữ liệu phát triển |
| 2. Kiểm tra giao diện | ESLint không cảnh báo; typecheck, test và Next.js production build đều qua |
| 3. Kiểm tra thư viện | Audit frontend không có lỗ hổng từ mức đã cấu hình |
| 4. Build production | Chỉ cài dependency runtime; Chromium headless shell; OCR Việt/Anh; locale model đầy đủ |
| 5. Kiểm tra database | PostgreSQL nâng lên mới nhất, hạ về rỗng và nâng lại thành công |
| 6. Kiểm tra dịch vụ | PostgreSQL, ClamAV và backend khởi động; `/v1/ready` phải trả `ready` |
| 7. Khi có lỗi | Ghi nhận lỗi thật, sửa nguyên nhân gốc, thêm test chống tái phát rồi chạy lại từ bước phù hợp |

Docker local cần tối thiểu khoảng 12 GB trống để build và xuất image an toàn. Nếu máy không đủ dung lượng, cổng production chạy trên CI cloud; không được đổi trạng thái “chưa kiểm tra” thành “đã đạt”.

Nguyên tắc vận hành: **không áp dụng**, **chưa cấu hình**, **một phần** và **đã kiểm tra** là bốn trạng thái khác nhau; không trạng thái nào bị thiếu được quy đổi thành “an toàn”.
