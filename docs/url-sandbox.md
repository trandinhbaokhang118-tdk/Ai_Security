# URL Sandbox

Endpoint: `POST /v1/assess/url/sandbox`

The URL sandbox performs a real HTTP/HTTPS request in a separate Python process. It is
separate from the AI URL score, so an observed HTTP or TLS error is not presented as a
model prediction.

## Safety limits

- Only HTTP and HTTPS are accepted.
- DNS is resolved before connecting and the connection is pinned to a checked public IP.
- Loopback, private, link-local, reserved, multicast, and other non-public IPs are blocked.
- Every redirect target is validated again.
- Redirects, response size, socket timeout, and total process time are bounded.
- The worker runs without shell invocation and the backend container runs as a non-root user.

## Reported results

- DNS, connection, timeout, TLS certificate, redirect, and HTTP status errors.
- Final URL, resolved IP, response type and size, redirect history, and TLS summary.
- Password/sensitive fields, external form actions, external iframes/scripts, meta refresh,
  urgency language, oversized responses, and missing browser security headers.

This is an HTTP sandbox. It intentionally does not execute JavaScript or submit forms. A
future browser sandbox should run in a dedicated disposable container or microVM, never in
the gateway process.
