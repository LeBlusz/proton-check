import { onLocationChange } from "./monitors/location.js";
import { onPopupCreate, PopupType } from "./monitors/popup.js";
import { patch as patchLibraryApp } from "./renderers/library-app.js";
import Steam from "./steam.js";

export default async function OnPluginLoad() {
  onPopupCreate((popup, type) => {
    if (type !== PopupType.Desktop && type !== PopupType.Gamepad) return;

    // ===== Monitor Main Window Location ===== //

    onLocationChange(
      () => {
        if (type === PopupType.Desktop) return Steam.MainWindowBrowserManager?.m_lastLocation;
        if (type === PopupType.Gamepad) return popup.window?.opener?.location;
      },
      ({ pathname }) => {
        if (pathname.startsWith("/library/app/")) {
          const appId = Number(pathname.split("/")[3]);
          const app = Steam.AppStore.allApps //
            .find((a) => a.appid === appId)!;
          patchLibraryApp(popup.window!, app);
        }
      },
    );
  });
}
