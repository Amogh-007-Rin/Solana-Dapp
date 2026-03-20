import { CARBON_MARKETS, MARKET_BY_ID } from "@/lib/market-data";

export interface MarketListing {
  id: string;
  marketId: string;
  sellerEmail: string;
  sellerName: string;
  sellerWallet?: string;
  pricePerToken: number;
  quantityAvailable: number;
  minPurchase: number;
  status: "open" | "filled" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface MarketTrade {
  id: string;
  listingId: string;
  marketId: string;
  sellerEmail: string;
  buyerEmail: string;
  buyerName: string;
  quantity: number;
  pricePerToken: number;
  totalValueUsd: number;
  settlement: "pending_onchain" | "settled";
  createdAt: string;
}

const g = globalThis as unknown as {
  __marketListings?: MarketListing[];
  __marketTrades?: MarketTrade[];
};

if (!g.__marketListings || g.__marketListings.length === 0) {
  g.__marketListings = CARBON_MARKETS.slice(0, 6).map((market, idx) => {
    const quantity = 500 + idx * 150;
    return {
      id: crypto.randomUUID(),
      marketId: market.id,
      sellerEmail: `farmer${idx + 1}@rootchain.demo`,
      sellerName: `${market.farmName} Co-op`,
      pricePerToken: Number((market.pricePerToken * (0.94 + idx * 0.01)).toFixed(2)),
      quantityAvailable: quantity,
      minPurchase: 25,
      status: "open" as const,
      createdAt: new Date(Date.now() - idx * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - idx * 86_400_000).toISOString(),
    };
  });
}

if (!g.__marketTrades) {
  g.__marketTrades = [];
}

const listings = g.__marketListings;
const trades = g.__marketTrades;

export async function listOpenListings(marketId?: string): Promise<MarketListing[]> {
  return listings
    .filter((l) => l.status === "open" && l.quantityAvailable > 0 && (!marketId || l.marketId === marketId))
    .sort((a, b) => {
      if (a.marketId === b.marketId) return a.pricePerToken - b.pricePerToken;
      return a.marketId.localeCompare(b.marketId);
    });
}

export async function createListing(input: {
  marketId: string;
  sellerEmail: string;
  sellerName: string;
  sellerWallet?: string;
  pricePerToken: number;
  quantityAvailable: number;
  minPurchase?: number;
}): Promise<MarketListing> {
  if (!MARKET_BY_ID[input.marketId]) {
    throw new Error("Unknown market");
  }

  if (input.pricePerToken <= 0 || input.quantityAvailable <= 0) {
    throw new Error("Price and quantity must be greater than zero");
  }

  const now = new Date().toISOString();
  const listing: MarketListing = {
    id: crypto.randomUUID(),
    marketId: input.marketId,
    sellerEmail: input.sellerEmail.toLowerCase(),
    sellerName: input.sellerName,
    sellerWallet: input.sellerWallet,
    pricePerToken: Number(input.pricePerToken.toFixed(2)),
    quantityAvailable: Math.floor(input.quantityAvailable),
    minPurchase: Math.max(1, Math.floor(input.minPurchase ?? 1)),
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  listings.unshift(listing);
  return listing;
}

export async function executeTrade(input: {
  listingId: string;
  buyerEmail: string;
  buyerName: string;
  quantity: number;
}): Promise<{ listing: MarketListing; trade: MarketTrade }> {
  const listing = listings.find((l) => l.id === input.listingId);
  if (!listing || listing.status !== "open") {
    throw new Error("Listing not found or not open");
  }

  if (listing.sellerEmail.toLowerCase() === input.buyerEmail.toLowerCase()) {
    throw new Error("You cannot buy your own listing");
  }

  const quantity = Math.floor(input.quantity);
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }
  if (quantity < listing.minPurchase) {
    throw new Error(`Minimum purchase is ${listing.minPurchase} tokens`);
  }
  if (quantity > listing.quantityAvailable) {
    throw new Error("Insufficient listing quantity");
  }

  listing.quantityAvailable -= quantity;
  listing.updatedAt = new Date().toISOString();
  if (listing.quantityAvailable === 0) {
    listing.status = "filled";
  }

  const trade: MarketTrade = {
    id: crypto.randomUUID(),
    listingId: listing.id,
    marketId: listing.marketId,
    sellerEmail: listing.sellerEmail,
    buyerEmail: input.buyerEmail.toLowerCase(),
    buyerName: input.buyerName,
    quantity,
    pricePerToken: listing.pricePerToken,
    totalValueUsd: Number((quantity * listing.pricePerToken).toFixed(2)),
    settlement: "pending_onchain",
    createdAt: new Date().toISOString(),
  };

  trades.unshift(trade);
  return { listing, trade };
}

export async function listRecentTrades(limit = 60, marketId?: string): Promise<MarketTrade[]> {
  const filtered = marketId ? trades.filter((trade) => trade.marketId === marketId) : trades;
  return filtered.slice(0, Math.max(1, limit));
}

export async function getMarketStats() {
  const openListings = listings.filter((l) => l.status === "open");
  const listedTokens = openListings.reduce((sum, l) => sum + l.quantityAvailable, 0);
  const tradedTokens = trades.reduce((sum, t) => sum + t.quantity, 0);
  const tradedValueUsd = trades.reduce((sum, t) => sum + t.totalValueUsd, 0);

  return {
    openListings: openListings.length,
    listedTokens,
    tradedTokens,
    tradedValueUsd: Number(tradedValueUsd.toFixed(2)),
  };
}
