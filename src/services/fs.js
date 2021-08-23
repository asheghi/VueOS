import * as BrowserFS from 'browserfs';
import {
  basename, dirname, extname, join,
} from 'path-browserify';
import { EventEmitter2 } from 'eventemitter2';
import getWallpapersList from '../assets/images/Wallpapers/Wallpapers';
import { getFileType, isDirectory } from '../utils/utils';

const emitter = new EventEmitter2({ wildcard: true });

let fs = {};

const { Buffer } = BrowserFS.BFSRequire('buffer');
window.Buffer = Buffer;

export async function writeTextFile(filePath, content) {
  await new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, { encoding: 'utf8' }, (e) => {
      if (e) {
        return reject(e);
      }
      return resolve();
    });
  });
  emitter.emit('created', filePath);
}

export async function readDirectory(pathArg) {
  let path = pathArg;
  // await new Promise(r => setTimeout(r, 500));
  return new Promise((resolve, reject) => {
    fs.readdir(path, (e, data) => {
      if (e) {
        return reject(e);
      }
      if (!path.startsWith('/')) {
        path = `/${path}`;
      }
      const d = data.map((it) => join(path, it));
      return resolve(d);
    });
  });
}

async function isEmptyDirectory(filePath) {
  const list = await readDirectory(filePath);
  return list.length === 0;
}

async function writeStartMenuItem() {
  await fs.writeFile('/C:/User/Start Menu/My Computer.link', '/C:/Windows/System32/Explorer.exe', { encoding: 'utf8' });
  await fs.writeFile('/C:/User/Start Menu/Desktop.link', '/C:/User/Desktop', { encoding: 'utf8' });
  await fs.writeFile('/C:/User/Start Menu/Documents.link', '/C:/User/Documents', { encoding: 'utf8' });
  await fs.writeFile('/C:/User/Start Menu/Music.link', '/C:/User/Music', { encoding: 'utf8' });
  await fs.writeFile('/C:/User/Start Menu/Pictures.link', '/C:/User/Pictures', { encoding: 'utf8' });
}

async function existsPath(filePath) {
  return new Promise((resolve) => {
    fs.exists(filePath, (exists) => {
      resolve(exists);
    });
  });
}

async function writePrograms() {
  await writeTextFile('/C:/Windows/System32/Explorer.exe', 'Explorer');
  await writeTextFile('/C:/Windows/System32/Notepad.exe', 'Notepad');
  await writeTextFile('/C:/Windows/System32/MediaPlayer.exe', 'MediaPlayer');
  await writeTextFile('/C:/Windows/System32/ChangeBackground.exe', 'ChangeBackground');
  await writeTextFile('/C:/Program Files/Camera.exe', 'Camera');

  // web apps
  const methodDraw = {
    icon: 'https://editor.method.ac/images/favicon.svg',
    url: 'https://editor.method.ac/',
    width: 900,
    height: 700,
  };

  const win93 = {
    icon: 'https://v1.windows93.net/favicon.ico',
    url: 'https://v1.windows93.net/',
    width: 1000,
    height: 800,
  };

  await writeTextFile('/C:/Program Files/Method Draw.wapp', JSON.stringify(methodDraw));
  await writeTextFile('/C:/Program Files/win93.wapp', JSON.stringify(win93));
  await writeTextFile('/C:/User/Desktop/My Computer.link', '/C:/Windows/System32/Explorer.exe');
  await writeTextFile('/C:/User/Desktop/Notepad.link', '/C:/Windows/System32/Notepad.exe');
  await writeTextFile('/C:/User/Desktop/Change Background.link', '/C:/Windows/System32/ChangeBackground.exe');
  await writeTextFile('/C:/User/Desktop/Method Draw.link', '/C:/Program Files/Method Draw.wapp');
  await writeTextFile('/C:/User/Desktop/win93.link', '/C:/Program Files/win93.wapp');
}

