import { extname } from 'path-browserify';

export const typeOf = (x) => toString.call(x)
  .match(/\s([a-zA-Z]+)/)[1];

export const each = (obj, cb) => (typeOf(obj) === 'Object' ? Object.keys(obj)
  .forEach((key) => cb(key, obj[key])) : obj.forEach(cb));

export const asyncEach = (obj, cb) => new Promise((resolve) => {
  const keys = typeOf(obj) === 'Object' ? Object.keys(obj) : obj;
  const doAction = (index) => cb(
    ...(
      typeOf(obj) === 'Object' ? [obj[keys[index]], keys[index]] : [keys[index], index]
    ),
  )
    .then(() => {
      if (index === keys.length - 1) {
        resolve();
      } else {
        doAction(index + 1);
      }
    });
  doAction(0);
});

export const offsetTo = (el, parent) => {
  let eli = el;
  const ret = {
    left: 0,
    top: 0,
  };
  const sibil = parent === null;
  while (eli && eli !== parent) {
    ret.left += eli[sibil ? 'offsetWidth' : 'offsetLeft'];
    ret.top += eli[sibil ? 'offsetHeight' : 'offsetTop'];
    eli = eli[sibil ? 'previousElementSibling' : 'offsetParent'];
  }
  return ret;
};

export function formatNumberInDigits(number, digits) {
  return number.toLocaleString('en-US', {
    minimumIntegerDigits: digits,
    useGrouping: false,
  });
}

export function formatSeconds(arg) {
  const d = Number(arg);
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor((d % 3600) % 60);

  const hDisplay = h > 0 ? `${formatNumberInDigits(h, 2)}:` : '';
  const mDisplay = m > 0 ? `${formatNumberInDigits(m, 2)}:` : '00:';
  const sDisplay = s > 0 ? formatNumberInDigits(s, 2) : '00';
  return hDisplay + mDisplay + sDisplay;
}

export function isDirectory(filePath) {
  return !extname(filePath);
}

export function getFileType(filePath) {
  if (isDirectory(filePath)) {
    return 'directory';
  }

  const ext = extname(filePath)
    .replace('.', '');

  if (['mp4', 'avi', 'mpg', 'mpeg', 'mov', 'mkv', 'mxu'].includes(ext)) {
    return 'video';
  }

  if (['mp3', 'ogg', 'wma', 'wpl', 'mpa', 'mid', 'cda'].includes(ext)) {
    return 'audio';
  }
  if (['png', 'ai', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'ps', 'psd', 'svg', 'tif', 'tiff'].includes(ext)) {
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
