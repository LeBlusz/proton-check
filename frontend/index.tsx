import { onLocationChange } from "./monitors/location.js";
import { onPopupCreate, PopupType } from "./monitors/popup.js";
import { patch as patchLibraryApp } from "./renderers/library-app.js";
import Steam from "./steam.js";
import logger from "./logger.js";

export default async function OnPluginLoad() {
  console.log("🔍 Proton Check plugin loading...");
  console.log("🔍 Steam objects available:", {
    hasPopupManager: typeof g_PopupManager !== 'undefined',
    hasMainWindowBrowserManager: typeof MainWindowBrowserManager !== 'undefined',
    hasAppStore: typeof appStore !== 'undefined',
    hasSteamUIStore: typeof SteamUIStore !== 'undefined'
  });

  try {
    // Test basic Steam API access
    console.log("🔍 Testing Steam API access...");
    const popupManager = Reflect.get(globalThis, "g_PopupManager");
    console.log("🔍 PopupManager:", popupManager ? "available" : "not available");

    const appStore = Reflect.get(globalThis, "appStore");
    console.log("🔍 AppStore:", appStore ? "available" : "not available");

    // Continue with normal plugin logic
    onPopupCreate((popup, type) => {
      console.log(`🔍 Proton Check: Popup created: ${type}`);

      if (type !== PopupType.Desktop && type !== PopupType.Gamepad) {
        console.log(`🔍 Skipping popup type: ${type}`);
        return;
      }

      // ===== Monitor Main Window Location ===== //

      onLocationChange(
        () => {
          if (type === PopupType.Desktop) return Steam.MainWindowBrowserManager?.m_lastLocation;
          if (type === PopupType.Gamepad) return popup.window?.opener?.location;
        },
        ({ pathname }) => {
          console.log(`🔍 Proton Check: Location changed to: ${pathname}`);

          if (pathname.startsWith("/library/app/")) {
            const appId = Number(pathname.split("/")[3]);
            console.log(`🔍 Proton Check: Detected library app page for appId: ${appId}`);

            const app = Steam.AppStore.allApps //
              .find((a) => a.appid === appId)!;

            if (app) {
              console.log(`🔍 Proton Check: Found app: ${app.display_name} (${app.appid})`);
              patchLibraryApp(popup.window!, app);
            } else {
              console.error(`🔍 Proton Check: App not found for appId: ${appId}`);
            }
          }
        },
      );
    });
  } catch (error) {
    console.error("🔍 Proton Check: Error in OnPluginLoad:", error);
  }
}
