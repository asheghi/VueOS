import appsMeta from '../apps/AppsMeta';
import { escapeShortcut, fetchTextFile } from './fs';
import { getFileType } from '../utils/utils';

export function fetchApp(name, isSystemApp) {
  if (isSystemApp) {
    return import(`./../apps/System32/${name}.vue`);
  }
  return import(`./../apps/ProgramFiles/${name}.vue`);
}

export function getAppForFilePath(filePath) {
  const fileType = getFileType(filePath);
  if (fileType === 'app') {
    return fetchTextFile(filePath);
  }
  const names = Object.keys(appsMeta);
  for (let i = 0; i < names.length; i++) {
    const appName = names[i];
    if (appsMeta[appName]) {
      const { canHandle } = appsMeta[appName];
      if (canHandle && typeof canHandle === 'function') {
        if (canHandle({
          filePath,
          fileType,
        })) {
          return appName;
        }
      }
    }
  }
  return {};
}

export async function getFileWindowProperties(filePath) {
  const escaped = await escapeShortcut(filePath);
  const appName = await getAppForFilePath(escaped);
  const { windowProperties } = appsMeta[appName] || {};
  if (!(windowProperties && typeof windowProperties === 'function')) {
    return {};
  }
  const result = await windowProperties(escaped);
  return result;
}

export async function getFileThumbnail(filePath) {
  const escaped = await escapeShortcut(filePath);
  const appName = await getAppForFilePath(escaped);
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
