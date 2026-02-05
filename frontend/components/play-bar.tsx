import { findClassModule, findModuleExport, IconsModule } from "@steambrew/client";
import Steam from "../steam.js";

const PlayBar = findClassModule((m) => m.GameStat) as Record<string, string>;
export const PlayBarClasses = PlayBar;

const formatBytes = //
  findModuleExport((e) => e?.toString?.()?.includes('"Tera"'));

export function SizeOnDisk({ sizeOnDisk }: { sizeOnDisk: Steam.AppOverview["size_on_disk"] }) {
  return (
    <div className={`${PlayBar.GameStat} ${PlayBar.LastPlayed} Panel`}>
      <div className={`${PlayBar.GameStatIcon} ${PlayBar.PlaytimeIcon}`}>
        <IconsModule.HardDrive />
      </div>
      <div className={PlayBar.GameStatRight}>
        <div className={PlayBar.PlayBarLabel}>
          {Steam.LocalizationManager.LocalizeString("#Library_SortBySizeOnDisk")}
        </div>
        <div className={`${PlayBar.PlayBarDetailLabel} ${PlayBar.LastPlayedInfo}`}>
          {formatBytes(Number(sizeOnDisk), 2)}
        </div>
      </div>
    </div>
  );
}
