export interface OraclePayload {
  amount_carbon: number;
  slot_number: number;
  oracle_pubkey: string;
  signature_hex: string;
  message_hex: string;
  ndvi_previous: number;
  ndvi_current: number;
}

interface CalculateInput {
  farmPda: string;
  lat: number;
  lng: number;
  slotNumber?: number;
}

export async function fetchCarbonOracleData(input: CalculateInput): Promise<OraclePayload> {
  const response = await fetch("/api/oracle/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      farm_pda: input.farmPda,
      coordinates: { lat: input.lat, lng: input.lng },
      satellite_provider_api_key: process.env.NEXT_PUBLIC_SATELLITE_PROVIDER_KEY ?? "demo-key",
      slot_number: input.slotNumber ?? 0,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI engine error (${response.status}): ${text}`);
  }

  return (await response.json()) as OraclePayload;
}
