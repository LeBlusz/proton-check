local http = require("http")
local json = require("json")
local logger = require("logger")
local millennium = require("millennium")

local PROTONDB_URL = "https://protondb-community-api-04f42bc1742f.herokuapp.com/api/games/%s/summary"
local VALID_TIERS = {
    platinum = true,
    gold = true,
    silver = true,
    bronze = true,
}

local function normalize_tier(raw_tier)
    if type(raw_tier) ~= "string" then
        return nil
    end

    local normalized = string.lower(raw_tier)
    if VALID_TIERS[normalized] then
        return normalized
    end

    return nil
end

function GetProtonDBTier(appId)
    logger:info("GetProtonDBTier called for appId " .. tostring(appId))

    if type(appId) ~= "number" then
        return json.encode({
            success = false,
            error = "Invalid appId",
        })
    end

    local url = string.format(PROTONDB_URL, tostring(appId))
    local response, err = http.get(url, {
        headers = {
            ["Accept"] = "application/json",
            ["User-Agent"] = "Millennium Proton Check",
        },
        timeout = 5000,
    })

    if not response then
        logger:error("ProtonDB request failed for appId " .. tostring(appId) .. ": " .. tostring(err))
        return json.encode({
            success = false,
            error = err or "Request failed",
        })
    end

    if response.status ~= 200 then
        logger:error("ProtonDB returned HTTP " .. tostring(response.status) .. " for appId " .. tostring(appId))
        return json.encode({
            success = false,
            error = "HTTP " .. tostring(response.status),
        })
    end

    local ok, payload = pcall(json.decode, response.body)
    if not ok or type(payload) ~= "table" then
        logger:error("Failed to decode ProtonDB response for appId " .. tostring(appId))
        return json.encode({
            success = false,
            error = "Invalid JSON response",
        })
    end

    local tier = normalize_tier(payload.tier)
    if not tier then
        logger:error("Missing or invalid ProtonDB tier for appId " .. tostring(appId))
        return json.encode({
            success = false,
            error = "Missing or invalid tier",
        })
    end

    logger:info("Resolved ProtonDB tier for appId " .. tostring(appId) .. ": " .. tier)
    return json.encode({
        success = true,
        tier = tier,
    })
end

local function on_load()
    logger:info("Proton Check backend loaded in Millennium " .. tostring(millennium.version()))
    millennium.ready()
end

local function on_frontend_loaded()
    logger:info("Proton Check frontend connected")
end

local function on_unload()
    logger:info("Proton Check backend unloaded")
end

return {
    on_load = on_load,
    on_frontend_loaded = on_frontend_loaded,
    on_unload = on_unload,
}