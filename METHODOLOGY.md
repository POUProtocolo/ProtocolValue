# ProtocolValue methodology

ProtocolValue focuses exclusively on **protocol-defined internal on-chain value per token/share/unit**, not exchange prices, token capitalization, or a promise that a holder can redeem that value.

## Eligibility

1. Contract and network must be identifiable and accessible via public blockchain infrastructure.
2. An internal value per defined token/cota/share must be verifiably read or deterministically calculated from contract state at a reproducible block.
3. The evidence must document address, chain ID, block number or hash, relevant source methods and arguments, raw values, integer precision/decimals, formulas, rounding, and final unit.
4. If a proxy is used, document the implementation and the mechanism used to identify it at the observation block.
5. Record limitations and validation state; *PENDING_VALIDATION* research is not equivalent to full approval.
6. Do not publish lifecycle states EOL, DEPRECATED, or SUNSET_ISOLATED_POOL to the public catalog or its distributed JSON index.

An available market quote does not disqualify the protocol; the quote is not ProtocolValue's subject. Do not claim absent aggregator coverage without checking it specifically.

## Data provenance

The active site displays current-block contract reads when supported and otherwise discloses snapshots as such. An archived JSON record does not by itself prove that an RPC call succeeded independently. Follow the verification steps in [DATA_VERIFICATION.md](DATA_VERIFICATION.md).

A displayed internal value does not establish liquidity, withdrawability, solvency, or security of a protocol.
