Project Execution Blueprint: TerraNode Protocol
1. Phase 1: The On-Chain Core (sol-program)

Goal: Build the "Truth Engine" using Anchor.

    [x] State Definition: Create a FarmAccount PDA (Program Derived Address) that stores:

        owner: Pubkey

        area_geojson: String/Hash

        last_mint_timestamp: i64

        total_carbon_sequestered: u64

    [x] The Mint Logic: Implement a mint_carbon_credits instruction.

        Security: It must require a signature from the ORACLE_PUBLIC_KEY (your AI Engine).

        Math: Calculate $CO2 tokens to issue based on the biomass delta provided by the Oracle.

    [x] The Burn Logic: Implement a retire_credits instruction.

        Uses Token-2022 to burn $CO2 tokens and emit a CarbonRetired event for the sb-server to index.

    [ ] IDL Export: Run anchor build and ensure the JSON IDL is generated for the frontend.

2. Phase 2: The Verified AI Oracle (ai-engine)

Goal: Python-based biomass calculation and cryptographic signing.

    [x] Endpoint /calculate (POST):

        Input: farm_pda, coordinates, satellite_provider_api_key.

        Logic: Use a mock biomass calculation (e.g., NDVI_current - NDVI_previous).

    [x] Cryptographic Signing:

        Use solana.keypair to sign a message containing: [farm_pda, carbon_amount, slot_number].

        Return the signature and carbon_amount as a JSON response.

    [x] FastAPI Wrapper: Ensure CORS is enabled so the sol-dapp-web can call it directly.

3. Phase 3: The Data Sync Layer (sb-server)

Goal: Fast data retrieval and WebSocket updates.

    [x] Helius Webhook Listener: - Create a POST route /webhooks/solana to receive real-time updates from the Solana cluster.

        Filter for Burn events or Mint events related to the TerraNode Program ID.

    [x] Caching Layer: - In-memory cache + JSON event ledger for "Global Carbon Locked" and retired totals.

    [x] WebSockets: Broadcast "New Carbon Retired!" messages to connected frontend clients for the "Live Feed" UI component.

4. Phase 4: The Web Command Center (sol-dapp-web)

Goal: Corporate dashboard and Public "Blink" interface.

    [x] Wallet Connection: Integrate @solana/wallet-adapter-react.

    [~] Farmer Dashboard:

        Fetch and display the farmer's FarmAccount data using the Anchor Provider.

        Call the /calculate AI endpoint and then trigger the mint_carbon_credits transaction.

    [x] The "Blink" Implementation:

        Create an API route /api/actions/offset following the Solana Actions spec.

        This allows anyone to buy/burn credits directly from a URL or Twitter.

5. Phase 5: The Mobile Field App (sol-dapp-app)

Goal: On-the-ground registration for farmers.

    [x] Mobile Wallet Integration: Use transact from the Solana Mobile Stack (SMS) to connect to Phantom/Solflare.

    [~] Geo-Location: Use Expo Location to capture the farmer's current coordinates and send them to the sol-program to initialize a new FarmAccount.

    [ ] Camera Integration: (Optional "Wow" factor) Take a photo of the land and upload the hash to the FarmAccount metadata as "Proof of Land."

🛠 Integration Specs for AI Coding

    Protocol: Solana Mainnet-Beta (for pitch) / Devnet (for demo).

    Token Standard: Token-2022 (Extensions).

    Program Framework: Anchor 0.30.

    Communication: * Web -> AI Engine (HTTP JSON)

        Web -> Solana Program (RPC/Transactions)

        Program -> SB-Server (Webhooks via Helius)

Starting Instructions: 

    Start with the Program: "Using the sol-program section of the execution.md, write the src/lib.rs for an Anchor program that handles Carbon Credit minting with an Oracle signature."

    Move to AI Engine: "Now, based on the ai-engine section, write a FastAPI app that signs the carbon data for the program we just wrote."

    Connect the Web: "Now, write a Next.js service that calls that AI engine and sends the resulting signature to the Solana Program."