# Security policy and responsible disclosure

ProtocolValue publishes blockchain-data documentation and an associated public interface. Because cryptocurrency-related interfaces may attract impersonation and phishing, users should verify URLs and contract addresses carefully.

## Reporting a suspected vulnerability

**Please do not publicly post exploitable details, secret keys, recovery phrases, authentication tokens, or user data in GitHub Issues.**

Preferred route: use the repository's **GitHub private vulnerability reporting** feature **if it is enabled** under the Security tab. If private reporting is not available, use the **contact route published on https://protocolvalue.com/** and request a confidential communication channel before sharing sensitive technical details.

Reports should include, if safe to share privately: affected URL or component, timestamp, reproducible steps, likely impact and non-destructive supporting evidence. Do not perform invasive testing, move other people's funds or attempt to access private data.

**No guaranteed response time, bounty, safe-harbor agreement, or audit certification is promised by this document.**

## User precautions

- Confirm the exact hostname: `protocolvalue.com`; beware lookalike domains and social-engineering links.
- Independently confirm destination addresses and transaction details in the wallet before signing.
- Never disclose wallet seed phrases or private keys to the site or its support representatives.
- A read-only contract value does not imply a safe approval, swap, bridge, deposit or withdrawal.
- Treat sponsored links as third-party destinations; inspect them independently.
- Distinguish **site-reputation findings** from **smart-contract audit findings**.

## Security and reputation reviews

The Gridinsoft review of 2026-10-18 concerned **public website material and domain reputation**. It did **not** include wallet connection, signed transactions, private systems or a comprehensive smart-contract audit. See [GRIDINSOFT_REVIEW.md](GRIDINSOFT_REVIEW.md).

## Scope of this repository

This repository currently publishes **documentation**, not proof of a complete open-source release or a continuous security monitoring service. Statements herein must not be construed as independent penetration-test results.
