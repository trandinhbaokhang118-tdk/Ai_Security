# Landing Page — Scroll-Driven Product Reveal
## Production Design Document (v1.0)

> **Ngày tạo:** 02/07/2026
> **Trạng thái:** Ready for Production
> **Approach:** Image Sequence (Apple-style) + Video Layer Compositing

---

## 1. Tổng quan ý tưởng (Concept Overview)

Trang landing page mở đầu bằng **video demo sản phẩm chạy full-screen** ngay khi user vừa vào web — không có header, không có UI, chỉ có video thuần. Sau khi video kết thúc 1 vòng loop **hoặc** user bắt đầu scroll (tuỳ điều kiện nào đến trước), camera bắt đầu **kéo lùi (dolly-out)** để lộ dần toàn bộ bối cảnh:

- Video demo dần "co lại" và **warp theo góc màn hình laptop** (corner-pin, khớp phối cảnh 3D)
- Lộ dần: tay đặt trên bàn phím, chuột, mặt bàn
- Lộ dần: nhân vật đang ngồi trên ghế tựa, sử dụng laptop
- Lộ dần: tường phía sau với các khung nội dung — **Slogan**, **Chức năng A**, **Chức năng B**...

Khi user scroll đến 100% (hết animation), nếu dừng lại, nhân vật sẽ có **idle animation** nhẹ (nhấp nhô, xoay đầu, gõ phím...) để tạo cảm giác "sống" — không bị đứng hình cứng nhắc. Từ điểm này, trải nghiệm **không còn phụ thuộc scroll nữa**, mà là 1 vòng loop tự nhiên độc lập.

### Nguyên tắc thiết kế cốt lõi

> **Video và Background (camera + scene) luôn là 2 layer độc lập.** Scroll chỉ điều khiển vị trí/warp của video, KHÔNG điều khiển việc video chạy hay dừng. Video có clock riêng, chạy liên tục từ đầu đến cuối trải nghiệm.

---

## 2. Kịch bản chi tiết (Storyboard / Script)

### 🎬 STATE 0 — INTRO (Video Full-Screen)

| Thuộc tính | Giá trị |
|---|---|
| Trigger vào state | Ngay khi trang load xong |
| Nội dung hiển thị | `<video>` full-screen, `object-fit: cover`, không transform |
| Hành vi video | `autoplay muted loop playsinline` — chạy vô hạn |
| UI khác | Không có header, không có text — màn hình sạch 100% |
| Điều kiện chuyển state | (a) User bắt đầu scroll, HOẶC (b) video kết thúc ≥1 vòng loop mà chưa scroll → tiếp tục loop, chờ scroll |
| Trigger chuyển | Bắt bằng listener `scroll` (chỉ kích hoạt 1 lần — `once: true`) |

> **Insight kỹ thuật:** Frame 0 của camera sequence có góc nhìn áp sát màn hình laptop → phép warp corner-pin tại đây gần như là *identity transform*. Vì vậy State 0 **không cần Canvas/WebGL** — chỉ cần thẻ `<video>` HTML thuần, giúp trang load cực nhanh.

---

### 🎬 STATE 1 — SCROLL-DRIVEN (Camera Pull-Back)

| Thuộc tính | Giá trị |
|---|---|
| Trigger vào state | Sau khi State 0 kết thúc (scroll hoặc video ended + scroll) |
| Range scroll | 0% → 100% của section Hero (chiều cao section: 300–400vh) |
| Camera | Dolly-out liên tục từ vị trí áp sát màn hình laptop → toàn cảnh phòng làm việc |
| Background | Image Sequence render từ Blender, đổi frame theo `scrollProgress` |
| Video | Vẫn `<video>` đang play/loop liên tục, chỉ áp thêm `matrix3d()` hoặc WebGL warp theo corner-pin data của frame hiện tại |
| Nội dung lộ dần | Tay + bàn phím + chuột → Nhân vật ngồi ghế → Tường phía sau với Slogan/Feature callouts |
| Text animation | Các khung text (Slogan, Feature) fade-in/slide-in đúng theo mốc scroll tương ứng vị trí của chúng trong scene 3D |

