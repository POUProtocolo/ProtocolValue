# Reproducing on-chain evidence

This guide describes how a technically proficient reader can audit **a specific displayed observation**. It does not assert that every field is present for every catalog entry.

## Evidence checklist

Capture the following before starting:

| Field | Why it matters |
| --- | --- |
| Asset/protocol name | Human-readable identification only; not sufficient proof |
| Chain name and chain ID | Prevents cross-chain confusion |
| Source contract address | Identifies on-chain source at the observation block |
| Token address, if different | Distinguishes represented token from computation contract |
| Proxy implementation, if relevant | Identifies code actually executed at that block |
| ABI signature / function selector | Avoids calling the wrong method or overload |
| Inputs and call-data encoding | Enables exact reproduction |
| Block number, preferably block hash | Fixes the chain state and assists reorg detection |
| Raw return value | Preserves original integer / bytes result |
| Decimals and scaling | Allows unambiguous display conversion |
| Denomination and arithmetic | Explains the interpretation of the figure |
| Timestamp and status | Separates observation time, block time, live and snapshot states |
| Any external feed or intermediate contract | Identifies additional dependencies |

## Recommended workflow

**Step 1 — Locate primary evidence.** Open the ProtocolValue asset view and follow source contract, evidence block and documentation references if supplied. Confirm that source links point to the correct network.

**Step 2 — Confirm chain state.** Read the block and, if possible, its hash. A block can be reorganized, particularly near the chain head. For historical comparisons, use a sufficiently settled block and retain the block hash.

**Step 3 — Inspect the contract.** Review verified source or deployed bytecode, ABI, proxy pattern and the exact function. A recognizable method name by itself is insufficient to establish intended semantics.

**Step 4 — Reproduce the call.** Execute the exact read-only method with identical inputs at the identified block (using `eth_call` or a read-contract explorer). Check whether the endpoint supports historical state at that block.

**Step 5 — Decode units.** Recreate any fixed-point conversion and token decimals. Document intermediate values and any rounding. For an external oracle or reserve calculation, reproduce each dependency at the same block when possible.

**Step 6 — Compare.** Explain discrepancies due to mismatched blocks, different RPC state, rounding, source upgrades, stale evidence or incorrect ABI/denomination.

**Step 7 — Interpret carefully.** A reproduced on-chain value proves that the specified method returned that value **under the captured conditions**. It does not prove liquidity, collateral quality, withdrawals, or market execution.

## Generic read-only example

This is a **pattern**, not a ready-made call for an asset. Fill in contract ABI, method name and chain-specific RPC from independently verified sources.

```js
// Illustrative ethers.js v6 pseudocode; do not place secrets in the frontend.
const provider = new ethers.JsonRpcProvider(RPC_URL);
const chainId = (await provider.getNetwork()).chainId;
if (chainId !== EXPECTED_CHAIN_ID) throw new Error('Wrong network');
const block = await provider.getBlock(BLOCK_NUMBER);
if (!block) throw new Error('Unknown block');
const contract = new ethers.Contract(CONTRACT_ADDRESS, VERIFIED_READ_ABI, provider);
const raw = await contract[VERIFIED_FUNCTION](...VERIFIED_ARGS, { blockTag: BLOCK_NUMBER });
// Decode raw using the method's documented output type and correct decimals.
// Store block.number + block.hash + raw + ABI reference as evidence.
```

**Do not copy the example directly into production:** `RPC_URL`, `EXPECTED_CHAIN_ID`, `BLOCK_NUMBER`, `CONTRACT_ADDRESS`, `VERIFIED_READ_ABI`, `VERIFIED_FUNCTION` and `VERIFIED_ARGS` must be resolved for a particular record. Some ethers.js methods, proxies and historical nodes require variant handling.

## What a proof link can and cannot show

A block hash or block explorer link anchors an observation to blockchain history. The link **does not certify** that a protocol's reserve definition is economically sound, that a website's code is complete, or that an exchange will execute a trade at the reference value.

See [METHODOLOGY.md](METHODOLOGY.md) and [docs/PROTOCOL_ENTRY_TEMPLATE.md](docs/PROTOCOL_ENTRY_TEMPLATE.md).
