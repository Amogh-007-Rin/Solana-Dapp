# Root-Chain Local Running Instructions (Windows)

This guide starts all parts of the project locally in the correct order:

1. Solana Program (Anchor)
2. AI Engine (FastAPI)
3. Secondary Backend (Node/Express)
4. Web App (Next.js)
5. Mobile App (Expo)

It is written for Windows PowerShell.

---

## 1) Prerequisites (Install Once)

Install these tools before starting:

1. Node.js 20+ and npm
2. Python 3.10+
3. Rust (stable)
4. Solana CLI
5. Anchor CLI (0.30.x)
6. Expo Go app on phone (for mobile testing)

Quick version checks:

```powershell
node -v
npm -v
python --version
rustc --version
solana --version
anchor --version
```

---

## 2) Open Terminals

Open 5 PowerShell terminals from project root:

1. Program terminal
2. AI terminal
3. Secondary backend terminal
4. Web terminal
5. Mobile terminal

Project root:

```powershell
Set-Location "c:\Users\amogh\OneDrive\Documents\Hackthon-Projects\Solana-Dapp"
```

---

## 3) Configure Solana + Wallet (One-Time / As Needed)

This project is configured for Devnet.

```powershell
solana config set --url https://api.devnet.solana.com
solana config get
```

If you do not have a keypair yet:

```powershell
solana-keygen new
```

Fund your wallet on Devnet (required for deploy and transactions):

```powershell
solana airdrop 2
solana balance
```

---

## 4) Environment Files Setup

Do this once before first run.

### 4.1 AI Engine env

```powershell
Set-Location ..\ai-engine
Copy-Item .env.example .env -Force
```

Edit `.env` and set:

- ORACLE_PRIVATE_KEY=... (required, hex string)

### 4.2 Secondary Backend env

```powershell
Set-Location ..\sb-server
Copy-Item .env.example .env -Force
```

Default is:

- PORT=7001

### 4.3 Web env

```powershell
Set-Location ..\sol-dapp-web
Copy-Item .env.example .env.local -Force
```

Verify/edit `.env.local`:

- NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
- NEXT_PUBLIC_AI_ENGINE_URL=http://127.0.0.1:8000
- NEXT_PUBLIC_SB_SERVER_URL=http://127.0.0.1:7001
- NEXT_PUBLIC_PROGRAM_ID=8qJjY3qeJc9cTGw3GRW7xVfN32B2j3YkM3p6N5cm6QkM
- NEXT_PUBLIC_CO2_MINT=<your_token_2022_mint_address>
- NEXT_PUBLIC_SATELLITE_PROVIDER_KEY=demo-key

### 4.4 Mobile env

```powershell
Set-Location ..\sol-dapp-app
Copy-Item .env.example .env -Force
```

Verify/edit `.env`:

- EXPO_PUBLIC_PROGRAM_ID=8qJjY3qeJc9cTGw3GRW7xVfN32B2j3YkM3p6N5cm6QkM
- EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

Return to root when done:

```powershell
Set-Location ..
```

---

## 5) Start Services Sequentially

## Step A: Build/Check Solana Program

In Program terminal:

```powershell
Set-Location "c:\Users\amogh\OneDrive\Documents\Hackthon-Projects\Solana-Dapp\sol-program"
cargo check
anchor build
```

If you want to deploy to Devnet:

```powershell
anchor deploy --provider.cluster Devnet
```

After deploy, update program id in:

- sol-dapp-web/.env.local
- sol-dapp-app/.env

Note: `deploy.sh` is a bash script. On Windows use Git Bash/WSL to run it, or update env files manually in PowerShell.

## Step B: Start AI Engine

In AI terminal:

```powershell
Set-Location "c:\Users\amogh\OneDrive\Documents\Hackthon-Projects\Solana-Dapp\ai-engine"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Expected:

- AI service running at http://127.0.0.1:8000

## Step C: Start Secondary Backend

In Secondary backend terminal:

```powershell
Set-Location "c:\Users\amogh\OneDrive\Documents\Hackthon-Projects\Solana-Dapp\sb-server"
npm install
npm run dev
```

Expected:

- Server running at http://127.0.0.1:7001

## Step D: Start Web App

In Web terminal:

```powershell
Set-Location "c:\Users\amogh\OneDrive\Documents\Hackthon-Projects\Solana-Dapp\sol-dapp-web"
npm install
npm run dev
```

Expected:

- Web app at http://localhost:3000

## Step E: Start Mobile App

In Mobile terminal:

```powershell
Set-Location "c:\Users\amogh\OneDrive\Documents\Hackthon-Projects\Solana-Dapp\sol-dapp-app"
npm install
npm run start
```

Then:

1. Scan the Expo QR code with Expo Go.
2. Connect supported Solana mobile wallet.

---

## 6) Health Check Endpoints

After all services are running, verify these in browser (or curl):

1. AI Engine
	- http://127.0.0.1:8000/
2. Secondary Backend
	- http://127.0.0.1:7001/server/health
	- http://127.0.0.1:7001/metrics/global-offset
3. Web API status
	- http://localhost:3000/api/status
4. Web health proxy
	- http://localhost:3000/api/health

---

## 7) Functional Run Order (Demo Flow)

Use this flow in the web app:

1. Connect wallet.
2. Register farm.
3. Claim/mint credits (calls AI + submits on-chain tx).
4. Retire credits.
5. Confirm secondary backend metrics/events update.

---

## 8) Common Errors and Fixes

1. "CO2 mint not configured"
	- Set NEXT_PUBLIC_CO2_MINT in sol-dapp-web/.env.local.

2. AI request fails / 500 error
	- Ensure ORACLE_PRIVATE_KEY exists in ai-engine/.env.
	- Restart AI service after env changes.

3. Wallet transaction rejected
	- Confirm Devnet SOL balance with `solana balance`.
	- Confirm wallet network is Devnet.

4. Program mismatch
	- Ensure deployed program id equals NEXT_PUBLIC_PROGRAM_ID and EXPO_PUBLIC_PROGRAM_ID.

5. Port conflicts
	- AI should use 8000.
	- SB server should use 7001.
	- Web should use 3000.

---

## 9) Stop All Services

Press Ctrl + C in each terminal:

1. Mobile terminal
2. Web terminal
3. Secondary backend terminal
4. AI terminal
5. Program terminal (if running watch/test)

---

## 10) Quick Restart (After First Setup)

1. Start AI: `uvicorn app:app --reload --host 127.0.0.1 --port 8000`
2. Start SB: `npm run dev`
3. Start Web: `npm run dev`
4. Start Mobile: `npm run start`

Program rebuild is only required when program code changes.
