# Methodology: understanding protocol-native values

**Status:** Documentation v1.0 · 2026-10-18  
**Purpose:** Explain how ProtocolValue categorizes and presents contract-defined metrics, and how to interpret their limitations.

## 1. Principle: evidence before labels

ProtocolValue is designed around **protocol-specific values**. It distinguishes a value computed or returned according to smart-contract rules from a price established through trading on a secondary market.

A reader should always be able to ask:

- **Which blockchain** and **which contract** supplied the metric?
- **Which function or formula** was applied, with what inputs and units?
- **At which block** and **when** was the observation recorded?
- Was the result **read live** or obtained from a **previously pinned snapshot**?
- What assumptions, access restrictions, fees, freezes, or external dependencies affect its practical interpretation?

The answer to each question is **per asset and per observation**, not a platform-wide invariant.

## 2. Mechanism families

These are **interpretive categories**, not universal executable formulas.

### 2.1 Vault share value

A vault may define a share-to-asset conversion (for example, an ERC-4626-style `convertToAssets(shares)` function). The output can describe an **accounting conversion** at the specified block.

**Verification:** record share amount, share decimals, underlying-asset decimals, contract address, function and block. Check withdrawal fees, limits, queueing and whether the vault is upgradeable. A conversion quote does not itself establish immediate redeemability or external market price.

### 2.2 Redemption / conversion

A protocol may expose a rate or quote that describes how many units **could be obtained** when exchanging or redeeming under contract rules. The label must preserve relevant inputs, availability conditions, fees and unit conversions.

**Verification:** distinguish `view` quotations from executed withdrawals; check eligibility, pauses, ceilings, redemption liquidity and whether state-dependent outcomes differ from quotations.

### 2.3 Protocol exchange rate

An internal exchange rate may link receipt tokens, accounting units, debt units, wrapped assets or other protocol-defined quantities.

**Verification:** identify the exact units represented by numerator and denominator, scaling factors, accrual rules, timestamps and the function producing the rate. Do not treat a unit-conversion ratio as a DEX quote.

### 2.4 Protocol reference value

A protocol may explicitly publish a reference metric calculated from a rule in its contract. There is **no single universal reference-value equation** across all protocols.

**Illustrative case only:** a contract may calculate an internal value by dividing an eligible reserve measure by a designated supply measure, applying fixed-point scaling. The inclusion or exclusion of escrowed, quarantined, burned or otherwise restricted supply depends on that contract's rules.

For a POU-related illustration visible in the platform interface, a named method is `referencePriceIncludingQuarantineWad()`. Its label indicates a contract-specific calculation; reproducing it requires reading the **actual deployed contract code**, method outputs, reserve eligibility rules, supply inputs, and WAD scaling at a common block. No general claim of reserve sufficiency or withdrawal guarantees follows from this method name.

## 3. Internal capitalization is not market capitalization

Where shown, **indicative internal capitalization** may be computed as:

`internal reference value per token × identified token supply`

This multiplication has meaning only if the **same block** is used, units and decimals are aligned, and the supply definition is disclosed. It is **not automatically** free-float market capitalization, liquid reserves, audited NAV, or realizable proceeds.

## 4. Denomination and decimal handling

A value displayed as `USDT` means it has been **expressed in that denomination according to the documented mechanism**. It does not mean every protocol directly holds USDT or that the quote is executable at a 1:1 conversion to dollars.

- ERC-20 token decimals can differ (for example, 6 and 18); do not hard-code one scale for all instruments.
- Fixed-point representations, such as `1e18` WAD, require explicit decoding.
- Rounding may differ between Solidity functions, SDKs and UI formatting.
- Oracle-derived conversions and third-party pricing inputs, if any, must be identified separately from native contract arithmetic.

## 5. Live observations and snapshots

**Live on-chain:** a read attributed to a currently selected chain block at the time of the observation. A browser may show the time since the last completed read; repeated refreshes may yield different blocks.

**Snapshot:** a retained observation of a prior block. A snapshot can be reproducible when sufficient provenance exists, but it **must not be presented as a current quote**.

A live-read label does not eliminate RPC failures, chain reorganizations, contract upgrades, inaccurate underlying assumptions, or execution costs.

## 6. Verification and chain-consistency requirements

To reproduce a value reliably, use the same network and **block identifier** for dependent reads. Where necessary, obtain the implementation address of a proxy **as of that block**. Record exact call data and both raw and human-readable units. Cross-check the transaction-free `eth_call` result with a second independent node when available.

See [DATA_VERIFICATION.md](DATA_VERIFICATION.md) for the step-by-step checklist.

## 7. Explicit exclusions

A ProtocolValue reference figure is **not, by itself**:

- a promise of guaranteed redemption or settlement;
- proof that withdrawals are currently enabled;
- proof that reserve assets are unencumbered or liquid;
- an independent audit of a contract, treasury or issuer;
- a market trading price or investment recommendation.

## 8. Change management

Protocol-specific rules can evolve. Any record with materially changed contract implementation, method, scaling or reserve definition should identify the block from which the change applies and preserve historical evidence as applicable. Correction requests are described in [CONTRIBUTING.md](CONTRIBUTING.md).
