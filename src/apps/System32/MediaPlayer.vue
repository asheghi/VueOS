<template>
  <div
    ref="wrapper"
    style="width: 100%;height: 100%;position: relative;"
    tabIndex="0"
  >
    <teleport
      to="body"
      :disabled="!fullScreen"
    >
      <div
        ref="container"
        class="MediaPlayer"
        :style="mediaPlayerStyle"
        :class="mediaPlayerClass()"
      >
        <div
          ref="mediaCotainer"
          class="media-container"
        >
          <img
            v-if="coverImage"
            :class="' ' + fileType + ' '"
            class="coverImage"
            :src="coverImage"
            alt=""
          >
          <video
            ref="audio"
            :class="' ' + fileType + ' '"
            name="media"
          />
        </div>
        <div class="shadow-controls"/>
        <div class="controls">
          <div class="progress">
            <input
              ref="progress"
              type="range"
              demo="colors"
              min="0"
              value="0"
              :max="duration"
              @change="seekTo($event.target.value)"
              @mousedown="seeking = true"
              @mouseup="seeking = false"
              @mouseleave="seeking = false"
            >
          </div>
          <div class="rounded-left">
            {{ formattedCurrentTime }}
          </div>
          <div class="rounded">
            <div class="left">
              <div
                class="shuffle"
                :class="{active:shuffle}"
                @click="shuffle = !shuffle"
              >
                <IconShuffle/>
              </div>
              <div
                class="repeat"
                :class="{active : repeat}"
                @click="repeat = !repeat"
              >
                <IconRepeat/>
              </div>
              <div
                class="stop"
                @click="onStopClicked"
              >
                <IconStop/>
              </div>
            </div>
            <div class="center">
              <div
                class="previous"
                @click="playPrev"
              >
                <IconPrevious/>
              </div>
              <div
                class="play"
                @click="togglePlayPause"
              >
                <div
                  class="image"
                  alt=""
                >
                  <img
                    class="idle"
                    :src="playing ? Pause : PlayIdle"
                    alt=""
                  >
                  <img
                    class="hover"
                    :src="playing ? Pause : PlayIdle"
                    alt=""
                  >
                  <img
                    class="active"
                    :src="playing ? Pause : PlayIdle"
                    alt=""
                  >
                </div>
              </div>
              <div
                class="next"
                @click="playNext"
              >
                <IconNext/>
              </div>
            </div>
            <div class="right">
              <div
                class="volume"
                @wheel="onVolumeWheelMove"
              >
                <div
                  v-if="volume === 0"
                  class="mute"
                  @click="toggleMute"
                >
                  <IconMute/>
                </div>
                <div
                  v-if="volume > 0 && volume < .3"
                  class="low"
                  @click="toggleMute"
                >
                  <IconVolumeLow/>
                </div>
                <div
                  v-if="volume >= .3 && volume <= .6"
                  class="medium"
                  @click="toggleMute"
                >
                  <IconVolumeMedium/>
                </div>
                <div
                  v-if="volume > .6"
                  class="high"
                  @click="toggleMute"
                >
                  <IconVolumeHigh/>
                </div>
              </div>
              <input
                v-model="volume"
                class="volume-range"
                type="range"
                min="0"
                max="1"
                step="0.05"
                @wheel="onVolumeWheelMove"
                @change="onVolumeChange"
              >
            </div>
          </div>
          <div class="rounded-right">
            <div
              v-if="!fullScreen"
              class="full-screen"
              @click="fullScreen = true"
            >
              <IconFullscreen/>
            </div>
            <div
              v-if="fullScreen"
              class="exit-full-screen"
              @click="fullScreen = false"
            >
              <IconExitFullscreen/>
            </div>
          </div>
        </div>
        <div class="shadow-top">
          <div class="title">
            {{ title }}
          </div>
          <div class="album">
            {{ album }}
          </div>
        </div>
        <div
          v-if="loading"
          class="loading"
        >
          <h1>Loading ...</h1>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import debounce from 'lodash.debounce';
