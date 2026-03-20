import { NextResponse } from "next/server";

interface ServiceStatus {
  name: string;
  ok: boolean;
  detail: string;
}

export async function GET() {
  const aiUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? "http://127.0.0.1:8000";
  const sbUrl = process.env.NEXT_PUBLIC_SB_SERVER_URL ?? "http://127.0.0.1:7001";

  const services: ServiceStatus[] = [];

  services.push(await checkService("web-api", "ok", async () => true));
  services.push(
    await checkService("ai-engine", `${aiUrl}/`, async () => {
      const response = await fetch(`${aiUrl}/`, { cache: "no-store" });
      return response.ok;
    }),
  );
  services.push(
    await checkService("sb-server", `${sbUrl}/server/health`, async () => {
      const response = await fetch(`${sbUrl}/server/health`, { cache: "no-store" });
      return response.ok;
    }),
  );

  return NextResponse.json({
    timestamp: Date.now(),
    services,
  });
}

async function checkService(name: string, detail: string, probe: () => Promise<boolean>): Promise<ServiceStatus> {
  try {
    const ok = await probe();
    return { name, ok, detail };
  } catch {
    return { name, ok: false, detail };
  }
}
