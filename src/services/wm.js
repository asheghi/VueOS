import { reactive } from 'vue';
import UnknownIcon from '../assets/icons/unknown.png?url';
import { escapeShortcut, fetchTextFile } from './fs';
import { getAppsForFilePath, getAppWindowProperties } from './apps';
import getDialogWindowProperties, { getOpenWithDialogWindowProperties } from '../utils/dialog';
import { getFileType } from '../utils/utils';
import { getConfigItem, setConfig } from './cnf';

export const state = reactive({
  started: false,
});

export const startWindowManager = () => {
  state.started = true;
};

export const markedFiles = reactive({
  cutList: [],
  copyList: [],
});

export const unmarkFiles = () => {
  markedFiles.cutList = [];
  markedFiles.copyList = [];
};

export const markFileForCopy = (filePath) => {
  markedFiles.copyList.push(filePath);
  markedFiles.cutList = [];
};

export const markFileForCut = (filePath) => {
  markedFiles.cutList.push(filePath);
  markedFiles.copyList = [];
};

export const contextMenu = reactive({
  visible: false,
  items: [],
  event: null,
  onClick: null,
});

export const openContextMenu = (event, items, handler) => {
  contextMenu.event = event;
  contextMenu.onClick = handler;
  setTimeout(() => {
    contextMenu.visible = true;
    contextMenu.items = items;
  });
};

export const closeContextMenu = () => {
  contextMenu.visible = false;
  contextMenu.onClick = null;
  contextMenu.items = [];
};

export const windows = reactive({
  list: [],
});

let latestZIndex = 20;

export const calculateAppWindowProperties = async (appName, filePath) => {
  const windowProperties = await getAppWindowProperties(appName, filePath) || {};
  const getOr = (value, defaultvalue) => (typeof value === 'undefined' ? defaultvalue : value);
  const width = getOr(windowProperties.width, 400);
  const height = getOr(windowProperties.height, 400);
  const hidden = getOr(windowProperties.hidden, false);
  if (!hidden) {
    latestZIndex += 1;
  }
  return {
    ...windowProperties,
    title: windowProperties.title,
    maximizable: getOr(windowProperties.maximizable, true),
    closable: getOr(windowProperties.closable, true),
    minimizable: getOr(windowProperties.minimizable, true),
    movable: true,
    maximized: getOr(windowProperties.maximized, false),
    minimized: getOr(windowProperties.maximized, false),
    resizable: getOr(windowProperties.resizable, true),
    hidden,
    width,
    height,
    left: (window.innerWidth / 2) - (width / 2) + (Math.random() * 20) - 10,
    top: (window.innerHeight / 2) - (height / 2) + (Math.random() * 20) - 10,
    icon: getOr(windowProperties.icon, UnknownIcon),
    zIndex: hidden ? -1 : latestZIndex,
    isSystemApp: windowProperties.isSystemApp,
  };
};

function makeWindow(windowProperties) {
  const id = `w-${Date.now()}-${Math.random()}`;
  const win = {
    id,
    ...windowProperties,
  };

  return win;
}

function getWinByName(appName) {
  return windows.list.find((it) => it.appName === appName);
}

async function openWindow(filePath, appName, fileType) {
  const windowProperties = await calculateAppWindowProperties(appName, filePath);
  windowProperties.appName = appName;
  windowProperties.callbacks = {};

  if (fileType !== 'app') {
    windowProperties.filePath = filePath;
  }

  if (windowProperties.singleInstance) {
    const win = getWinByName(appName);
    if (win) {
      if (win.callbacks && win.callbacks.openFile && typeof win.callbacks.openFile === 'function') {
        win.callbacks.openFile(filePath);
        return;
      }
    }
  }
  const win = makeWindow(windowProperties);
  windows.list.push(win);
}

