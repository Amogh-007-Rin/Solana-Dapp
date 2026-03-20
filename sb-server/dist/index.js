import express from "express";
import "dotenv/config";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { promises as fs } from "fs";
import path from "path";
const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
    cors: {
        origin: "*",
    },
});
const port = Number(process.env.PORT ?? 7001);
const dataDir = path.resolve(process.cwd(), "data");
const ledgerFile = path.join(dataDir, "offset-events.json");
const globalCache = {
    totalCarbonLocked: 0,
    totalCarbonRetired: 0,
    totalEvents: 0,
};
app.use(express.json({ limit: "1mb" }));
io.on("connection", (socket) => {
    socket.emit("CACHE_SNAPSHOT", globalCache);
});
app.get("/server/health", function (_req, res) {
    res.status(200).json({
        message: "Server is up and running",
        cache: globalCache,
    });
});
app.get("/metrics/global-offset", function (_req, res) {
    res.status(200).json(globalCache);
});
app.post("/webhooks/solana", async function (req, res) {
    const payload = req.body;
    const events = Array.isArray(payload) ? payload : [payload];
    const ledgerUpdates = [];
    for (const tx of events) {
        const anchorEvents = tx.events?.anchor ?? [];
        for (const anchorEvent of anchorEvents) {
            const eventName = anchorEvent.eventName ?? "";
            const amount = Number(anchorEvent.data?.amount ?? 0);
            const owner = anchorEvent.data?.owner ?? "UNKNOWN";
            const timestamp = Number(anchorEvent.data?.timestamp ?? Date.now());
            const signature = tx.signature ?? `unknown-${Date.now()}-${Math.random()}`;
            if (eventName === "CarbonRetired" && amount > 0) {
                const burnEvent = {
                    signature,
                    owner,
                    amount,
                    timestamp,
                    eventType: "BURN",
                };
                globalCache.totalCarbonRetired += amount;
                globalCache.totalCarbonLocked = Math.max(0, globalCache.totalCarbonLocked - amount);
                globalCache.totalEvents += 1;
                ledgerUpdates.push(burnEvent);
                io.emit("NEW_OFFSET", burnEvent);
            }
            if (eventName === "CarbonMinted" && amount > 0) {
                const mintEvent = {
                    signature,
                    owner,
                    amount,
                    timestamp,
                    eventType: "MINT",
                };
                globalCache.totalCarbonLocked += amount;
                globalCache.totalEvents += 1;
                ledgerUpdates.push(mintEvent);
                io.emit("NEW_MINT", mintEvent);
            }
        }
    }
    if (ledgerUpdates.length > 0) {
        await appendEvents(ledgerUpdates);
    }
    res.status(200).json({
        processed: ledgerUpdates.length,
        cache: globalCache,
    });
});
httpServer.listen(port, function () {
    console.log(`Server is spinning at http://localhost:${port}`);
});
async function appendEvents(newEvents) {
    await fs.mkdir(dataDir, { recursive: true });
    const existing = await readExistingEvents();
    const updated = [...existing, ...newEvents];
    await fs.writeFile(ledgerFile, JSON.stringify(updated, null, 2), "utf8");
}
async function readExistingEvents() {
    try {
        const data = await fs.readFile(ledgerFile, "utf8");
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=index.js.map