// ─── Types ────────────────────────────────────────────────────────────────────

export type CarbonType = "Forestry" | "Agriculture" | "Blue Carbon" | "Renewable";

export interface CarbonMarket {
  id: string;
  farmName: string;
  region: string;
  country: string;
  flag: string;
  vintage: number;
  methodology: string;
  carbonType: CarbonType;
  pricePerToken: number;  // USD per CO2 token
  change24h: number;      // percentage
  volume24h: number;      // tokens traded
  supply: number;         // total tokens
  available: number;      // tokens available to buy
  verifiedBy: string;
  description: string;
  sdgGoals: number[];     // UN SDG goals satisfied
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
  depth: number; // 0-1 for depth bar width
}

export interface OrderBook {
  asks: OrderBookEntry[]; // sell orders — sorted ascending
  bids: OrderBookEntry[]; // buy orders  — sorted descending
  spread: number;
  spreadPct: number;
}

export interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  time: string;
}

// ─── Seeded deterministic helpers ─────────────────────────────────────────────

function srand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function generatePrices(basePrice: number, marketIdx: number, count = 60): number[] {
  const prices: number[] = [basePrice];
  for (let i = 1; i < count; i++) {
    const r = srand(marketIdx * 997 + i);
    const drift = (r - 0.47) * basePrice * 0.025;
    prices.push(Math.max(basePrice * 0.4, prices[i - 1] + drift));
  }
  return prices;
}

export function generateOrderBook(midPrice: number, marketIdx: number): OrderBook {
  const spread = midPrice * 0.0012;
  const asks: Omit<OrderBookEntry, "depth">[] = [];
  const bids: Omit<OrderBookEntry, "depth">[] = [];

  for (let i = 0; i < 12; i++) {
    const askPrice = midPrice + spread / 2 + i * midPrice * 0.002;
    const bidPrice = midPrice - spread / 2 - i * midPrice * 0.002;
    const aqty = Math.round(srand(marketIdx * 13 + i * 7) * 1800 + 80);
    const bqty = Math.round(srand(marketIdx * 17 + i * 11) * 2000 + 100);
    asks.push({ price: askPrice, quantity: aqty, total: 0 });
    bids.push({ price: bidPrice, quantity: bqty, total: 0 });
  }

  let at = 0, bt = 0;
  for (const a of asks) { at += a.quantity; a.total = at; }
  for (const b of bids) { bt += b.quantity; b.total = bt; }

  const maxAsk = asks[asks.length - 1].total;
  const maxBid = bids[bids.length - 1].total;

  return {
    asks: asks.map((a) => ({ ...a, depth: a.total / maxAsk })).reverse(), // show highest ask at top
    bids: bids.map((b) => ({ ...b, depth: b.total / maxBid })),
    spread,
    spreadPct: (spread / midPrice) * 100,
  };
}

export function generateRecentTrades(midPrice: number, marketIdx: number, count = 20): Trade[] {
  const trades: Trade[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const r1 = srand(marketIdx * 31 + i * 3);
    const r2 = srand(marketIdx * 37 + i * 5);
    const r3 = srand(marketIdx * 41 + i * 7);
    trades.push({
      id: `t-${marketIdx}-${i}`,
      price: midPrice * (1 + (r1 - 0.5) * 0.006),
      quantity: Math.round(r2 * 500 + 10),
      side: r3 > 0.5 ? "buy" : "sell",
      time: new Date(now - i * 1000 * srand(i + marketIdx) * 90).toLocaleTimeString(),
    });
  }
  return trades;
}

// ─── Market data ──────────────────────────────────────────────────────────────

