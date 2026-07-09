# Advanced Browser Sandbox

Endpoint: `POST /v1/assess/url/browser-sandbox`

This mode opens the URL in an isolated headless Chromium/Chrome profile. It is
designed for defensive phishing analysis, especially login and OTP pages.

## What it does

- Blocks localhost, private IP, link-local, reserved, and other non-public
  network destinations before requests are allowed.
- Runs in a temporary browser profile with downloads disabled and no persisted
  cookies.
- Injects synthetic canary clone data only, never real user credentials.
- Fills detected email, username, password, phone, and OTP fields with canary
  values.
- Prevents form submission inside the sandbox.
- Blocks outgoing requests when a canary value appears in the URL or request
  body.
- Routes browser traffic through a local egress proxy that resolves, validates,
  and pins each destination to an approved public IP before connecting.
- Blocks WebSocket creation, service workers, QUIC, and non-proxied WebRTC UDP
  to prevent alternate network paths around the HTTP request guard.
- Reports exact signals such as `otp_input_detected`,
  `password_input_detected`, `cross_origin_form_action`,
  `canary_exfiltration_blocked`, and `private_network_request_blocked`.

## Setup

Install the optional browser dependency:

```bash
pip install -e ".[browser]"
```

If the machine does not already have Chrome or Edge available, install a
Playwright browser:

```bash
python -m playwright install chromium
```

## Safety notes

Use clone/canary values only. Do not submit a real password, real OTP, banking
OTP, email OTP, or production account into the sandbox.

The current implementation performs a safe dry run: it fills canary fields,
blocks form submission, and aborts canary exfiltration before the data leaves
the sandbox. The pinned proxy closes the DNS-rebinding gap for proxied TCP
traffic, but this remains process isolation rather than a VM security boundary.
A future high-risk detonation mode should run only inside a disposable
container or microVM with an independently enforced host egress policy.
