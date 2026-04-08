import { Millennium, findClassModule } from "@steambrew/client";
import logger from "../logger.js";

const PlayBar = findClassModule((m) => m.GameStat) as Record<string, string>;
export const PlayBarClasses = PlayBar;

const TIER_LABELS: Record<string, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  unknown: "Unknown",
  loading: "Loading...",
};

const TIER_COLORS: Record<string, string> = {
  platinum: "#e0e0e0",
  gold: "#ffd700",
  silver: "#c0c0c0",
  bronze: "#cd7f32",
  unknown: "#808080",
  loading: "#666666",
};

interface CacheEntry {
  tier: string;
  timestamp: number;
}

interface TierResult {
  tier: string;
  source: "cache" | "api";
}

const tierCache = new Map<number, CacheEntry>();
const SUCCESS_CACHE_DURATION = 24 * 60 * 60 * 1000;
const FAILURE_CACHE_DURATION = 60 * 1000;

function getCachedTier(appId: number): TierResult | null {
  const cached = tierCache.get(appId);
  if (!cached) return null;

  const ttl = cached.tier === "unknown" ? FAILURE_CACHE_DURATION : SUCCESS_CACHE_DURATION;
  if (Date.now() - cached.timestamp > ttl) {
    tierCache.delete(appId);
    return null;
  }

  return { tier: cached.tier, source: "cache" };
}

function setCachedTier(appId: number, tier: string) {
  tierCache.set(appId, { tier, timestamp: Date.now() });
}

export async function fetchProtonDBTier(appId: number): Promise<TierResult> {
  const cached = getCachedTier(appId);
  if (cached) {
    console.log(`🔍 Proton Check: Cache hit for app ${appId}: ${cached.tier}`);
    return cached;
  }

  console.log(`🔍 Proton Check: API request for app ${appId}`);

  try {
    const response = await Millennium.callServerMethod("GetProtonDBTier", { appId });
    const payload = typeof response === "string" ? JSON.parse(response) : response;

    if (payload?.success && typeof payload.tier === "string") {
      setCachedTier(appId, payload.tier);
      logger.debug(`Successfully fetched ProtonDB tier for app ${appId}: ${payload.tier}`);
      console.log(`🔍 Proton Check: API success for app ${appId}: ${payload.tier}`);
      return { tier: payload.tier, source: "api" };
    }

    const errorMessage = payload?.error ?? "unknown error";
    console.warn(`🔍 Proton Check: API failure for app ${appId}: ${errorMessage}`);
    setCachedTier(appId, "unknown");
    return { tier: "unknown", source: "api" };
  } catch (error) {
    console.error(`🔍 Proton Check: Backend fetch failed for app ${appId}:`, error);
    setCachedTier(appId, "unknown");
    return { tier: "unknown", source: "api" };
  }
}

export function ProtonDBMedal({ tier }: { tier: string }) {
  const tierLabel = TIER_LABELS[tier] || "Unknown";

  return (
    <div className={`${PlayBar.GameStat} ${PlayBar.LastPlayed} Panel`}>
      <div className={`${PlayBar.GameStatIcon} ${PlayBar.PlaytimeIcon}`}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: TIER_COLORS[tier] || TIER_COLORS.unknown,
            color: tier === "bronze" || tier === "platinum" ? "#000" : "#fff",
            fontSize: "12px",
            fontWeight: "bold",
            opacity: tier === "loading" ? 0.7 : 1,
          }}
        >
          {tier === "loading" ? "⏳" : "★"}
        </div>
      </div>
      <div className={PlayBar.GameStatRight}>
        <div className={PlayBar.PlayBarLabel}>ProtonDB</div>
        <div className={`${PlayBar.PlayBarDetailLabel} ${PlayBar.LastPlayedInfo}`}>
          {tierLabel}
        </div>
      </div>
    </div>
  );
}
