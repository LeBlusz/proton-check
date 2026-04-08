import type Steam from "../steam.js";
import { PlayBarClasses, ProtonDBMedal, fetchProtonDBTier } from "../components/play-bar.js";
import { NON_STEAM_APP_APPID_MASK } from "../constants.js";
import { querySelectorAll, renderComponent } from "../helpers.js";

export async function patch(window: Window, app: Steam.AppOverview) {
  if (app.appid >= NON_STEAM_APP_APPID_MASK) return;

  console.log(`🔍 Proton Check: Patching library app '${app.display_name}' for appId: ${app.appid}`);

  try {
    let parents = Array.from(await querySelectorAll(window.document, `.${PlayBarClasses.GameStatsSection}`));
    console.log(`🔍 Proton Check: Found ${parents.length} GameStatsSection parents`);

    if (parents.length === 0) {
      console.log("🔍 Proton Check: No GameStatsSection found, trying alternative selectors");
      // Try some alternative selectors
      const altSelectors = ['.GameStatsSection', '[class*="GameStats"]', '[class*="stats"]', '.Panel'];
      for (const selector of altSelectors) {
        const altParents = await querySelectorAll(window.document, selector);
        console.log(`🔍 Proton Check: Alternative selector "${selector}" found ${altParents.length} elements`);
        if (altParents.length > 0) {
          parents.push(...Array.from(altParents));
          break;
        }
      }
    }

    if (parents.length === 0) {
      console.log("🔍 Proton Check: No suitable parent elements found");
      return;
    }

    // Function to ensure our medal is always the last element
    const ensureLastPosition = (parent: Element) => {
      const medalElement = parent.querySelector(`[data-protondb-medal]`);
      if (medalElement && medalElement !== parent.lastElementChild) {
        // Move it to the end if it's not already there
        parent.appendChild(medalElement);
        console.log("🔍 Proton Check: Moved ProtonDB medal to last position");
      }
    };

    // Add loading placeholder immediately
    for (const parent of parents) {
      console.log(`🔍 Proton Check: Processing parent element with ${parent.children.length} children`);

      // Remove any existing medal
      const existing = parent.querySelector(`[data-protondb-medal]`);
      if (existing) {
        existing.remove();
        console.log("🔍 Proton Check: Removed existing medal");
      }

      // Add loading medal
      const loadingComponent = <ProtonDBMedal tier="loading" />;
      const loadingElement = renderComponent(loadingComponent);
      loadingElement.setAttribute("data-protondb-medal", "");
      parent.appendChild(loadingElement);
      console.log(`🔍 Proton Check: Added loading medal, parent now has ${parent.children.length} children`);

      // Set up a MutationObserver to maintain the last position
      const observer = new MutationObserver(() => {
        ensureLastPosition(parent);
      });

      observer.observe(parent, {
        childList: true,
        subtree: false,
      });

      // Store the observer on the parent for cleanup later
      (parent as any)._protonObserver = observer;

      // Fetch data and update
      fetchProtonDBTier(app.appid).then((result) => {
        console.log(`🔍 Proton Check: ${result.source === "cache" ? "Cached" : "Fetched"} tier for app ${app.appid}: ${result.tier}`);

        const existing = parent.querySelector(`[data-protondb-medal]`);
        if (existing) {
          const component = <ProtonDBMedal tier={result.tier} />;
          const element = renderComponent(component);
          element.setAttribute("data-protondb-medal", "");
          existing.replaceWith(element);
          // Ensure it's still the last element after replacement
          ensureLastPosition(parent);
          console.log(`🔍 Proton Check: Updated medal to tier: ${result.tier}`);
        }
      }).catch((error) => {
        console.log(`🔍 Proton Check: Failed to fetch tier for app ${app.appid}:`, error);

        const existing = parent.querySelector(`[data-protondb-medal]`);
        if (existing) {
          const component = <ProtonDBMedal tier="unknown" />;
          const element = renderComponent(component);
          element.setAttribute("data-protondb-medal", "");
          existing.replaceWith(element);
          // Ensure it's still the last element after replacement
          ensureLastPosition(parent);
        }
      });
    }

  } catch (error) {
    console.error(`🔍 Proton Check: Error patching library app:`, error);
  }
}