**Sơ đồ luồng camera (theo % scroll):**

```
0%   ──► Camera áp sát màn hình laptop (video ~full khung hình)
25%  ──► Lộ bàn phím, chuột, mặt bàn
50%  ──► Lộ nhân vật + ghế tựa
75%  ──► Lộ tường phía sau, callout "Slogan" bắt đầu fade-in
100% ──► Toàn cảnh hoàn chỉnh, tất cả callout hiển thị đầy đủ
```

---

### 🎬 STATE 2 — IDLE LOOP (Sau 100% scroll)

| Thuộc tính | Giá trị |
|---|---|
| Trigger vào state | Scroll progress đạt 100% và user dừng lại (không tiếp tục scroll xuống section kế) |
| Background | Giữ cố định ở frame cuối (không đổi theo scroll nữa) |
| Nhân vật | Idle animation loop riêng (video/sprite riêng): nhấp nhô nhẹ, gõ phím, xoay đầu — tạo cảm giác sinh động |
| Video demo | Tiếp tục play/loop tự nhiên, warp giữ cố định theo corner-pin của frame cuối |
| Kết nối tiếp theo | Chuyển tiếp **mượt, liền mạch** sang nội dung/section kế tiếp — không phải 2 thành phần rời rạc, mà là **1 thể thống nhất** (cùng 1 video hoặc ảnh nối tiếp không phụ thuộc scroll) |

> **Quan trọng:** Từ State 2 trở đi, toàn bộ trải nghiệm chuyển từ "scroll-driven" sang "self-playing" — không còn ràng buộc với vị trí scroll, giúp cảm giác tự nhiên như đang xem 1 đoạn phim hoàn chỉnh.

---

## 3. Kiến trúc kỹ thuật tổng thể

```
┌─────────────────────────────────────────────────────────┐
│                     LAYER STACK (z-index)                │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Text/UI Callouts (Slogan, Feature, CTA)        │
│  Layer 2: <video> demo — warp theo corner-pin matrix3d   │
│  Layer 1: Background Image Sequence (Canvas/WebGL)       │
└─────────────────────────────────────────────────────────┘
```

### State Machine

```javascript
const State = {
  INTRO: 'intro',
  SCROLL_DRIVEN: 'scroll_driven',
  IDLE: 'idle'
};

let currentState = State.INTRO;
let hasTriggered = false;

// --- STATE 0: INTRO ---
video.loop = true;
video.play();

window.addEventListener('scroll', () => {
  if (!hasTriggered) {
    hasTriggered = true;
    currentState = State.SCROLL_DRIVEN;
    enableCanvasBackground();
  }
}, { once: true });

// --- STATE 1: SCROLL_DRIVEN ---
function onScroll() {
  if (currentState !== State.SCROLL_DRIVEN) return;
  const progress = getScrollProgress(); // 0 → 1
  const frameIndex = Math.floor(progress * TOTAL_FRAMES);
  drawBackgroundFrame(frameIndex);
  applyVideoWarp(cornerPinData[frameIndex]);

  if (progress >= 1) {
    currentState = State.IDLE;
    startIdleLoop();
  }
}

// --- STATE 2: IDLE ---
function startIdleLoop() {
  playCharacterIdleAnimation(); // sprite hoặc video riêng
  // background giữ nguyên frame cuối, video warp giữ cố định
}
```

---

## 4. Yêu cầu Asset (Asset Requirements)

### 4.1 Asset 3D

| Asset | Chi tiết | Nguồn |
|---|---|---|
| Model laptop | Đủ chi tiết để nhìn rõ ở góc gần (bản lề, viền màn hình, bàn phím) | Mua sẵn (Sketchfab/CGTrader) hoặc dựng custom |
| Model bàn làm việc | Đơn giản, tối giản (theo phong cách clean/minimal) | Dựng trong Blender |
| Model ghế tựa | Đủ chi tiết ở góc nhìn toàn cảnh | Asset có sẵn |
| Nhân vật (character) | Rigged, có thể animate cơ bản (ngồi, gõ phím, xoay đầu nhẹ) | Mixamo (rig) + model custom hoặc mua sẵn |
| Môi trường/tường | Phẳng, tối giản — chỉ cần đủ để đặt khung callout | Dựng đơn giản trong Blender |
| HDRI/Lighting setup | Ánh sáng studio nhẹ, tông màu đồng nhất với brand | Chuẩn bị hoặc mua HDRI |

