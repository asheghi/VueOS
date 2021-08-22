import appsMeta from '../apps/AppsMeta';
import { escapeShortcut, fetchTextFile, isDirectory } from './fs';
import {extname} from 'path-browserify';

export function fetchApp(name, isSystemApp) {
  if (isSystemApp) {
    return import('./../apps/System32/' + name + '.vue');
  } else {
    return import('./../apps/ProgramFiles/' + name + '.vue');
  }
}

export function getFileType(filePath) {
  if (isDirectory(filePath)) {
    return 'directory';
  }

  const ext = extname(filePath)
    .replace('.', '');

  if (['mp4', 'avi','mpg','mpeg','mov','mkv','mxu'].includes(ext)) {
    return 'video';
  }

  if (['mp3', 'ogg', 'wma', 'wpl', 'mpa', 'mid', 'cda'].includes(ext)) {
    return 'audio';
  }
  if (['png','ai', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'ps', 'psd', 'svg', 'tif', 'tiff'].includes(ext)) {
    return 'image';
  }

  if (['wapp'].includes(ext)) {
    return 'webapp';
  }

  if (['txt'].includes(ext)) {
    return 'text';
  }

  if (['link'].includes(ext)) {
    return 'shortcut';
  }

  if (['exe'].includes(ext)) {
    return 'app';
  }

  return null;
}

export function getAppForFilePath(filePath) {
  const fileType = getFileType(filePath);
  if(fileType === 'app'){
    return fetchTextFile(filePath);
  }
  for (const appName in appsMeta) {
    const { canHandle } = appsMeta[appName];
    if (canHandle && typeof canHandle === 'function') {
      if (canHandle({
        filePath,
        fileType
      })) {
        return appName;
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
  const {windowProperties , thumbnail} = appMeta;
  if (thumbnail && typeof thumbnail === 'function') {
    return await thumbnail(escaped);
  }
  if (!(windowProperties && typeof windowProperties === 'function')) {
    return {};
  }
  const result = await windowProperties(escaped);
  return result.icon;
}


