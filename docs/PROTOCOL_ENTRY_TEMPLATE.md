# Protocol observation / evidence template

Copy this template for a **single observation**. Use `not provided` where evidence is missing; never fabricate fields.

| Field | Value |
| --- | --- |
| Protocol / asset | `...` |
| Record URL | `...` |
| Chain / decimal chain ID | `...` |
| Value mechanism | `vault share / redemption / exchange rate / reference / other` |
| Source contract | `0x...` |
| Token address (if distinct) | `0x... / not applicable` |
| Proxy implementation at block | `0x... / not applicable / unknown` |
| Function signature / selector | `...` |
| Input arguments | `...` |
| Block number / hash | `...` |
| Observation time (UTC) | `...` |
| Live or pinned snapshot | `...` |
| Raw contract return | `...` |
| Decimals / fixed-point scaling | `...` |
| Intermediate dependencies | `...` |
| Calculation and rounding | `...` |
| Displayed figure and unit | `...` |
| Reproduction steps / explorer link | `...` |
| External feeds, if any | `...` |
| Known restrictions / assumptions | `...` |
| Verification result / reviewer / date | `...` |

## Interpretation checklist

- [ ] Exact chain and contract were checked.
- [ ] Code, ABI and proxy status were inspected.
- [ ] Function and inputs reproduce at the cited block.
- [ ] Units, decimals and rounding are explicit.
- [ ] Live-versus-snapshot status is accurate.
- [ ] Claim is **not** incorrectly described as a market price, liquid reserve, or withdrawal guarantee.
- [ ] Any sponsored association is disclosed separately from data verification.

## Reviewer note

A reproduced `eth_call` result is evidence about **a function output at a chain state**, not an independent audit of the protocol economics, oracle assumptions or real-world legal rights.
