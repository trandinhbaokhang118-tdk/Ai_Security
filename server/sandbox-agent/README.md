# Prewise Sandbox Agent

This PowerShell agent belongs **only** in a hardened, disposable Windows AMI.
It receives a short-lived session token through EC2 user data, polls the gateway
for one user-consented executable, runs it with a 60-second timeout, and posts a
bounded report. The VM must be terminated after the session.

Required AMI controls:

- Disable or restrict egress with a security group/proxy; do not use a normal user network.
- Install this script as `PrewiseSandboxAgent` under a dedicated low-privilege account.
- Prevent guest access to cloud credentials and operator networks.
- Configure `SANDBOX_PUBLIC_BASE_URL` to the HTTPS gateway reachable from the VM.

The reference agent reports basic process completion only. Production telemetry
should add ETW/Sysmon collection and a controlled egress proxy before enabling it
for untrusted samples.
