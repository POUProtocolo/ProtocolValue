# Supported blockchain networks

**Status:** Documented network families visible in the ProtocolValue interface as of 2026-10-17.  
**Important:** Network inclusion is **not** a guarantee that every catalog entry is currently reachable or verified.

| Network | Chain ID (decimal) | Typical native currency | Explorer |
| --- | ---: | --- | --- |
| Ethereum Mainnet | `1` | ETH | https://etherscan.io/ |
| BNB Smart Chain | `56` | BNB | https://bscscan.com/ |
| OP Mainnet (Optimism) | `10` | ETH | https://optimistic.etherscan.io/ |
| Avalanche C-Chain | `43114` | AVAX | https://snowtrace.io/ |

The interface displayed catalog filters for these networks; catalog counts depend on the current dataset and may change without a documentation release.

## Network checks before interpreting a record

1. Verify `eth_chainId` against the expected network ID.
2. Verify the **contract address belongs to that chain**. Identical hex addresses can refer to different deployments on different chains.
3. Check deployed bytecode and proxy implementation where relevant.
4. Use a reliable RPC endpoint and capture its response block.
5. When comparing multiple reads, keep them at the **same block** whenever supported.
6. Prefer an independent second RPC source for critical reproductions.

## Scope limits

The presence of a network does not imply a partnership with its foundation, validator operators, wallet providers or block explorers. Availability and transaction finality differ by chain. Always use the block explorer appropriate to the **specific chain** before relying on an event or storage value.

For more, see [DATA_VERIFICATION.md](DATA_VERIFICATION.md).
