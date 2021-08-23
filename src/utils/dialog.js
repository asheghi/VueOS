import ErrorIcon from '../assets/icons/error.png';
import InfoIcon from '../assets/icons/info.png';
import WarningIcon from '../assets/icons/warning.png';
import QuestionIcon from '../assets/icons/question.png';

const typeToIconMap = {
  error: ErrorIcon,
  info: InfoIcon,
  warning: WarningIcon,
  question: QuestionIcon,
};

export default function getDialogWindowProperties(type) {
  const width = 500;
  const height = 200;
  return {
    appName: 'Dialog',
    isSystemApp: true,
    maximizable: false,
    closable: true,
    minimizable: true,
    movable: true,
    maximized: false,
    minimized: false,
    resizable: false,
    hidden: false,
    width,
    height,
    left: (window.innerWidth / 2) - (width / 2) + (Math.random() * 20) - 10,
    top: (window.innerHeight / 2) - (height / 2) + (Math.random() * 20) - 10,
    icon: typeToIconMap[type],
  };
}