### 4.2 Asset Video

| Asset | Chi tiết |
|---|---|
| Video demo sản phẩm | Screen recording UI/UX sản phẩm, đã edit, độ dài loop 8–15s, format MP4 (H.264), có bản mute |
| Video idle nhân vật (State 2) | Loop ngắn 3–5s, nhân vật cử động nhẹ — có thể tách riêng hoặc bake vào cuối sequence luôn |

### 4.3 Asset hình ảnh/text

| Asset | Chi tiết |
|---|---|
| Nội dung callout | Slogan chính, danh sách chức năng (3–5 mục), CTA button text |
| Font/Icon | Đồng bộ với brand guideline |
| Ảnh Image Sequence | Render từ Blender, xuất PNG → convert WebP/AVIF |

---

## 5. Pipeline sản xuất (Production Pipeline)

### Giai đoạn 1 — Previz (Blockout)
- Dựng scene bằng hình khối đơn giản (cube/primitive) đại diện laptop, bàn, ghế, nhân vật
- Animate camera dolly-out trên blockout, test cảm giác timing/composition
- Chốt camera path (keyframe cuối cùng)

### Giai đoạn 2 — Asset hoàn thiện
- Thay blockout bằng model thật/asset mua sẵn
- Setup material, texture, lighting
- Rig + animate nhân vật (idle pose cho State 2)

### Giai đoạn 3 — Render & Export
- Render Image Sequence (PNG) theo camera path đã chốt — độ phân giải vừa đủ (1920×1080 hoặc thấp hơn cho mobile)
- **Không render phần màn hình laptop** (để trống — video sẽ overlay đè lên)
- Viết Python script trong Blender để export corner-pin data (4 góc màn hình Plane, chiếu qua camera projection) → `corner_pin.json`

### Giai đoạn 4 — Tối ưu Asset
- Convert toàn bộ PNG → WebP/AVIF (giảm 60–80% dung lượng)
- Cân nhắc giảm số frame (60–80 frame thay vì 150+, browser nội suy giữa các frame)
- Gộp sprite sheet nếu cần giảm số HTTP request

### Giai đoạn 5 — Frontend Integration
- Preload/lazy-load ảnh sequence theo từng đoạn scroll
- Canvas render + `requestAnimationFrame`
- Áp `matrix3d()` hoặc WebGL shader để warp `<video>` theo `corner_pin.json`
- GSAP ScrollTrigger để map scroll progress → frame index

### Giai đoạn 6 — QA & Optimize
- Test đa thiết bị (mobile tầm trung, không chỉ flagship)
- Test tốc độ scroll nhanh/chậm/scroll ngược
- Fallback cho thiết bị yếu/mạng chậm (ảnh tĩnh + video thường)

---

## 6. Yêu cầu kỹ thuật Frontend

| Thành phần | Công nghệ |
|---|---|
| Scroll tracking | GSAP ScrollTrigger (hoặc Intersection Observer + custom scroll listener) |
| Background rendering | Canvas 2D (đơn giản) hoặc WebGL (hiệu năng cao hơn, ít reflow) |
| Video warp | CSS `matrix3d()` (đơn giản, dễ debug) HOẶC WebGL shader (mượt hơn, khuyến nghị cho production) |
| Image format | WebP (fallback JPEG cho browser cũ), AVIF nếu hỗ trợ tốt |
| Preload strategy | Load theo chunk (ví dụ mỗi 20 frame), ưu tiên frame gần vị trí scroll hiện tại |
| Idle animation (State 2) | Video loop riêng hoặc sprite animation nhẹ |

### Công thức tính Homography (Corner-Pin Warp)