import { parseBuffer as metaDataParseBuffer } from 'music-metadata';
import { basename, dirname } from 'path-browserify';
import { props } from '../../utils/vue';
import { escapeShortcut, fetchFile, readDirectory } from '../../services/fs';
import PlayNormal from '../../assets/icons/media-player/play-normal.png';
import PlayIdle from '../../assets/icons/media-player/play-idle.png';
import PlayHover from '../../assets/icons/media-player/play-hover.png';
import PlayMuted from '../../assets/icons/media-player/play-muted.png';
import WallPaper from '../../assets/images/wmp_12_wallpaper.jpg';
import Pause from '../../assets/icons/media-player/pause.png';
import { formatSeconds, getFileType } from '../../utils/utils';
import IconShuffle from './MediaPlayer/IconShuffle.vue';
import IconRepeat from './MediaPlayer/IconRepeat.vue';
import IconStop from './MediaPlayer/IconStop.vue';
import IconPrevious from './MediaPlayer/IconPrevious.vue';
import IconNext from './MediaPlayer/IconNext.vue';
import IconMute from './MediaPlayer/IconMute.vue';
import IconVolumeLow from './MediaPlayer/IconVolumeLow.vue';
import IconVolumeMedium from './MediaPlayer/IconVolumeMedium.vue';
import IconVolumeHigh from './MediaPlayer/IconVolumeHigh.vue';
import IconFullscreen from './MediaPlayer/IconFullscreen.vue';
import IconExitFullscreen from './MediaPlayer/IconExitFullscreen.vue';