export const showOpenWithDialog = (apps, handler, options) => {
  const base = getOpenWithDialogWindowProperties();
  const windowProperties = {
    title: 'Open With',
    autoClose: true,
    zIndex: latestZIndex,
    apps,
    onAppSelected: handler,
    ...base,
    ...options,
  };

  const win = makeWindow(windowProperties);
  windows.list.push(win);
};

export async function openFile(fileArg, appNameArg) {
  const filePath = await escapeShortcut(fileArg);
  const fileType = getFileType(filePath);
  let appName = appNameArg;
  if (fileType === 'app') {
    appName = await fetchTextFile(filePath);
  }
  if (!appNameArg && !appName) {
    const apps = await getAppsForFilePath(filePath);
    if (!apps.length) {
      throw new Error('cannot open this file');
    }
    if (apps.length > 1) {
      // open with dialog
      const configKey = `open-${fileType}-with`;
      const alwaysApp = getConfigItem(configKey, null);
      if (alwaysApp) {
        await openFile(filePath, alwaysApp);
      } else {
        const onAppSelected = (app, remember) => {
          openFile(filePath, app);
          if (remember) {
            setConfig({ [configKey]: app });
          }
        };
        showOpenWithDialog(apps, onAppSelected, { filePath });
      }
      return;
    }
    const [first] = apps;
    appName = first;
  }
  await openWindow(filePath, appName, fileType);
}

// triggers open with dialog
export async function openFileWith(fileArg) {
  const filePath = await escapeShortcut(fileArg);
  const fileType = getFileType(filePath);
  const apps = await getAppsForFilePath(filePath);

  const configKey = `open-${fileType}-with`;
  const onAppSelected = (app, remember) => {
    openFile(filePath, app);
    if (remember) {
      setConfig({ [configKey]: app });
    }
  };
  showOpenWithDialog(apps, onAppSelected, { filePath });
}

export const openDialog = (options) => {
  const base = getDialogWindowProperties(options.type || 'warning');
  const windowProperties = {
    type: 'warning',
    content: '---',
    buttons: ['OK'],
    title: 'Dialog',
    defaultInput: '',
    autoClose: true,
    zIndex: latestZIndex,
    onClick: () => {
    },
    ...base,
    ...options,
  };

  const win = makeWindow(windowProperties);
  windows.list.push(win);
};

export const findWindowById = (id, returnIndex = false) => windows.list[returnIndex ? 'findIndex' : 'find']((win) => win.id === id);

export const closeWindow = (id) => {
  const theWinIndex = findWindowById(id, true);
  if (theWinIndex !== -1) {
    windows.list.splice(theWinIndex, 1);
  }
};

export const minimizeWindow = (id, _newValue) => {
  const theWin = findWindowById(id);
  const newValue = typeof _newValue !== 'boolean' ? !theWin.minimized : _newValue;
  latestZIndex += 1;
  theWin.zIndex = newValue ? -1 : latestZIndex;
  theWin.minimized = newValue;
};

export const updateTitle = (id, title) => {
  const theWin = findWindowById(id);
  theWin.title = title;
};

export const updateToolbarTitle = (id, title) => {
  const theWin = findWindowById(id);
  theWin.taskbarTitle = title;
};

export const maximizeWindow = (id, _newValue) => {
  const theWin = findWindowById(id);
  if (theWin.minimized) {
    minimizeWindow(id, false);
  }
  const newValue = typeof _newValue !== 'boolean' ? !theWin.maximized : _newValue;
  latestZIndex += 1;
  theWin.zIndex = latestZIndex;
  theWin.maximized = newValue;
};

export const focusWindow = (id) => {
  const theWin = findWindowById(id);
  if (theWin) {
    latestZIndex += 1;
    theWin.zIndex = latestZIndex;
  }
};

export const isWindowFocused = (id) => {
  const win = findWindowById(id);
  if (win) {
    const max = Math.max(...windows.list.map((w) => w.zIndex));
    return max !== -1 && max === win.zIndex;
  }
  return false;
};