Từ 4 điểm góc gốc của video (0,0), (W,0), (W,H), (0,H) map sang 4 điểm góc đích trong `corner_pin.json`, tính ma trận homography 3×3, sau đó chuyển thành `matrix3d()` 4×4 tương thích CSS (padding thêm z=0 và w=1 cho các phần tử còn thiếu).

---

## 7. Yêu cầu về hiệu năng (Performance Budget)

| Chỉ số | Mục tiêu |
|---|---|
| Tổng dung lượng ảnh sequence | < 8–10MB (đã nén WebP) |
| Thời gian load Intro (State 0) | < 1.5s (chỉ cần load video, không cần chờ ảnh sequence) |
| FPS khi scroll (mobile tầm trung) | ≥ 30fps ổn định |
| Lazy-load | Chunk-based, không load toàn bộ ảnh ngay từ đầu |
| Fallback | Nếu thiết bị/mạng yếu → hiện ảnh tĩnh cuối cùng + video thường, bỏ qua hiệu ứng scroll |

---

## 8. Timeline & Nguồn lực

| Giai đoạn | Thời gian ước tính | Nhân lực |
|---|---|---|
| Previz + Camera blocking | 3–5 ngày | 3D Artist |
| Asset hoàn thiện (model, rig, texture) | 1–2 tuần | 3D Artist |
| Render + Export corner-pin | 3–5 ngày | 3D Artist / TD |
| Tối ưu asset (nén ảnh) | 2–3 ngày | 3D Artist / Dev |
| Frontend integration | 1–2 tuần | Frontend Dev |
| QA + Optimize + Fallback | 3–5 ngày | Frontend Dev + QA |
| **Tổng** | **4–8 tuần** | 3D Artist + Frontend Dev (+ Video Editor nếu cần dựng video demo mới) |

---

## 9. Rủi ro & Phương án dự phòng (Risk & Fallback)

| Rủi ro | Mức độ | Phương án xử lý |
|---|---|---|
| Camera path phải sửa lại sau khi asset đã detail | Cao nếu không blockout trước | Luôn làm Previz/Blockout trước khi detail asset |
| Hiệu năng kém trên mobile giá rẻ | Trung bình | Giảm resolution/frame count, thêm fallback tĩnh |
| Corner-pin warp bị lệch ở tỉ lệ màn hình khác nhau (aspect ratio) | Cao | Tính lại corner-pin theo `viewport aspect ratio`, test đa kích thước màn hình |
| Video demo không khớp thời lượng với animation | Thấp | Thiết kế video loop độc lập với thời gian animation ngay từ đầu (video có clock riêng) |
| Load chậm ảnh hưởng SEO/bounce rate | Trung bình | Ưu tiên load video Intro trước, ảnh sequence load lazy phía sau |

---

## 10. Checklist Go-Live

- [ ] Video demo đã edit, loop mượt, đúng định dạng
- [ ] Model 3D hoàn thiện, camera path đã chốt
- [ ] Image Sequence đã render, convert WebP/AVIF, tối ưu dung lượng
- [ ] `corner_pin.json` export chính xác theo từng frame
- [ ] State machine (Intro → Scroll-driven → Idle) hoạt động đúng, không giật/lag khi chuyển state
- [ ] Test đa thiết bị: mobile tầm trung, tablet, desktop
- [ ] Test đa tỉ lệ màn hình (aspect ratio khác nhau)
- [ ] Fallback hoạt động đúng khi thiết bị/mạng yếu
- [ ] Idle animation (State 2) loop tự nhiên, không lộ điểm nối (seam)
- [ ] Chuyển tiếp từ Hero sang section kế tiếp mượt mà, không đứng hình

---

## Ghi chú cuối

Tài liệu này là bản thiết kế kỹ thuật (production-grade) cho toàn bộ Hero Section dạng Scroll-Driven Product Reveal. Mọi thay đổi về camera path, asset, hoặc kiến trúc frontend nên được cập nhật trực tiếp vào tài liệu này để giữ đồng bộ giữa team 3D và team Frontend trong suốt quá trình sản xuất.