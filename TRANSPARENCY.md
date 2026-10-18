# Transparency and evidence register

**Started:** October 18, 2026  
**Scope:** Public documentation, on-chain data provenance practices and bounded third-party website-reputation findings.

## Principles

1. **Data provenance:** identify source network, contract, relevant function/formula, block and observation status whenever possible.
2. **Honest labels:** separate protocol-defined metrics, market prices, indicative internal capitalization and actual execution terms.
3. **Historical context:** present snapshots as snapshots and avoid silently replacing earlier findings.
4. **Advertising clarity:** distinguish sponsorship/advertising from protocol-derived evidence and from independent endorsement.
5. **Review boundaries:** never inflate an automated domain-rating, public-code inspection or asset listing into a financial or security certification.

## Public events

| Date | Event | Evidence | Interpretation |
| --- | --- | --- | --- |
| 2026-10-17 | Owner requested a Gridinsoft review of the then-displayed `Unsettled Website` classification and 52/100 trust score. | Owner's support correspondence, 15:40 (time zone not stated). | Review request; not a third-party conclusion. |
| 2026-10-18 | Gridinsoft support reported removal of the `Unsettled Website` detection for `protocolvalue.com` and `www.protocolvalue.com`. | Support reply at 06:05 (time zone not stated); [public report](https://gridinsoft.com/online-virus-scanner/url/protocolvalue-com). | Bounded domain-reputation correction. |
| 2026-10-18 | Public report showed 68/100 trust score, zero external provider warnings and analyst review ID `GMA-20261018030358-cbf2c6f5`. | [Gridinsoft report](https://gridinsoft.com/online-virus-scanner/url/protocolvalue-com). | A dated third-party reputation result; not an asset or contract audit. |

The support reply described the updated result as **“Safe”**. The public report also uses **“Trusted but Verify”** wording. Those are separate expressions from the same provider; neither should be represented as an audit pass. Legacy warnings may take time to propagate to individual protection checks.

## Gridinsoft review summary

According to Gridinsoft's analyst and support, inspected material included the public catalog, About/advertising disclosures, interface, and selected catalog, proof and sponsorship scripts. The reviewer stated that no specific malicious payload was found in that scoped material. They attributed the earlier warning to recent registration rather than separately demonstrated harmful behavior.

**Explicitly outside the review:** token valuations, liquidity, redemption feasibility, sponsored projects, all contracts, wallet connections, transactions, and private infrastructure.

Full bounded report: [GRIDINSOFT_REVIEW.md](GRIDINSOFT_REVIEW.md).

## Reading reputation scores correctly

A score of 68/100 is **not** equivalent to “68% secure.” Scores can incorporate domain age, reputation history and other signals. The finding can change after later checks. Use the [live provider report](https://gridinsoft.com/online-virus-scanner/url/protocolvalue-com) for the current rating, and this file for historical reporting.

## Corrections

If a documentation claim is inaccurate or a proof link no longer reproduces a displayed value, open an issue describing the exact page, asset, block, expected value and observed result. For vulnerability reports, use [SECURITY.md](SECURITY.md) rather than a public issue.