async function populateFS() {
  await fs.mkdir('/C:');
  await fs.mkdir('/D:');

  await fs.mkdir('/C:/User');
  await fs.mkdir('/C:/Program Files');
  await fs.mkdir('/C:/Windows');
  await fs.mkdir('/C:/Windows/System32');

  await fs.mkdir('/C:/User/Desktop');
  await fs.mkdir('/C:/User/Documents');
  await fs.mkdir('/C:/User/Music');
  await fs.mkdir('/C:/User/Pictures');
  await fs.mkdir('/C:/User/Start Menu');
  await fs.mkdir('/C:/Windows/Wallpapers');

  await writePrograms();
  await writeStartMenuItem();

  await fs.writeFile('/C:/User/Desktop/TextFile.txt', 'hello world', { encoding: 'utf8' });
}

async function getNewFolderName(baseDir) {
  const newName = (i) => `New Folder${i > 1 ? ` (${i})` : ''}`;
  let i = 1;
  let folderName;
  do {
    folderName = join(baseDir, newName(i));
    i += 1;
  } while (await existsPath(folderName));
  return newName(i - 1);
}

function getFS() {
  return new Promise((resolve, reject) => {
    BrowserFS.configure({
      fs: 'MountableFileSystem',
      options: {
        '/C:': {
          fs: 'IndexedDB',
          options: {
            storeName: 'PartitionC',
          },
        },
        '/D:': {
          fs: 'IndexedDB',
          options: {
            storeName: 'PartitionD',
          },
        },
      },
    }, (e) => {
      if (e) {
        console.error(e);
        reject(e);
      }
      const theFs = BrowserFS.BFSRequire('fs');
      resolve(theFs);
    });
  });
}

export function isFile(filePath) {
  return !!extname(filePath);
}

async function getNewTextFileName(baseDir, fileName = 'Text File') {
  const newName = (i) => `${fileName}${i > 1 ? ` (${i})` : ''}.txt`;
  let i = 1;
  let name;
  do {
    name = join(baseDir, newName(i));
    i += 1;
    /* eslint no-await-in-loop: "off" */
  } while (await existsPath(name));
  return newName(i - 1);
}

async function makeDirectory(path, options = null) {
  if (!(await existsPath(path))) {
    return new Promise((resolve) => {
      fs.mkdir(path, options, resolve);
    });
  }
  return path;
}

export function registerToFsEvent(func) {
  const listener = (event, ...values) => {
    if (func && typeof func === 'function') {
      func(event, ...values);
    }
  };
  emitter.onAny(listener);
  return () => {
    emitter.offAny(listener);
  };
}

export function fileRef(path, type) {
  return {
    path,
    type,
  };
}

export async function fetchFile(path, options = {}) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, options, (e, data) => {
      if (e) {
        return reject(e);
      }
      return resolve(data);
    });
  });
}

export async function fetchTextFile(path) {
  // await new Promise(r => setTimeout(r,1500));
  // return fetchFile(path, { encoding: 'utf8' });
  return fetchFile(path, { encoding: 'utf8' });
}

export async function deleteFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (e) => {
      if (e) {
        return reject(e);
      }
      emitter.emit('deleted', filePath);
      return resolve();
    });
  });
}

export async function deleteDirectory(filePath) {
  if (await isEmptyDirectory(filePath)) {
    await new Promise((resolve) => {
      fs.rmdir(filePath, () => {
        emitter.emit('deleted', filePath);
        resolve();
      });
    });
  } else {
    // delete nested files
    const files = await readDirectory(filePath);
    const handler = async (file) => {
      if (isFile(file)) {
        await deleteFile(file);
      } else {
        await deleteDirectory(file);
      }
    };
    await Promise.all(files.map(handler));

    // removed everything inside directory
    // now we can delete directory itself!
    await deleteDirectory(filePath);
  }
}

export async function deletePath(path) {
  if (isDirectory(path)) {
    return deleteDirectory(path);
  }
  return deleteFile(path);
}

export async function createNewFolder(filePath, directoryNameArg) {
  let directoryName = directoryNameArg;
  if (!directoryName) {
    directoryName = await getNewFolderName(filePath);
  }
  await new Promise((resolve, reject) => {
    const newDirPath = join(filePath, directoryName);
    fs.mkdir(newDirPath, (e) => {
      if (e) {
        return reject(e);
      }
      return resolve();
    });
  });
  emitter.emit('created', filePath);
}

