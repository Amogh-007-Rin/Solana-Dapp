Project Title: Root-Chain
Tagline: The Solana-Powered Protocol for Verified, High-Liquidity Carbon Sequestration.

1. Vision Statement
To create a frictionless, transparent bridge between the physical act of carbon sequestration and global capital markets. By leveraging Solana’s speed and Digital Monitoring, Reporting, and Verification (dMRV), we enable farmers to monetize their environmental impact in real-time while providing corporations and the public with "proof-of-burn" offset certificates that are mathematically immune to fraud.

2. Core Project Pillars
A. The "Proof-of-Soil" (dMRV)
Instead of relying on human auditors who visit once a year, the project uses a Digital Oracle system.

Satellite Integration: Uses NDVI (Normalized Difference Vegetation Index) data to monitor biomass growth.
IoT Sensors: Ground sensors measure soil organic carbon (SOC) levels.
On-Chain Validation: Credits are only minted when these external data points meet a specific cryptographic threshold.
B. The Solana Token Architecture
The project uses the SPL Token Program with custom Anchor logic:

The Mint: A central Program-Derived Address (PDA) acts as the "Mint Authority."
Carbon Coins ($CO2): Semi-fungible tokens. Each batch of tokens is metadata-linked to a specific GPS coordinate and "Vintage" (the year the carbon was captured).
The Burn Protocol: To "offset" carbon, a user must call a specific instruction that permanently destroys the token and records the event on the ledger.
C. The Three-Sided Marketplace
StakeholderThe "Hook"The Platform ActionFarmersFinancial IncentiveRegisters land, receives $CO2 coins automatically based on growth.CompaniesESG CompliancePurchases large $CO2 liquidity pools to retire for sustainability reports.PublicMicro-OffsetsBuys fractional credits (e.g., 0.01 $CO2) to offset daily activities via a mobile app.
Export to Sheets


3. The Final Technical Workflow
Registration: Farmer uses the TerraNode dApp to sign a transaction with their Solana wallet, defining their farm's perimeter (GeoJSON).
Verification: An off-chain worker (the Oracle) fetches satellite data for that perimeter. If X amount of carbon sequestration is detected, it generates a "Mint Instruction."
Issuance: The Solana program mints CO2 coins directly into the farmer's wallet.
Trading: The farmer lists CO2 on the TerraNode DEX (Decentralized Exchange).
Consumption: A buyer (Company/Public) buys CO2 and clicks "Retire." * Backend Action: The tokens are burned.


Output: An on-chain "Certificate of Impact" is generated as a non-transferable NFT.
4. Key Improvements (The "Evolution")
Based on our conversations, we have shifted from a "general exchange" to these specific innovations:

Switch to Solana: Moved from high-fee chains to Solana to allow for Micro-Transactions (letting the public buy 50 cents of carbon).
Hyper-Local Focus: Priority on local farmers and public users, creating a community-centric ecosystem rather than just a corporate tool.
Automated Retirement: Unlike traditional markets where "retiring" a credit is a manual paperwork process, here it is a single-click blockchain transaction.


5. Success Metrics (KPIs)
Total Carbon Locked: Measured in metric tons of CO2
​ represented on-chain.
Farmer Revenue: The percentage of the credit price that reaches the farmer (Target: >90%).
Network Velocity: How quickly credits are minted, traded, and retired.



**TECHNICAL APPLICATION USER ON-BOARDING**
________________________________________________________________
|Phase	      |          Action	      |      Solana Component |
|_____________________________________________________________|  
|Onboarding	  | Farmer mints a cNFT   |                       |
|             | (GeoJSON in metadata).|	State Compression     |
|             | representing          | (Bubblegum)           |
|             | their land boundary   |                       |
|             |                       |                       |
|             |                       |                       |
|Verification | Oracle (e.g., Pyth or | Anchor Program        |
|             | custom sidecar)       | Data Account          |
|             | pushes Satellite/IoT  |                       |
|             | data to a PDA.        |                       |
|             |                       |                       |
|             |                       |                       |
|             |                       |                       |
|Yield        |Oracle (e.g., Pyth or  | Anchor Program Data   |
|             |or custom sidecar)     | Account               |
|             |pushes Satellite/IoT   |                       |
|             |data to a PDA.         |                       |
|             |                       |                       |
|             |                       |                       |
|Retirement   |User "Burns" $CO2;     |                       |
|             |Program issues a       |Token22 Burn + Metadata|
|             |Soulbound NFT          | Pointer               |
|             |"Impact Certificate."  |                       |
|             |                       |                       |
_______________________________________________________________