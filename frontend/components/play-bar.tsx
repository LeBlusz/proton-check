import { findClassModule } from "@steambrew/client";
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

// Cache for ProtonDB tiers to avoid repeated API calls
const tierCache = new Map<number, string>();

export async function fetchProtonDBTier(appId: number): Promise<string> {
  // Check cache first
  if (tierCache.has(appId)) {
    const cachedTier = tierCache.get(appId)!;
    logger.debug(`Using cached ProtonDB tier for app ${appId}: ${cachedTier}`);
    return cachedTier;
  }

  try {
    // Try multiple CORS proxy services
    const endpoints = [
      // CORS proxy that should work
      `https://cors-anywhere.herokuapp.com/https://protondb-community-api-04f42bc1742f.herokuapp.com/api/games/${appId}/summary`,
      // Alternative proxy
      `https://thingproxy.freeboard.io/fetch/https://protondb-community-api-04f42bc1742f.herokuapp.com/api/games/${appId}/summary`,
      // Direct fetch as last resort (will likely fail due to CORS)
      `https://protondb-community-api-04f42bc1742f.herokuapp.com/api/games/${appId}/summary`,
    ];

    for (const url of endpoints) {
      try {
        logger.debug(`Attempting to fetch ProtonDB tier from: ${url}`);
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          // Add timeout
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        logger.debug(`Response status: ${response.status}`);
        
        if (response.ok) {
          const data = (await response.json()) as { tier?: string };
          logger.debug(`Response data:`, data);
          
          let tier = data.tier;
          if (!tier) {
            logger.debug(`No tier found in response for app ${appId}`);
            continue;
          }
          
          // tier comes as "Platinum", "Gold", "Silver", "Bronze" - normalize to lowercase
          tier = tier.toLowerCase();
          
          if (!["platinum", "gold", "silver", "bronze"].includes(tier)) {
            logger.debug(`Unknown tier value: ${tier}`);
            continue;
          }
          
          // Cache the result
          tierCache.set(appId, tier);
          logger.debug(`Successfully fetched and cached ProtonDB tier for app ${appId}: ${tier}`);
          return tier;
        } else {
          logger.debug(`HTTP error ${response.status} for ${url}`);
        }
      } catch (urlError) {
        logger.debug(`Failed to fetch from ${url}:`, urlError);
        continue;
      }
    }

    // If all endpoints failed, cache and return unknown
    tierCache.set(appId, "unknown");
    logger.debug(`Failed to fetch ProtonDB tier for app ${appId} from all endpoints, caching as unknown`);
    return "unknown";
  } catch (error) {
    logger.debug(`Error in fetchProtonDBTier for app ${appId}:`, error);
    tierCache.set(appId, "unknown");
    return "unknown";
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
