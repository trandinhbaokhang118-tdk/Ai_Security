# Chrome Extension release packaging

## Chrome Extension

From the repository root:

```powershell
python scripts/package_extension.py --check
python scripts/package_extension.py
```

The packager validates Manifest V3 references, JavaScript syntax, locale
resources, external scripts, inline event handlers, and the reviewed
permission allowlist. It then creates a reproducible ZIP whose manifest is at
the archive root. Development-only files and icon-generation scripts are not
included.

The extension does not request `scripting`. Its broad HTTPS host access remains
necessary because protection automatically evaluates visited tab URLs and
supports a user-configured HTTPS Gateway. Gmail content access is separately
limited to `https://mail.google.com/*`. Replacing automatic protection with an
on-click-only workflow would allow migration to optional host permissions.

## Checksums

Collect publishable artifacts in one directory and run:

```powershell
node scripts/hash_artifacts.mjs artifacts
```

Publish the generated `SHA256SUMS.txt` beside the artifacts. Release jobs must
also retain the immutable source commit and the exact package lock used to
produce them.