export async function createNewTextFile(filePath, fileNameArg, content = '') {
  let fileName = fileNameArg;
  if (!fileName || await existsPath(join(filePath, fileName))) {
    fileName = await getNewTextFileName(filePath);
  }
  await new Promise((resolve, reject) => {
    fs.writeFile(join(filePath, fileName), content, { encoding: 'utf8' }, (e) => {
      if (e) {
        return reject(e);
      }
      return resolve();
    });
  });
  emitter.emit('created', filePath);
}

export async function escapeShortcut(filePath) {
  const type = getFileType(filePath);
  if (type === 'shortcut') {
    return fetchTextFile(filePath);
  }
  return filePath;
}

export async function renamePath(filePath, newName) {
  await fs.rename(filePath, join(dirname(filePath), newName));
}

export async function moveFile(oldFile, directory) {
  const newFile = join(directory, basename(oldFile));
  await new Promise((resolve) => {
    fs.rename(oldFile, newFile, resolve);
  });
  emitter.emit('deleted', oldFile);
  emitter.emit('created', newFile);
}

export async function copyFile(filePath, directory, overwrite) {
  const fileContent = await fetchFile(filePath);
  let fileName = basename(filePath);
  let targetFile = join(directory, fileName);
  while (!overwrite) {
    targetFile = join(directory, fileName);
    const exists = await existsPath(targetFile);
    if (!exists) {
      break;
    }
    fileName = `copy of ${fileName}`;
  }
  await new Promise((resolve) => {
    fs.writeFile(targetFile, fileContent, {}, resolve);
  });
  emitter.emit('created', targetFile);
  return targetFile;
}

export function reverseSlash(filePath) {
  return filePath.replaceAll('/', '\\');
}

export async function copyDirectory(srcDirectory, dstDirectory) {
  const targetDirectory = join(dstDirectory, basename(srcDirectory));
  if (await existsPath(targetDirectory)) {
    // todo figure out what to do ? replace or rename?
  }
  await makeDirectory(targetDirectory);

  const files = await readDirectory(srcDirectory);
  const handler = async (file) => {
    if (isDirectory(file)) {
      const name = basename(file);
      await copyDirectory(file, join(targetDirectory, name));
    } else {
      await copyFile(file, targetDirectory);
    }
  };
  await Promise.all(files.map(handler));
}

export async function searchInDirectory(path, search, addFile) {
  // todo check is directory

  // parallel walk top to bottom
  const files = await readDirectory(path);

  // search in current directory
  files.filter((p) => {
    const name = basename(p)
      .toLocaleLowerCase();
    return name.includes(search);
  })
    .forEach(addFile);

  const directories = files.filter((p) => isDirectory(p));
  await Promise.all(directories.map((dir) => searchInDirectory(dir, search, addFile)));
}

async function downloadFile(url, path) {
  try {
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    await new Promise((r) => {
      fs.writeFile(path, Buffer.from(data), {}, r);
    });
    emitter.emit('created', path);
  } catch (e) {
    console.error(e);
  }
}

export async function downloadDefaultWallpapers() {
  const basePath = '/C:/Windows/Wallpapers';
  await makeDirectory(basePath);

  const wallpapers = await getWallpapersList();
  const handler = async (wallpaper) => {
    const name = basename(wallpaper);
    const file = join(basePath, name);
    const exists = await existsPath(file);
    if (!exists) {
      return downloadFile(wallpaper, file);
    }
    return Promise.resolve();
  };

  await Promise.all(wallpapers.map(handler));
}

export async function writeBuffer(file, unit8array) {
  await new Promise((r) => {
    fs.writeFile(file, Buffer.from(unit8array), {}, r);
  });
  emitter.emit('created', file);
}

export async function handleDrop(path, files) {
  const handle = async (file) => {
    const unit8array = await new Promise((resolve) => {
      const reader = new FileReader();
      function onload() {
        const arrayBuffer = this.result;
        const array = new Uint8Array(arrayBuffer);
        resolve(array);
      }
      reader.onload = onload;
      reader.readAsArrayBuffer(file);
    });
    const filePath = join(path, file.name);
    await writeBuffer(filePath, unit8array);
  };
  files.forEach(handle);
}

export async function stat(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (e, stats) => {
      if (e) {
        reject(e);
      }
      resolve(stats);
    });
  });
}

export async function initFS() {
  fs = await getFS();
  await populateFS();
}
