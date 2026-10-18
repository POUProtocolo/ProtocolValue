ProtocolValue
Protocol-native values, directly on-chain.
Explore ProtocolValue · Methodology · Verify data · Security · Transparency
ProtocolValue is an independent blockchain-data interface for inspecting smart-contract-native reference values, the methods behind them, and evidence that can be checked against public blockchain records. It is intended to make protocol-defined figures easier to inspect—not to represent those figures as exchange prices.
> **Critical distinction:** A protocol reference value, vault share conversion, redemption quotation, or indicative internal capitalization is **not necessarily a tradable market price**, an independently appraised value, a guarantee of redemption, or proof of available liquidity.
What the platform provides
A searchable catalog of protocol-defined value mechanisms and the contracts associated with them.
A distinction between live on-chain readings and pinned historical snapshots.
Evidence fields such as network, contract, method or selector, block number, data timestamp, and, where available, verifiable source links.
Documentation of the meaning and limitations of the values shown.
The catalog's assets, figures, network coverage, and availability can change. Use the website for current observations; do not treat historical screenshots or repository text as a live price feed.
Supported network families
The interface has displayed entries associated with Ethereum, BNB Smart Chain, Optimism, and Avalanche. Network availability is subject to current catalog support and RPC connectivity. See SUPPORTED_NETWORKS.md.
Value mechanisms
Protocols may expose different types of metrics. A displayed figure must be interpreted according to its contract-specific method, not just a common unit such as USDT.
Mechanism	What it may represent	What it does not prove
Vault share value	Assets corresponding to a vault share, using an identified conversion method	Ability to withdraw instantly at that value
Redemption / conversion	A contract-defined quote or conversion rate under specified conditions	Unrestricted or guaranteed redemption
Protocol exchange rate	Internal accounting conversion between units or assets	A secondary-market execution price
Protocol reference value	A reference metric defined by the protocol's contract rules	Market value, NAV, or a binding bid
See METHODOLOGY.md and the glossary.
How to verify a record
Open an asset record on ProtocolValue.
Identify the network, contract address, method, input arguments, asset denomination, and block used.
Reproduce the read using the same blockchain state and correct token decimals.
Compare the result with the displayed value and note whether it was a live read or a stored snapshot.
Inspect any contract-specific assumptions before drawing financial conclusions.
The detailed workflow and an evidence checklist are in DATA_VERIFICATION.md. A reusable evidence template is in docs/PROTOCOL_ENTRY_TEMPLATE.md.
Transparency and security
Security reporting policy
Transparency and scope of independent reviews
Gridinsoft review record — October 18, 2026
Documentation change history
Contributing documentation corrections
Repository scope (v1.0): documentation and publicly attributable review records. Publication of these documents does not imply that the production website's complete source code, private infrastructure, or smart contracts have been open-sourced or audited.
Independence and disclosures
Advertising or sponsorship should be identified separately from technical evidence. Listing, featuring, or sponsoring a protocol is not an endorsement of its token, its market liquidity, its smart contracts, or its economics. Review the website's current advertising disclosures for placement terms.
Notices
This repository is for technical information and traceability, not financial, legal, or investment advice. Blockchain data may be incomplete, delayed, stale, unavailable, or affected by chain reorganizations. Contract methods can change behavior through upgrades or dependencies. Confirm primary sources before relying on any figure.
Website: https://protocolvalue.com/  
GitHub: https://github.com/POUProtocolo/ProtocolValue
No open-source software license has been granted by this repository at this time. Refer to CONTRIBUTING.md for contribution expectations.
