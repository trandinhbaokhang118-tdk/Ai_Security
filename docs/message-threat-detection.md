# Email and SMS threat detection

## Runtime design

Email/SMS assessment is a hybrid gate.  The lightweight/Transformer classifiers
receive sanitized visible text, while the deterministic threat core receives the
original message so it can retain HTML attributes and attachment metadata.

The core now evaluates:

- every embedded URL with the full URL risk core, including bare and defanged URLs;
- visible-link domain versus the actual HTML `href` destination;
- sender domain, `Reply-To` organizational-domain alignment and explicit
  SPF/DKIM/DMARC results;
- executable, macro-enabled, archive-lure and disguised double-extension attachments;
- business email compromise (finance + authority/secrecy/urgency);
- SMS delivery/customs fees, unpaid tolls/fines, job-task deposits, investment
  deposits and account-takeover lures;
- protective, link-free OTP notifications as a narrow benign control so the text
  model cannot create an uncorroborated warning from the word `OTP` alone.

Detectors use clusters rather than single keywords for high-risk verdicts.  A delivery
word by itself is not malicious; delivery/toll + payment + URL is a critical cluster.

## Email metadata contract

`POST /v1/assess/text` accepts a free-form `metadata` object.  The following keys are
recognized (hyphens and underscores are interchangeable):

```json
{
  "text": "raw HTML or plain message body",
  "modality": "email",
  "metadata": {
    "subject": "Invoice account change",
    "sender": "CEO <ceo@example.com>",
    "reply_to": "finance@different-domain.test",
    "authentication_results": "spf=fail; dkim=fail; dmarc=fail",
    "attachments": [
      {"filename": "invoice.pdf.exe"}
    ]
  }
}
```

Authentication can also be supplied as `spf`, `dkim`, `dmarc`, or as a mapping:

```json
{"authentication_results": {"spf": "pass", "dkim": "pass", "dmarc": "pass"}}
```

Absence of an authentication result is **not** interpreted as failure.

## Regression corpus

`data/message_rule_corpus.json` is a synthetic, non-live test set.  It contains both
malicious patterns and benign controls.  Reserved `.test` domains ensure automated
tests never contact malicious infrastructure.  Run it with:

```powershell
python -m pytest -q tests/test_message_rule_corpus.py
```

The corpus is a regression suite, not a replacement for an independently labeled,
time-split validation set.  A missed real sample should be anonymized, labeled and
added as a new regression case before changing weights.

## Primary references used for rule design

- [CISA: Recognize and Report Phishing](https://www.cisa.gov/secure-our-world/recognize-and-report-phishing)
  covers urgent language, incorrect links and suspicious attachments.
- [Google: Email sender guidelines](https://support.google.com/a/answer/81126)
  documents SPF, DKIM, DMARC and alignment expectations.
- [Microsoft: Email authentication](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about)
  explains authentication signals and spoofing protection.
- [Microsoft: Anti-phishing policies and mailbox intelligence](https://learn.microsoft.com/en-us/defender-office-365/anti-phishing-policies-about)
  documents impersonation and sender-intelligence controls.
- [FTC: Unpaid toll text scams](https://consumer.ftc.gov/consumer-alerts/2025/01/got-text-about-unpaid-tolls-its-probably-scam),
  [FTC: Package-delivery text scams](https://consumer.ftc.gov/consumer-alerts/2025/04/think-text-message-usps-it-could-be-scam),
  and [FTC: Task scams](https://consumer.ftc.gov/consumer-alerts/2024/11/task-scams-create-illusion-making-money)
  provide current behavior clusters for smishing rules.
- [UCI SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms) is useful for
  offline evaluation, but its 5,574 messages are old and mostly English; it must not
  be treated as sufficient validation for current Vietnamese SMS attacks.

## Limits

No classifier can guarantee detection of every new scam.  Offline analysis cannot
know the final destination of an unresolved shortlink or a newly compromised clean
domain.  Those cases require safe redirect expansion, current reputation providers
and/or isolated browser sandboxing.  Provider timeouts or "not found" responses must
remain unknown, never be converted to benign evidence.
