export default function playSound(soundSrc) {
  const audioTag = document.createElement('audio');
  audioTag.src = soundSrc;

  audioTag.play()
    .catch(() => {
      window.addEventListener('click', () => {
        playSound(soundSrc);
      }, { once: true });
    });
}
