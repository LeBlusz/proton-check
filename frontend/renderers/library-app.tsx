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

    // Simple approach: just add the medal directly
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

      // Fetch data and update
      fetchProtonDBTier(app.appid).then((tier) => {
        console.log(`🔍 Proton Check: Fetched tier for app ${app.appid}: ${tier}`);

        const existing = parent.querySelector(`[data-protondb-medal]`);
        if (existing) {
          const component = <ProtonDBMedal tier={tier} />;
          const element = renderComponent(component);
          element.setAttribute("data-protondb-medal", "");
          existing.replaceWith(element);
          console.log(`🔍 Proton Check: Updated medal to tier: ${tier}`);
        }
      }).catch((error) => {
        console.log(`🔍 Proton Check: Failed to fetch tier for app ${app.appid}:`, error);

        const existing = parent.querySelector(`[data-protondb-medal]`);
        if (existing) {
          const component = <ProtonDBMedal tier="unknown" />;
          const element = renderComponent(component);
          element.setAttribute("data-protondb-medal", "");
          existing.replaceWith(element);
        }
      });
    }

  } catch (error) {
    console.error(`🔍 Proton Check: Error patching library app:`, error);
  }
}
