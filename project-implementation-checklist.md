Phase 1: Environment & Anchor Program (sol-program)

Objective: Establish the "On-Chain Source of Truth."

    [x] Task 1.1: Initialize Anchor Project

        Prompt: "Initialize an Anchor 0.30 project. Set up Cargo.toml with anchor-lang, anchor-spl, and solana-program dependencies. Configure provider.cluster to Devnet."

    [x] Task 1.2: Define State & PDAs

        Prompt: "Create a FarmAccount struct. Include fields for owner: Pubkey, amount_carbon: u64, last_update: i64, and is_active: bool. Implement a seeds = [b'farm', owner.key()] PDA strategy."

    [x] Task 1.3: Oracle-Verified Mint Instruction

        Prompt: "Write a mint_carbon instruction. It must accept amount: u64 and signature: [u8; 64]. Use solana_program::ed25519_program to verify that the signature was signed by a hardcoded ORACLE_PUBKEY before minting SPL tokens to the user."

    [~] Task 1.4: Token-2022 Burn & Metadata

        Prompt: "Implement a retire_carbon instruction using Token-2022. When tokens are burned, emit an Anchor Event CarbonRetired containing the owner, amount, and timestamp."

Phase 2: The AI Oracle Backend (ai-engine)

Objective: Build the "Verification Gateway."

    [x] Task 2.1: FastAPI & Solana-Py Setup

        Prompt: "Create a FastAPI app. Install python-dotenv, solana, and solders. Set up a .env loader for the ORACLE_PRIVATE_KEY."

    [x] Task 2.2: Biomass Logic & Signing

        Prompt: "Create a /verify-biomass POST endpoint. It should take a wallet_address. Mock a biomass calculation. Then, use the ORACLE_PRIVATE_KEY to sign a message: [wallet_address + amount_carbon]. Return the amount and the hex signature."

    [x] Task 2.3: Satellite Mock Data

        Prompt: "Add a utility function that simulates fetching NDVI (Normalized Difference Vegetation Index) data for a given set of coordinates to justify the carbon amount."

Phase 3: Secondary Backend & Event Indexer (sb-server)

Objective: Handle the "Heavy Lifting" off-chain.

    [x] Task 3.1: Express/TypeScript Setup

        Prompt: "Initialize a Node.js project with TypeScript. Set up an Express server and install @solana/web3.js and @coral-xyz/anchor."

    [x] Task 3.2: Helius Webhook Listener

        Prompt: "Create a /webhooks/solana POST route. Write logic to parse incoming transactions. If a CarbonRetired event is detected, log it to a local JSON file (acting as a database) and track 'Global Carbon Offset'."

    [x] Task 3.3: Live WebSocket Feed

        Prompt: "Integrate socket.io. When the webhook receives a new burn event, emit a NEW_OFFSET event to all connected frontend clients."

Phase 4: Web Command Center (sol-dapp-web)

Objective: User Interface & "Blinks" for global access.

    [x] Task 4.1: Wallet Adapter & UI Layout

        Prompt: "Set up Next.js 15 with @solana/wallet-adapter-react. Create a dashboard layout using Tailwind CSS and Shadcn UI 'Card' components."

    [~] Task 4.2: The Minting Flow

        Prompt: "Build a 'Claim Credits' button. It should: 1. Fetch the signature from the ai-engine. 2. Send an Anchor transaction to sol-program using the signature. 3. Show a toast notification on success."

    [x] Task 4.3: Solana Actions (Blinks)

        Prompt: "Create an api/actions/retire/route.ts. Implement the Solana Actions spec so users can retire carbon credits via a URL. Return a POST response with the transaction for the user to sign."

Phase 5: Mobile Application (sol-dapp-app)

Objective: "In the Field" farmer tools.

    [x] Task 5.1: Expo & SMS Configuration

        Prompt: "Configure Expo to use @solana-mobile/mobile-wallet-adapter-protocol. Setup a 'Connect Wallet' button that triggers the Phantom mobile app."

    [~] Task 5.2: GPS Registration

        Prompt: "Use expo-location to get current coordinates. Create a 'Register Farm' screen that sends these coordinates to the sol-program to initialize a new FarmAccount."

Phase 6: Production Polish & Deployment

Objective: Final UX and stability.

    [x] Task 6.1: Error Handling & Loading States

        Prompt: "Add global error boundaries to the web app. Ensure all transaction buttons show a loading spinner while the signature is being processed."

    [x] Task 6.2: README & Documentation

        Prompt: "Write a comprehensive README.md. Include a architecture diagram, instructions to run all 5 folders locally, and a 'How it Works' section for the judges."

    [x] Task 6.3: Deployment Script

Legend:
- [x] Complete and implemented in code.
- [~] Partially complete: scaffolded/placeholder implementation exists, final on-chain wiring still needed.

        Prompt: "Create a deploy.sh script that builds the Anchor program, deploys to Devnet, and updates the Program ID across the web, app, and ai-engine folders."