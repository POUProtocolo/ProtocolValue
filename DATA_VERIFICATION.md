# Independent data verification

**🇺🇸 English** | [🇧🇷 Português (Brasil)](DATA_VERIFICATION.pt-BR.md)


To reproduce one displayed protocol-native value:

1. Identify chain ID, token/share contract, underlying token, and proxy/implementation where relevant.
2. Pin the exact block number/hash. Do **not** mix values from different blocks.
3. Document every `eth_call`: `to`, ABI/function signature, calldata, block parameter, raw hexadecimal output, and decoded integer value.
4. Read the relevant token/share/underlying `decimals` at the same block, recording source and value.
5. Recalculate the internal value with integer-safe arithmetic and documented rounding. Compare the result to the displayed value and record the units.
6. Confirm the observation is eligible and its lifecycle has not been excluded from public distribution.

This repository includes three **archived site-exported examples** under `docs/evidence/`. Those files are **not** independently re-fetched and must not be described as independent verification. Inspect their `approval`, `block`, `callData`, and `valuation` fields before citing them. A verifier should fail closed if required fields are unavailable; do not substitute hypothetical RPC responses.

Raw contract data and the computed internal value can be independently compared against public RPC endpoints or block explorers. Smart contract auditing and withdrawal testing are distinct workstreams.
