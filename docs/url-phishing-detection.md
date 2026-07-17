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

## Supplied-document rule pack (2026-07)

`HudsonRock_AI_Training_Document.docx`, `CyRadar_AI_Training_Document.docx`, and
`CyRadar_Full_Documentation.md` are product/intelligence documents, not labelled URL
datasets. They do not publish feature weights, decision thresholds, or validation
metrics. The runtime therefore applies their useful patterns as deterministic,
auditable evidence and does not overwrite the existing 874k-row ONNX model with
marketing text.

Implemented patterns:

- Credential-lure scoring is monotonic: `login + verify + account` cannot score less
  than only two lure terms.
- A document-looking double extension ending in an executable, such as
  `CV.pdf.exe`, is critical evidence.
- Archives paired with CV, invoice, shipment, or document lures require sandbox
  review.
- Shared cloud/serverless hosting is never risky alone. It contributes only when
  paired with brand impersonation, credential lures, or a suspicious download.
- Hudson Rock results are stored as `compromise_exposure`; they never become a
  malicious-URL verdict by themselves.
- Provider `no_hit` means no evidence was returned, not `safe`.

The non-live regression pack is in `data/url_rule_corpus.json`. It uses reserved
`.test` and `.example` names and is exercised by `tests/test_url_rule_corpus.py`.

## Basic URL intelligence returned by the API

`AssessResponse.url_intelligence` and the demo URL response expose factual enrichment
separately from the risk verdict:

- Cloudflare DNS-over-HTTPS supplies current A/AAAA, NS and MX records.
- RDAP is resolved through the IANA DNS bootstrap first and supplies registration,
  expiration, registrar, public registrant and registry nameservers. WhoisXML or
  IP2WHOIS can be configured as authenticated registration sources.
- IP2Location.io supplies city/country, ASN and network provider for the first public
  resolved IP. Only the IP literal is sent; the full URL and query string are not.

Every source has `completed`, `not_configured`, `unavailable`, or `redacted` status.
A privacy-redacted registrant remains `null`; the backend never guesses an owner.
Private, loopback, reserved and otherwise non-global addresses are never sent to the
geolocation service. Results are cached for six hours by default. Set
`IP_GEOLOCATION_ENABLED=false` to disable this lookup, or set
`IP2LOCATION_API_KEY` for sustained use beyond the provider's keyless allowance.
Some ccTLDs, including `.vn`, do not publish an endpoint in the IANA RDAP bootstrap.
For automated `.vn` registration fields configure `WHOISXML_API_KEY` or
`IP2WHOIS_API_KEY`; otherwise the API keeps them unavailable and operators can verify
them manually through VNNIC's official
[`tracuutenmien.gov.vn`](https://tracuutenmien.gov.vn/) portal.

## Official-source roles

| Provider | Correct role | Direct integration |
| --- | --- | --- |
| [Google Safe Browsing v5](https://developers.google.com/safe-browsing/reference/rest/v5/urls/search) | Runtime known-threat verdict; non-commercial use only (commercial products need Web Risk) | `GOOGLE_SAFE_BROWSING_API_KEY` |
| [PhishTank](https://www.phishtank.org/developer_info.php) | Verified runtime lookup and hourly positive feed | `PHISHTANK_ENABLED`, optional `PHISHTANK_API_KEY` |
| [PhishDestroy](https://api.destroy.tools/) | Runtime lookup; primary/active feed can support offline positive training subject to feed provenance | `PHISHDESTROY_ENABLED` |
| [Hudson Rock](https://docs.hudsonrock.com/docs/domain-search) | Infostealer/domain compromise enrichment only | `HUDSON_ROCK_API_KEY` |
| [IPQualityScore](https://www.ipqualityscore.com/documentation/malicious-url-scanner-api/overview) | Scored runtime URL reputation | `IPQS_API_KEY` |
| [APIVoid](https://www.apivoid.com/api/url-reputation/) | Scored runtime URL reputation | `APIVOID_API_KEY` |
| [Criminal IP](https://search.criminalip.io/developer/api/post-domain-scan) | Async active scan and report; requires a provider-specific job flow | Custom gateway required |
| [Have I Been Pwned](https://haveibeenpwned.com/API/V3) | Breach/stealer exposure, not URL reputation | Not called for arbitrary URLs |
| CyRadar, NCA/nTrust, NCSC, ScamVN | No public URL verdict API/dataset was found | Keep `not_configured`; do not scrape |

ScamAdviser and BforeAI expose commercial APIs/feeds, but their endpoint, quota, and
training rights depend on contract. They remain behind an explicitly configured
normalizing gateway. Criminal IP also needs scan -> poll -> report orchestration and
must not be treated as a single synchronous `GET ?url=` call.

All reputation-provider lookups are opt-in because URLs can contain internal hosts,
tokens, or personal data. Keys stay server-side. Basic IP enrichment sends only a
validated public IP and can also be disabled. Active browsing or payload fetching
belongs in the SSRF-hardened sandbox, not in this lexical quick-scan layer.

## Complete internal-criteria coverage in advanced scans

An advanced scan combines five observation groups before Risk Core produces its
final status for criteria 1..49:

- lexical URL and local model evidence;
- registration, certificate transparency and public scan history;
- current DNS, public IP/ASN and server location;
- isolated HTTP/HTML inspection;
- isolated browser behavior, screenshot identity and synthetic-canary probes.

The browser collector blocks and records permission requests, popup windows,
downloads, private-network access, WebSockets and synthetic credential exfiltration.
It also extracts public legal names, addresses, contact channels, social links,
prices, payment hints, reviews and identity metadata without submitting a real form.

DNS and rendered-content fingerprints are stored in the bounded local file
`.aisec-data/url-scan-history.json`. This enables criteria 43 and 44 on later scans
without PostgreSQL and without storing HTML, screenshots, query strings or form
values. The first observation is explicitly a baseline (`not_applicable`), not a
fabricated clean result.

When a public registry redacts ownership/expiry or a page has no commercial,
payment, social, visual-reference or review context, the related criterion is
`not_applicable` with an auditable reason. `clean` is emitted only after the relevant
collector actually ran, while execution/provider failures remain `unavailable`.

## Local Phishing.Database snapshot

The public repository can be kept outside the source tree and imported into the local
threat-feed tables:

```powershell
git clone --depth 1 https://github.com/Phishing-Database/Phishing.Database.git .aisec-data/Phishing.Database
python scripts/import_phishing_database.py
```

The importer follows the upstream `phishing-links-ACTIVE` manifest, streams only
HTTP(S) entries, deduplicates them, and upserts them idempotently. Runtime scans query
the indexed exact URL and campaign keys; they do not broaden a hit to every URL on the
same registrable domain. Re-run the clone update and importer to refresh the snapshot.
