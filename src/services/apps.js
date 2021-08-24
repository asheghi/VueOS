import appsMeta from '../apps/AppsMeta';
import { escapeShortcut, fetchTextFile } from './fs';
import { getFileType } from '../utils/utils';
import { getConfigItem } from './cnf';

export function fetchApp(name, isSystemApp) {
  if (isSystemApp) {
    return import(`./../apps/System32/${name}.vue`);
  }
  return import(`./../apps/ProgramFiles/${name}.vue`);
}

export function getAppsForFilePath(filePath) {
  const fileType = getFileType(filePath);
  const names = Object.keys(appsMeta);
  const result = [];
  for (let i = 0; i < names.length; i++) {
    const appName = names[i];
    if (appsMeta[appName]) {
      const { canHandle } = appsMeta[appName];
      if (canHandle && typeof canHandle === 'function') {
        if (canHandle({
          filePath,
          fileType,
        })) {
          result.push(appName);
        }
      }
    }
  }
  return result;
}

export async function getAppWindowProperties(appName, filePath) {
  const { windowProperties } = appsMeta[appName] || {};
  if (!(windowProperties && typeof windowProperties === 'function')) {
    return {};
  }
  const result = await windowProperties(filePath);
  return result;
}

export async function getFileThumbnail(filePath) {
  const escaped = await escapeShortcut(filePath);
  const fileType = getFileType(escaped);
  let appName = null;
  if (fileType === 'app') {
    appName = await fetchTextFile(escaped);
  }
  if (!appName) {
    const configKey = `open-${fileType}-with`;
    const preferredApp = getConfigItem(configKey, null);
    const [first] = await getAppsForFilePath(escaped);
    appName = preferredApp || first;
  }
  const appMeta = appsMeta[appName] || {};
  const { windowProperties, thumbnail } = appMeta;
  if (thumbnail && typeof thumbnail === 'function') {
    return thumbnail(escaped);
  }
  if (!(windowProperties && typeof windowProperties === 'function')) {
    return {};
  }
  const result = await windowProperties(escaped);
  return result.icon;
}
