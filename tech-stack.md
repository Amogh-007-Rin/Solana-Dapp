**PROJECT REPO STRUCTURE**
    SOL-DAPP-WEB: 
        -Folder containing Next.js as a fullstack frame-work.
    SB-SERVER:
        - secondary backend folder containing a node.js backend used for data-catching and other oxillary services like websocket integration. 
    SOL-DAPP-APP: 
        - Mobile application build on React-Native Expo as the hybrid framework.
    SOL-PROGRAM:
        - Folder containing RUST + ANCHER code to write solana programs 
    AI-ENGINE:
        - Folder containing actual AI-MODEL used to calculate the carbon biomass of the registered        agriculturist and many more related functions to create a mint instruction. The model will be deliverd by a fastApi backend endpoint to hit and retrive the response need for the mint. 
        
**Additional Tech-stack Refinement**

| Component | Choice | Rationale |
|---|---|---|
| Solana Program | Anchor 0.30+ | The industry standard for Rust-based Solana development, ensuring type-safe and secure smart contracts. |
| Token Logic | Token-2022 (Extensions) | Utilizes Transfer Hooks for "Automatic Retirement" and Metadata Pointers for immutable on-chain proof. |
| State Management | ZK Compression | Powered by Light Protocol. Drastically reduces costs for minting millions of micro-credits for small-scale farms. |
| AI Integration | FastAPI + Pyth Relay | Python-based biomass modeling with an Oracle-style push to the Solana program for automated credit valuation. |
| Web Frontend | Next.js 15 + Shadcn | High-performance, Server Components-ready UI using Tailwind CSS for a professional enterprise aesthetic. |
| Mobile App | Expo + SMS | Enables "on-the-farm" registration and secure transaction signing via Phantom/Solflare using the Solana Mobile Stack. |
| Auxiliary Backend | Node.js + Helius | Uses Helius Webhooks to "listen" for on-chain burn events, triggering real-time UI updates via WebSockets. |