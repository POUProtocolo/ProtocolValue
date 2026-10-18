# Research observations — source exports, not third-party audit

Three example JSON records were copied without substantive changes from the user-provided ProtocolValue site package dated 18 October 2026. They illustrate the fields used in a protocol observation and preserve their original approval/status labels. **The records have not been independently replayed against an RPC endpoint in the preparation of this package.**

Examples: `morpho_1_79fd6400.json`, `morpho_1_888883f0.json`, `morpho_1_a0804346.json`. In particular, `PENDING_VALIDATION` is not an approved public listing.

To treat any as a *reproducible* proof, verify block reference, `eth_call` raw return, proxy implementation, decimals and arithmetic against a public archival RPC. See `../../DATA_VERIFICATION.md`.
