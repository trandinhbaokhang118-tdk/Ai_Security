# URL Phishing Detection Signals

Tai lieu nay chuyen cac dau hieu nhan dien web lua dao qua URL thanh yeu cau ky thuat cho
du an.

## Tang 1: Lexical URL Features

Backend phai phan tich URL nhu mot chuoi ky tu, khong can tai trang web:

- `url_length`: URL qua dai.
- `count_dot`, `count_hyphen`, `count_question`, `count_equal`, `count_at`, `count_percent`.
- `has_https`: co dung HTTPS hay khong.
- `has_ip_address`: dung IP thay vi ten mien.
- `has_shortener`: dung shortlink nhu `bit.ly`.
- `suspicious_keywords`: `login`, `verify`, `secure`, `security`, `otp`, `password`,
  `bank`, `gift`, `free`.
- `brand_domain_mismatch`: URL nhac den thuong hieu nhung domain that khong phai domain
  chinh thuc.
- `deceptive_subdomain`: thuong hieu nam trong subdomain, vi du
  `facebook.com.security-login-check.xyz`.

Vi du:

```text
https://facebook.com.security-login-check.xyz/verify
```

Ket qua mong muon:

```text
real_domain = security-login-check.xyz
brand_mentions = facebook
brand_domain_mismatch = true
deceptive_subdomain = true
suspicious_keywords = security, login, verify
```

## Tang 2: Domain And Host Signals

Nhung tin hieu nay can network hoac threat-intel bo sung, nen chua nen dua vao rule offline
neu chua co du lieu:

- domain_age_days
- domain_expiry_days
- dns_has_a_record
- dns_has_mx
- ssl_valid
- domain_rank
- is_domain_in_top_sites

## Tang 3: Content Features

Khi du an co sandbox crawler, backend nen doc HTML an toan va them cac feature:

- `has_login_form`
- `has_password_input`
- `has_otp_input`
- `has_credit_card_input`
- `external_form_action`
- `external_script_count`
- `iframe_count`
- `suspicious_keyword_count`
- `copyright_brand_mismatch`

## Tang 4: Threat Intelligence

Khong nen chi dua vao model tu train. Nen ket hop:

- Google Safe Browsing
- PhishTank
- OpenPhish
- URLHaus
- Tranco/top-site list cho mau benign

## Runtime Rule

Neu co ONNX model, backend van phai ket hop model voi rule:

```text
final_url_score = max(model_score, rule_score)
```

Ly do: model train bang dataset cu hoac synthetic co the bo sot URL moi, trong khi rule
domain/subdomain co the bat duoc cac mau gia mao ro rang.
