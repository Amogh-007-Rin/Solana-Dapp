# pyright: reportMissingImports=false
import hashlib
import os
import random
from dataclasses import dataclass
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()


def _load_oracle_keypair() -> Any:
    from solders.keypair import Keypair  # type: ignore[import-not-found]

    private_key = os.getenv("ORACLE_PRIVATE_KEY", "").strip()
    if not private_key:
        raise RuntimeError("ORACLE_PRIVATE_KEY is missing in environment.")

    try:
        private_key_bytes = bytes.fromhex(private_key)
    except ValueError as exc:
        raise RuntimeError("ORACLE_PRIVATE_KEY must be a hex-encoded secret key.") from exc

    if len(private_key_bytes) not in (32, 64):
        raise RuntimeError("ORACLE_PRIVATE_KEY must decode to 32 or 64 bytes.")

    return Keypair.from_seed(private_key_bytes[:32])


app = FastAPI(title="Root-Chain AI Oracle", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    ORACLE_KEYPAIR = _load_oracle_keypair()
except RuntimeError:
    ORACLE_KEYPAIR = None


class Coordinates(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class CalculateRequest(BaseModel):
    farm_pda: str
    coordinates: Coordinates
    satellite_provider_api_key: str | None = None
    slot_number: int = Field(default=0, ge=0)


class VerifyBiomassRequest(BaseModel):
    wallet_address: str
    coordinates: Coordinates | None = None


class SignedOracleResponse(BaseModel):
    amount_carbon: int
    slot_number: int
    oracle_pubkey: str
    signature_hex: str
    message_hex: str
    ndvi_previous: float
    ndvi_current: float


@dataclass
class NdviWindow:
    previous: float
    current: float


def _validate_pubkey(key: str) -> Any:
    from solders.pubkey import Pubkey  # type: ignore[import-not-found]

    try:
        return Pubkey.from_string(key)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid Solana public key") from exc


def _mock_ndvi_for_coordinates(coords: Coordinates) -> NdviWindow:
    seed = f"{coords.lat:.6f}:{coords.lng:.6f}"
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    rng = random.Random(int.from_bytes(digest[:8], "little"))
    previous = round(rng.uniform(0.2, 0.65), 4)
    # simulate positive, flat, or slightly negative seasonal change
    current = round(max(0.0, min(1.0, previous + rng.uniform(-0.05, 0.18))), 4)
    return NdviWindow(previous=previous, current=current)


def _calculate_carbon_amount(ndvi: NdviWindow) -> int:
    delta = max(0.0, ndvi.current - ndvi.previous)
    return int(delta * 10_000)


def _build_oracle_message(pubkey: Any, amount: int, slot_number: int) -> bytes:
    return bytes(pubkey) + amount.to_bytes(8, "little") + slot_number.to_bytes(8, "little")


@app.get("/")
def read_root():
    return {
        "message": "ai-engine-is-active",
        "oracle_configured": ORACLE_KEYPAIR is not None,
    }


@app.post("/calculate", response_model=SignedOracleResponse)
def calculate(payload: CalculateRequest):
    farm_pubkey = _validate_pubkey(payload.farm_pda)
    ndvi = _mock_ndvi_for_coordinates(payload.coordinates)
    amount_carbon = _calculate_carbon_amount(ndvi)

    if amount_carbon <= 0:
        amount_carbon = 1

    if ORACLE_KEYPAIR is None:
        raise HTTPException(
            status_code=500,
            detail="AI oracle is not configured. Set ORACLE_PRIVATE_KEY in env.",
        )

    message = _build_oracle_message(farm_pubkey, amount_carbon, payload.slot_number)
    signature = ORACLE_KEYPAIR.sign_message(message)

    return SignedOracleResponse(
        amount_carbon=amount_carbon,
        slot_number=payload.slot_number,
        oracle_pubkey=str(ORACLE_KEYPAIR.pubkey()),
        signature_hex=bytes(signature).hex(),
        message_hex=message.hex(),
        ndvi_previous=ndvi.previous,
        ndvi_current=ndvi.current,
    )


@app.post("/verify-biomass", response_model=SignedOracleResponse)
def verify_biomass(payload: VerifyBiomassRequest):
    wallet_pubkey = _validate_pubkey(payload.wallet_address)
    coords = payload.coordinates or Coordinates(lat=12.9716, lng=77.5946)
    ndvi = _mock_ndvi_for_coordinates(coords)
    amount_carbon = _calculate_carbon_amount(ndvi)
    if amount_carbon <= 0:
        amount_carbon = 1

    if ORACLE_KEYPAIR is None:
        raise HTTPException(
            status_code=500,
            detail="AI oracle is not configured. Set ORACLE_PRIVATE_KEY in env.",
        )

    message = _build_oracle_message(wallet_pubkey, amount_carbon, 0)
    signature = ORACLE_KEYPAIR.sign_message(message)

    return SignedOracleResponse(
        amount_carbon=amount_carbon,
        slot_number=0,
        oracle_pubkey=str(ORACLE_KEYPAIR.pubkey()),
        signature_hex=bytes(signature).hex(),
        message_hex=message.hex(),
        ndvi_previous=ndvi.previous,
        ndvi_current=ndvi.current,
    )