export const CARBON_MARKETS: CarbonMarket[] = [
  {
    id: "amazon-restoration",
    farmName: "Amazon Restoration Fund",
    region: "Pará State",
    country: "Brazil",
    flag: "🇧🇷",
    vintage: 2024,
    methodology: "NDVI Satellite + IoT",
    carbonType: "Forestry",
    pricePerToken: 18.40,
    change24h: +5.2,
    volume24h: 124000,
    supply: 500000,
    available: 142000,
    verifiedBy: "Root-Chain Oracle v2",
    description: "High-integrity forest conservation credits from restored Amazon basin farmland spanning 12,000 hectares.",
    sdgGoals: [13, 15, 1],
  },
  {
    id: "punjab-agriculture",
    farmName: "Punjab Precision Farm",
    region: "Punjab",
    country: "India",
    flag: "🇮🇳",
    vintage: 2024,
    methodology: "Soil Carbon (IoT)",
    carbonType: "Agriculture",
    pricePerToken: 11.25,
    change24h: -1.8,
    volume24h: 89200,
    supply: 280000,
    available: 67000,
    verifiedBy: "Root-Chain Oracle v2",
    description: "Verified soil organic carbon sequestration through precision agriculture and no-till farming practices.",
    sdgGoals: [2, 13, 15],
  },
  {
    id: "kenya-agroforestry",
    farmName: "Great Rift Agroforest",
    region: "Rift Valley",
    country: "Kenya",
    flag: "🇰🇪",
    vintage: 2023,
    methodology: "NDVI + Biomass",
    carbonType: "Forestry",
    pricePerToken: 14.80,
    change24h: +8.6,
    volume24h: 203000,
    supply: 750000,
    available: 310000,
    verifiedBy: "Root-Chain Oracle v2",
    description: "Community-led agroforestry project integrating carbon sequestration with smallholder food security.",
    sdgGoals: [1, 2, 13, 15, 17],
  },
  {
    id: "norway-blue-carbon",
    farmName: "Nordic Seagrass Initiative",
    region: "Vestland County",
    country: "Norway",
    flag: "🇳🇴",
    vintage: 2024,
    methodology: "Coastal Blue Carbon",
    carbonType: "Blue Carbon",
    pricePerToken: 32.60,
    change24h: +2.1,
    volume24h: 41000,
    supply: 120000,
    available: 28000,
    verifiedBy: "Root-Chain Oracle v2",
    description: "Premium blue carbon credits from restored Norwegian seagrass meadows with 100-year sequestration.",
    sdgGoals: [13, 14, 15],
  },
  {
    id: "mekong-rice",
    farmName: "Mekong Delta Rice Program",
    region: "Can Tho Province",
    country: "Vietnam",
    flag: "🇻🇳",
    vintage: 2024,
    methodology: "AWD Methane Reduction",
    carbonType: "Agriculture",
    pricePerToken: 9.15,
    change24h: -0.4,
    volume24h: 167000,
    supply: 1200000,
    available: 540000,
    verifiedBy: "Root-Chain Oracle v2",
    description: "Alternate wetting and drying rice cultivation reducing methane emissions across 80,000 hectares.",
    sdgGoals: [2, 13],
  },
  {
    id: "aus-savanna",
    farmName: "Northern Savanna Guardians",
    region: "Northern Territory",
    country: "Australia",
    flag: "🇦🇺",
    vintage: 2023,
    methodology: "Fire Management",
    carbonType: "Forestry",
    pricePerToken: 16.90,
    change24h: +3.7,
    volume24h: 78000,
    supply: 400000,
    available: 195000,
    verifiedBy: "Root-Chain Oracle v2",
    description: "Indigenous-managed savanna fire management reducing carbon emissions in Australia's Northern Territory.",
    sdgGoals: [13, 15, 10],
  },
  {
    id: "canada-wetlands",
    farmName: "Manitoba Peatland Reserve",
    region: "Manitoba",
    country: "Canada",
    flag: "🇨🇦",
    vintage: 2024,
    methodology: "Peatland Restoration",
    carbonType: "Blue Carbon",
    pricePerToken: 27.30,
    change24h: +11.4,
    volume24h: 55000,
    supply: 200000,
    available: 88000,
    verifiedBy: "Root-Chain Oracle v2",
    description: "Restored Canadian peatlands providing long-duration carbon storage with verified hydrology monitoring.",
    sdgGoals: [13, 14, 6],
  },
  {
    id: "gujarat-renewable",
    farmName: "Gujarat Solar Offset Fund",
    region: "Gujarat",
    country: "India",
    flag: "🇮🇳",
    vintage: 2024,
    methodology: "Renewable Energy",
    carbonType: "Renewable",
    pricePerToken: 7.80,
    change24h: -2.9,
    volume24h: 312000,
    supply: 2000000,
    available: 1200000,
    verifiedBy: "Root-Chain Oracle v2",
    description: "Verified avoided emissions from grid-connected solar installations displacing coal generation in Gujarat.",
    sdgGoals: [7, 13],
  },
];

export const MARKET_BY_ID = Object.fromEntries(CARBON_MARKETS.map((m, i) => [m.id, { ...m, idx: i }]));
