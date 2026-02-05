import type Steam from "../steam.js";
import { PlayBarClasses, SizeOnDisk } from "../components/play-bar.js";
import { NON_STEAM_APP_APPID_MASK } from "../constants.js";
import { querySelectorAll, renderComponent } from "../helpers.js";
import logger from "../logger.js";

export async function patch(window: Window, app: Steam.AppOverview) {
  if (app.appid >= NON_STEAM_APP_APPID_MASK) return;

  logger.debug(
    `Patching library app '${app.display_name}' to add size on disk`, //
    { window, app },
  );

  const parents = await querySelectorAll(window.document, `.${PlayBarClasses.GameStatsSection}`);

  for (const parent of parents) {
    if (app.size_on_disk) {
      const component = <SizeOnDisk sizeOnDisk={app.size_on_disk} />;
      const element = renderComponent(component);
      element.setAttribute("data-size-on-disk", "");

      const existing = parent.querySelector(`[data-size-on-disk]`);
      if (existing) existing.replaceWith(element);
      else parent.appendChild(element);
    }
  }
}