export default {
  components: {
    IconExitFullscreen,
    IconFullscreen,
    IconVolumeHigh,
    IconVolumeMedium,
    IconVolumeLow,
    IconMute,
    IconNext,
    IconPrevious,
    IconStop,
    IconRepeat,
    IconShuffle,
  },
  inject: ['$wm', '$cnf', '$fs'],
  ...props({
    filePath: props.obj(null),
    wmId: props.any(),
    callbacks: props.any(),
  }),
  data() {
    return {
      src: null,
      currentFile: this.filePath,
      loading: true,
      siblings: [],
      imageHasListener: false,
      PlayNormal,
      PlayIdle,
      PlayHover,
      PlayMuted,
      Pause,
      volume: 1,
      fullScreen: false,
      media: {},
      currentTime: 0,
      playing: false,
      seeking: false,
      duration: 1800,
      coverImage: null,
      lastVolume: null,
      formattedCurrentTime: '00:00',
      repeat: true,
      shuffle: false,
      title: '',
      album: '',
      debouncedResize: debounce(this.onContainerResize, 250),
      fileType: '',
    };
  },
  computed: {
    indexInSiblings() {
      const current = this.currentFile;
      return this.siblings.findIndex((f) => basename(f) === basename(current));
    },
    nextFile() {
      if (!this.siblings || !this.siblings.length) return null;
      if (this.shuffle && this.siblings.length > 1) {
        const others = this.siblings.filter((it) => it !== this.currentFile);
        return others[Math.floor(Math.random() * others.length)];
      }
      if (this.indexInSiblings !== this.siblings.length - 1) {
        return this.siblings[this.indexInSiblings + 1];
      }
      return this.siblings[0];
    },
    prevFile() {
      if (!this.siblings || !this.siblings.length) return null;
      if (this.shuffle && this.siblings.length > 1) {
        const others = this.siblings.filter((it) => it !== this.currentFile);
        return others[Math.floor(Math.random() * others.length)];
      }
      if (this.indexInSiblings !== 0) {
        return this.siblings[this.indexInSiblings - 1];
      }
      return this.siblings[this.siblings.length - 1];
    },
    durationSeconds() {
      return this.$refs.audio.duration;
    },
    mediaPlayerStyle() {
      return {
        backgroundImage: `url("${WallPaper}")`,
        '--play-hover': `url("${PlayHover}")`,
        '--play-click': `url("${PlayNormal}")`,
        '--play-idle': `url("${PlayIdle}")`,
      };
    },
  },
  mounted() {
    this.fetchMediaFile();
    new ResizeObserver(this.debouncedResize).observe(this.$refs.container);
    this.registerKeyboardMouse();
  },
  async created() {
    this.callbacks.openFile = (file) => {
      this.currentFile = file;
      this.fetchMediaFile();
    };
  },
  methods: {
    onStopClicked() {
      this.$refs.audio.pause();
      this.$nextTick(() => {
        this.$refs.audio.currentTime = 0;
        this.$refs.progress.value = '0';
      });
    },
    playNext() {
      if (this.nextFile) {
        this.currentFile = this.nextFile;
        this.fetchMediaFile();
      }
    },
    playPrev() {
      if (this.prevFile) {
        this.currentFile = this.prevFile;
        this.fetchMediaFile();
      }
    },
    async fetchMediaFile() {
      this.fileType = getFileType(this.currentFile);
      this.loading = true;
      this.src = null;
      try {
        const path = await escapeShortcut(this.currentFile);
        // todo check weather file can be opened
        const buffer = await fetchFile(path, { encode: 'unit8array' });
        const video = this.$refs.audio;
        video.src = URL.createObjectURL(new Blob([buffer]));

        this.initMedia();

        this.getMetaData(buffer);

        try {
          await video.play();
        } catch (e) {
          console.error(e);
        }
      } catch (e) {
        console.error(e);
      } finally {
        this.loading = false;
      }
      this.fetchSiblingFiles();
    },
    initMedia() {
      this.volume = this.$refs.audio.volume;

      const updateProgress = () => {
        if (!this.seeking && this.$refs.audio) {
          this.$refs.progress.value = this.$refs.audio.currentTime;
        }
        this.formattedCurrentTime = formatSeconds(this.$refs.audio.currentTime);
      };
      this.$refs.audio.ontimeupdate = debounce(updateProgress, 500, { maxWait: 500 });
      this.$refs.audio.onplay = () => {
        this.playing = true;
      };
      this.$refs.audio.onpause = () => {
        this.playing = false;
      };

      this.$refs.audio.onended = () => {
        this.$refs.audio.currentTime = 0;
        if (this.repeat) {
          this.$refs.audio.play();
        }
      };

      this.$refs.audio.ondurationchange = () => {
        this.duration = this.$refs.audio.duration;
      };
    },
    seekTo(value) {
      const time = +value;
      if (this.$refs.audio.seekable) {
        this.$refs.audio.currentTime = time;
      } else {
        console.error('cannot seek');
      }
    },
    togglePlayPause() {
      if (this.$refs.audio.paused) {
        this.$refs.audio.play();
      } else {
        this.$refs.audio.pause();
      }
    },
    async getMetaData(buffer) {
      // todo figure out what to do with videos?!
      const data = await metaDataParseBuffer(new Uint8Array(buffer));
      const common = data.common || {};
      const pictures = common.picture || [];
      if (pictures[0]) {
        const cover = pictures[0];
        this.coverImage = URL.createObjectURL(new Blob([cover.data]));
      }
      if (common.artist && common.title) {
        this.title = `${common.artist} - ${common.title}`;
      } else {
        this.title = basename(this.currentFile);
      }
      this.album = common.album;

      this.$wm.updateToolbarTitle(this.wmId, this.title);
    },
    onVolumeChange($event) {
      this.$refs.audio.volume = +$event.target.value;
      this.volume = this.$refs.audio.volume;
    },
    onVolumeWheelMove(e) {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.modifyVolume(true);
      } else if (e.deltaY > 0) {
        this.modifyVolume(false);
      }
    },
    toggleMute() {
      const media = this.$refs.audio;
      if (this.lastVolume === null) {
        this.lastVolume = 1;
      }
      if (media.volume !== 0) {
        this.lastVolume = media.volume;
      }
      media.volume = media.volume > 0 ? 0 : this.lastVolume;
      this.volume = media.volume;
    },
    onContainerResize() {
      if (this.$refs.container) {
        this.containerWidth = this.$refs.container.clientWidth;
      }
    },
    mediaPlayerClass() {
      let c = '';
      if (this.containerWidth < 450) {
        c += ' w-small ';
      } else if (this.containerWidth >= 450 && this.containerWidth < 580) {
        c += ' w-medium ';
      } else {
        c += ' w-large ';
      }
      if (this.fullScreen) {
        c += ' fullscreen ';
      }
      return c;
    },
    async fetchSiblingFiles() {
      const files = await readDirectory(dirname(this.filePath));
      this.siblings = [];
      const handler = async (file) => {
        const type = await getFileType(file);
        if (['audio', 'video'].includes(type)) {
          this.siblings.push(file);
        }
      };
      await Promise.all(files.map(handler));
    },
    registerKeyboardMouse() {
      const onkeydown = (e = {}) => {
        const { code } = e;
        if (!code) return;
        if (code === 'Space') {
          this.togglePlayPause();
        }
        if (code === 'Escape') {
          if (this.fullScreen) this.toggleFullscreen();
        }
        if (code === 'KeyM') {
          this.toggleMute();
        }
        if (code === 'Enter') {
          this.toggleFullscreen();
        }
        if (code === 'KeyN') {
          this.playNext();
        }
        if (code === 'KeyP') {
          this.playPrev();
        }
        if (code === 'KeyS') {
          this.shuffle = !this.shuffle;
        }
        if (code === 'KeyR') {
          this.repeat = !this.repeat;
        }
        if (code === 'ArrowRight') {
          const curretnTime = this.getCurrentTime();
          this.seekTo(curretnTime + 10);
        }
        if (code === 'ArrowLeft') {
          const curretnTime = this.getCurrentTime();
          this.seekTo(curretnTime - 10);
        }
        if (code === 'ArrowUp') {
          this.modifyVolume(true);
        }
        if (code === 'ArrowDown') {
          this.modifyVolume(false);
        }
      };
      this.$refs.wrapper.onkeydown = onkeydown;

      this.$refs.wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
      }, { capture: true });

      this.$refs.wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        const userData = e.dataTransfer.getData('text');
        if (userData) {
          const [first] = JSON.parse(userData)
            .filter((it) => {
              const fileType = getFileType(it);
              return ['audio', 'video'].includes(fileType);
            });
          if (first) {
            this.callbacks.openFile(first);
          }
        }
      }, { capture: true });
    },
    toggleFullscreen() {
      this.fullScreen = !this.fullScreen;
    },
    getCurrentTime() {
      return this.$refs.audio.currentTime;
    },
    modifyVolume(goUp) {
      const vol = this.$refs.audio.volume;
      let newVal = this.$refs.audio.volume;
      if (goUp) {
        newVal = vol + 0.1;
      } else {
        // go down
        newVal = vol - 0.1;
      }
      if (newVal > 1) {
        newVal = 1;
      } else if (newVal < 0) {
        newVal = 0;
      }
      this.$refs.audio.volume = newVal;
      this.volume = this.$refs.audio.volume;
    },
  },
  style({ className }) {
    return [
      className('player', {
        background: '#f1f3f4',
        width: '100%',
        padding: '15px 0',
      }),
    ];
  },
};
</script>
<style lang="scss">
.MediaPlayer {
  width: 100%;
  height: 100%;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;

  &.fullscreen {
    height: 100vh;
  }

  background-color: black;
  position: relative;
  color: white;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;

  .loading {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;

    color: white;
    font-size: 22px;
  }

  .media-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-height: 300px;

    .coverImage {
      z-index: 0;
      max-width: 100%;
      max-height: 100%;
      min-width: 300px;
      min-height: 300px;

      &.video {
        display: none;
      }
    }

    video {
      width: 100%;
      max-width: 100%;
      height: auto;
      max-height: 100%;

      &.audio {
        display: none;
      }

      &.video {
        display: block;
      }
    }
  }

  &:hover {
    .controls, .shadow-controls, .shadow-top {
      opacity: 1;
    }
  }

  .controls {
    position: absolute;
    bottom: 0;
    height: 50px;
    width: 100%;

    transition: opacity ease-in 360ms;
    opacity: 0;

    display: flex;
    justify-content: center;

    .rounded-left, .rounded-right {
      align-items: center;
      height: 24px;
      margin-top: 2px;

      display: none;
    }

    .rounded {
      margin: 0 16px;
      background: rgba(white, .15);
      border-radius: 32px;
      height: 36px;
      display: flex;

      min-width: 260px;

      display: flex;
      justify-content: center;

      .left {
        width: 120px;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          fill: white;
        }

        .shuffle, .repeat {
          display: none;
        }

        .shuffle, .repeat, .stop {
          padding: 4px;
          background: transparent;
          transition: background ease-in 360ms;
        }

        .shuffle {
          margin-right: 8px;
          transform: rotate(-90deg);

          svg {
            width: 20px;
            height: 20px;
            transform: scaleY(1.2);
          }

          &.active {
            background: radial-gradient(circle,
              rgba(255, 255, 255, 0.5212270329507549) 0%,
              rgba(0, 115, 203, 0.51) 32%,
              rgba(255, 255, 255, 0) 70%);
          }
        }

        .stop {
          svg {
            margin-top: 4px;
          }
        }

        .repeat {
          margin-right: 8px;

          svg {
            margin-top: 4px;
            width: 20px;
            height: 20px;
          }

          &.active {
            background: radial-gradient(circle,
              rgba(255, 255, 255, 0.5212270329507549) 0%,
              rgba(0, 115, 203, 0.51) 22%,
              rgba(255, 255, 255, 0) 70%);
          }
        }
      }

      .center {
        display: flex;
        align-items: center;
        justify-content: center;

        .previous, .next {
          display: flex;
          align-items: center;
          padding: 0 18px;

          svg {
            fill: white;
          }
        }

        .play {
          .image {
            clip-path: circle(40% at 50% 50%);
            width: 54px;
            height: 54px;
            background-image: var(--play-idle);
            position: relative;

            img {
              width: 54px;
              height: 54px;
              position: absolute;
              transition: opacity ease-in 100ms;
            }

            &:hover {
              .idle {
                opacity: 0.01;
              }

              .hover {
                opacity: 1;
              }
            }

            &:active {
              .idle {
                opacity: 0.01;
              }

              .active {
                opacity: 1;
              }
            }

            .hover {
              opacity: .01;
            }

            .active {
              opacity: .01;
            }
          }
        }

        .previous {
          margin-right: -6px;
          border-top-left-radius: 32px;
          border-bottom-left-radius: 32px;

          border: 1px solid rgba(white, .2);
          border-right: 0;

          &:hover {
            background: linear-gradient(270deg,
              rgba(white, 0) 0%,
              rgba(white, .1) 10%,
              rgba(white, .2) 100%
            );
          }
        }

        .next {
          margin-left: -6px;
          border-top-right-radius: 32px;
          border-bottom-right-radius: 32px;

          border: 1px solid rgba(white, .2);
          border-left: 0;

          &:hover {
            background: linear-gradient(90deg,
              rgba(white, 0) 0%,
              rgba(white, .1) 10%,
              rgba(white, .2) 100%
            );
          }
        }
      }

      .right {
        width: 120px;
        display: flex;
        justify-content: space-around;
        align-items: center;

        .volume {
          margin-right: 6px;
          margin-left: 8px;
          display: flex;
          min-width: 24px;

          svg {
            fill: white;
            width: 18px;
            height: 18px;
          }
        }

        .volume-range {
          display: none;
          width: 60px;
          margin-right: 12px;
        }
      }
    }

    .rounded-right {
      justify-content: end;
      margin-left: 12px;

      svg {
        fill: white;
      }
    }
  }

  .progress {
    position: absolute;
    bottom: 54px;
    left: 0;
    right: 0;
    padding: 4px 16px;

    input {
      width: 100%;
    }
  }

  .shadow-controls {
    transition: opacity ease-in 360ms;
    opacity: 0;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100px;
    background: linear-gradient(0,
      rgba(black, .95) 0%,
      rgba(black, .6) 70%,
      rgba(black, 0) 100%
    );
  }

  .shadow-top {
    transition: opacity ease-in 360ms;
    opacity: 0;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2;
    height: 100px;
    background: linear-gradient(180deg,
      rgba(black, 1) 0%,
      rgba(black, .8) 20%,
      rgba(black, 0) 100%
    );
    padding-left: 16px;
    padding-top: 6px;

    .title, .album {
      margin-top: 6px;
      overflow: hidden;
      text-transform: capitalize;
      max-width: 100%;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &.w-medium, &.w-large {
    .shuffle, .repeat {
      display: flex !important;
    }

    .volume-range {
      display: block !important;
    }
  }

  &.w-large {
    .rounded-left, .rounded-right {
      display: flex !important;
    }
  }
}
</style>
