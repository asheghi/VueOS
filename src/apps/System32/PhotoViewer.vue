<template>
  <div class="PhotoViewer">
    <div class="imageContainer">
      <div class="white">
        <div
          v-if="loading"
          class="loading"
        >
          Loading ...
        </div>
        <div
          ref="imageContainer"
          class="image-container"
          :class="{realSize:realSize,zoomMode,}"
          @contextmenu="openContextMenu"
        >
          <img
            v-if="!loading && src"
            ref="image"
            :src="src"
            alt=""
            :style="imageStyleObj"
          >
        </div>
      </div>
    </div>
    <div class="controls">
      <div class="rounded">
        <div class="left">
          <div class="zoom">
            <img
              width="24"
              :src="IconZoomIn"
              alt=""
              @click="switchZoom"
            >
            <div
              v-if="zoomMode"
              class="zoom-slider"
            >
              <input
                v-model="zoom"
                type="range"
                orient="vertical"
                min="1"
                max="100"
              >
            </div>
          </div>
          <div
            class="size"
            @click="switchMode"
          >
            <img
              width="24"
              :src="IconZoomFit"
              alt=""
            >
          </div>
        </div>
        <div class="center">
          <div
            class="previous"
            :class="!prevImage ? 'disable' : ''"
            @click="showPrev"
          >
            <IconPrev/>
          </div>
          <div
            class="playSlide"
            @click="showSlide"
          >
            <div class="buttonPlay">
              <img
                width="32"
                :src="IconImage"
                alt=""
              >
            </div>
          </div>
          <div
            class="next"
            :class="!nextImage ? 'disable' : ''"
            @click="showNext"
          >
            <IconNext/>
          </div>
        </div>
        <div class="right">
          <div
            class="rotate-left"
            @click="rotateLeft"
          >
            <img
              width="24"
              :src="IconRotateLeft"
              alt=""
            >
          </div>
          <div
            class="rotate-right"
            @click="rotateRight"
          >
            <img
              width="24"
              :src="IconRotateRight"
              alt=""
            >
          </div>
          <div class="divider"/>
          <div
            class="delete"
            @click="showDeleteDialog"
          >
            <IconDelete/>
          </div>
        </div>
      </div>
    </div>
    <teleport
      v-if="slideShowMode"
      to="body"
    >
      <div
        class="PhotoViewer_slide-show"
        @click="showNext"
      >
        <img
          v-if="!loading && src"
          ref="imageSlideShow"
          :src="src"
          alt=""
          :class="realSize"
        >
      </div>
    </teleport>
  </div>
</template>

<script>
import { basename, dirname } from 'path-browserify';
import Image from 'image-js';
import {
  deleteFile, escapeShortcut, fetchFile, readDirectory, writeBuffer,
} from '../../services/fs';
import IconZoomIn from '../../assets/icons/zoom-in.png';
import IconZoomFit from '../../assets/icons/zoom-fit-best.png';
import IconImage from '../../assets/icons/jpg.png';
import IconRotateLeft from '../../assets/icons/object-rotate-left.png';
import IconRotateRight from '../../assets/icons/object-rotate-right.png';
import { closeWindow, openDialog } from '../../services/wm';
import IconRecycleBin from '../../assets/icons/trashcan_full.png';
import { getFileType } from '../../utils/utils';
import IconDelete from './IconDelete.vue';
import IconPrev from './IconPrev.vue';
import IconNext from './IconNext.vue';
import { props } from '../../utils/vue';

export default {
  name: 'PhotoViewer',
  components: { IconNext, IconPrev, IconDelete },
  inject: ['$wm', '$cnf', '$fs'],
  ...props({
    filePath: props.obj(null),
    wmId: props.any(),
  }),
  data() {
    return {
      src: null,
      realSize: null,
      currentFile: this.filePath,
      IconZoomIn,
      IconZoomFit,
      IconImage,
      IconRotateLeft,
      IconRotateRight,
      loading: false,
      images: [],
      slideShowMode: false,
      zoomMode: false,
      zoom: 10,
      imageHasListener: false,
    };
  },
  computed: {
    indexInSiblings() {
      const current = this.currentFile;
      return this.images.findIndex((f) => basename(f) === basename(current));
    },
    nextImage() {
      if (!this.images || !this.images.length) return null;
      if (this.indexInSiblings !== this.images.length - 1) {
        return this.images[this.indexInSiblings + 1];
      }
      return this.images[0];
    },
    prevImage() {
      if (!this.images || !this.images.length) return null;
      if (this.indexInSiblings !== 0) {
        return this.images[this.indexInSiblings - 1];
      }
      return this.images[this.images.length - 1];
    },
    imageStyleObj() {
      const style = {};
      if (this.zoomMode) {
        const scale = this.zoom / 10;
        const img = this.$refs.image;
        const realWidth = img.naturalWidth;
        const realHeight = img.naturalHeight;
        style.width = `${parseInt(realWidth * scale, 10)}px`;
        style.height = `${parseInt(realHeight * scale, 10)}px`;
      }
      return style;
    },
  },
  watch: {
    currentFile(n, o) {
      this.updateWindowTitle();
      if (n && n !== o) {
        this.fetchImageFile();
      }
    },
  },
  mounted() {
    this.fetchImageFile();
    this.fetchSiblingFiles();
    this.updateWindowTitle();
    document.addEventListener('keydown', this.onKeyboardKeyDown);
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKeyboardKeyDown);
  },
  methods: {
    async fetchImageFile() {
      if (!this.currentFile) {
        return;
      }
      if (this.currentFile.startsWith('/')) {
        this.loading = true;
        this.src = null;
        try {
          const path = await escapeShortcut(this.currentFile);
          const type = getFileType(path);
          if (type === 'image') {
            const buffer = await fetchFile(path, { encode: 'unit8array' });
            this.src = URL.createObjectURL(new Blob([buffer]));
          }
          // image scroll
          if (!this.imageHasListener) {
            this.imageHasListener = true;
            this.registerImageDrag();
          }
        } catch (e) {
          console.error(e);
        } finally {
          this.loading = false;
        }
      }
    },
    async fetchSiblingFiles() {
      const files = await readDirectory(dirname(this.filePath));
      this.images = [];
      const handler = async (file) => {
        const type = await getFileType(file);
        if (type === 'image') {
          this.images.push(file);
        }
      };
      await Promise.all(files.map(handler));
    },
    showNext() {
      if (this.nextImage) {
        this.currentFile = this.nextImage;
      } else {
        const [first] = this.images;
        this.currentFile = first;
      }
    },
    showPrev() {
      if (this.prevImage) {
        this.currentFile = this.prevImage;
      }
    },
    async rotateRight() {
      this.loading = true;
      const data = await fetchFile(this.currentFile);
      const image = await Image.load(data);
      const rotated = image.rotate(90)
        .toBuffer();
      await writeBuffer(this.currentFile, rotated);
      await this.fetchImageFile();
    },
    async rotateLeft() {
      this.loading = true;
      const data = await fetchFile(this.currentFile);
      const image = await Image.load(data);
      const rotated = image.rotate(-90)
        .toBuffer();
      await writeBuffer(this.currentFile, rotated);
      await this.fetchImageFile();
    },
    showDeleteDialog() {
      // todo implement recycle bin
      openDialog({
        title: 'Delete File',
        content: 'Are you sure you want to delete this file?',
        buttons: ['Yes', 'No'],
        onClick: (btn) => {
          if (btn === 'Yes') {
            this.deleteImage();
          }
        },
        icon: IconRecycleBin,
        type: 'delete',
      });
    },
    async deleteImage() {
      await deleteFile(this.currentFile);
      if (this.nextImage) {
        this.showNext();
      } else if (this.prevImage) {
        this.showPrev();
      } else {
        closeWindow(this.wmId);
      }
    },
    requestFullscreen() {
      const elem = this.$refs.image;
      const method = elem.requestFullscreen
        || elem.webkitRequestFullscreen
        || elem.msRequestFullscreen;
      if (method) {
        method.call(elem);
      }
    },
    showSlide() {
      this.slideShowMode = true;
    },
    exitSlideShow() {
      this.slideShowMode = false;
    },
    onKeyboardKeyDown(event) {
      const { code } = event;

      if (code === 'ArrowLeft') {
        this.showPrev();
      }
      if (code === 'ArrowRight') {
        this.showNext();
      }
      if (code === 'Space') {
        this.slideShowMode = true;
      }
      if (code === 'Escape') {
        this.slideShowMode = false;
      }
    },
    switchMode() {
      this.realSize = Boolean(!this.realSize);
      this.$forceUpdate();
    },
    switchZoom() {
      this.zoomMode = Boolean(!this.zoomMode);
    },
    registerImageDrag() {
      const imageContainerEl = this.$refs.imageContainer;

      let pos = {
        top: 0,
        left: 0,
        x: 0,
        y: 0,
      };
      let mouseIsDown = false;
      const mouseMoveHandler = (e) => {
        e.preventDefault();
        if (!mouseIsDown) {
          return;
        }
        // How far the mouse has been moved
        const dx = e.clientX - pos.x;
        const dy = e.clientY - pos.y;

        // Scroll the element
        imageContainerEl.scrollTop = pos.top - dy;
        imageContainerEl.scrollLeft = pos.left - dx;
      };
      const mouseUpHandler = () => {
        mouseIsDown = false;
        imageContainerEl.style.cursor = 'auto';
        imageContainerEl.style.removeProperty('user-select');

        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
      imageContainerEl.addEventListener('mouseleave', () => {
        mouseIsDown = false;
        imageContainerEl.style.cursor = 'auto';
        imageContainerEl.style.removeProperty('user-select');
      });
      const mouseDownHandler = (e) => {
        mouseIsDown = true;
        pos = {
          // The current scroll
          left: imageContainerEl.scrollLeft,
          top: imageContainerEl.scrollTop,
          // Get the current mouse position
          x: e.clientX,
          y: e.clientY,
        };

        imageContainerEl.style.cursor = 'grabbing';
        imageContainerEl.addEventListener('mousemove', mouseMoveHandler);
        imageContainerEl.addEventListener('mouseup', mouseUpHandler);
      };
      imageContainerEl.addEventListener('mousedown', mouseDownHandler);
      imageContainerEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.zoom = Math.min(100, this.zoom + this.zoom / 10);
        } else if (e.deltaY > 0) {
          this.zoom = Math.max(1, this.zoom - this.zoom / 10);
        }
      });
    },
    updateWindowTitle() {
      this.$wm.updateTitle(this.wmId, `${basename(this.currentFile)}  - Photo Viewer`);
      this.$wm.updateToolbarTitle(this.wmId, this.currentFile ? basename(this.currentFile) : 'Photo Viewer');
    },
    openContextMenu(e) {
      const CHANGE_WALLPAPER = 'Set as Wallpaper';
      const items = [CHANGE_WALLPAPER];
      const handler = async (item) => {
        if (item === CHANGE_WALLPAPER) {
          // instant change
          this.$cnf.setConfig({
            wallpaperPath: this.currentFile,
          });
          // then copy after change so user won't notice any lag
          const copied = await this.$fs.copyFile(this.currentFile, '/C:/Windows/Wallpapers', true);
          this.$cnf.setConfig({
            wallpaperPath: copied,
          });
        }
      };
      this.$wm.openContextMenu(e, items, handler);
    },
  },
};
</script>

<style lang="scss">
.PhotoViewer {
  $controlsHeight: 60px;
  position: relative;

  .imageContainer {
    height: 100%;
    text-align: center;
    padding-bottom: $controlsHeight;

    .white {
      height: 100%;
      background: white;
    }

    .image-container {
      width: 100%;
      height: 100%;

      &.realSize {
        overflow: auto;

        img {
          width: unset;
          height: unset;
          object-fit: unset;
        }
      }

      &.zoomMode {
        overflow: scroll;

        & {
          display: block;
          justify-content: center;
          align-items: center;
        }

        img {
          margin: 0 !important;
          width: unset;
          height: unset;
          object-fit: unset;
        }
      }
    }

    img {
      transition: all ease-out 400ms;
      height: 100%;
      width: 100%;
      object-fit: contain;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }

  .controls {
    position: absolute;
    z-index: 1;
    bottom: 0;
    left: 0;
    right: 0;
    height: $controlsHeight;

    display: flex;
    justify-content: center;
    align-items: center;

    .rounded {
      background: rgba(white, .1);
      height: 36px;
      min-width: 400px;
      color: white;
      border: 1px solid rgba(black, .2);
      border-radius: 4rem;
      backdrop-filter: blur(1px) brightness(2);

      display: flex;

      .center, .left, .right {
        flex: 1;
        display: flex;
        align-items: center;
      }

      .left, .right {
        justify-content: space-around;
      }

      .left {
        .zoom, .size {
          transition: background-color ease-in 360ms;
          padding: 4px 6px;
          border-radius: 4px;
          background: transparent;

          &:hover {
            background: linear-gradient(180deg,
              rgba(250, 255, 255, 0.4) 0%,
              rgba(241, 255, 246, 0.3) 40%,
              rgba(165, 175, 175, 0.5) 55%,
              rgba(198, 198, 204, 0.3) 80%,
              rgba(229, 234, 255, 0.4) 100%
            );
          }
        }

        .zoom {
          margin-right: -26px;
          position: relative;

          .zoom-slider {
            background: rgba(white, .8);
            border-radius: 8px;
            padding: 4px;
            position: absolute;
            left: -160px;
            top: 4px;
          }
        }
      }

      .center {
        .previous, .next {
          padding: 0 4px;

          svg {
            fill: #1963b2;
          }
        }

        .playSlide {
          text-align: center;
          width: 34px;
          height: 34px;

          position: relative;

          .buttonPlay {
            position: absolute;
            top: -4px;
            left: -5px;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 3;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            border: 1px solid rgba(black, .3);

            background: linear-gradient(180deg,
              rgba(209, 236, 255, 0.8) 0%,
              rgba(0, 62, 255, 0.7) 40%,
              rgba(0, 21, 175, 0.9) 55%,
              rgba(107, 223, 255, 0.7) 90%,
              rgba(0, 210, 255, 0.9) 100%
            );

            transition: 200ms;

            &:hover {
              filter: brightness(1.2);
            }

            img {
              width: 24px;
              height: 24px;
              margin-bottom: 8px;
            }
          }
        }

        .previous, .next {
          padding: 0 16px;

          border: 1px solid rgba(black, .3);
          background: linear-gradient(180deg,
            rgba(250, 255, 255, 0.4) 0%,
            rgba(241, 255, 246, 0.3) 40%,
            rgba(165, 175, 175, 0.5) 55%,
            rgba(198, 198, 204, 0.3) 80%,
            rgba(229, 234, 255, 0.4) 100%
          );

          transition: 200ms;

          &:hover {
            background: linear-gradient(180deg,
              rgba(250, 255, 255, 0.8) 0%,
              rgba(241, 255, 246, 0.7) 40%,
              rgba(165, 175, 175, 0.9) 55%,
              rgba(198, 198, 204, 0.7) 80%,
              rgba(229, 234, 255, 0.8) 100%
            );
          }

          &.disable:hover {
            background: linear-gradient(180deg,
              rgba(250, 255, 255, 0.4) 0%,
              rgba(241, 255, 246, 0.3) 40%,
              rgba(165, 175, 175, 0.5) 55%,
              rgba(198, 198, 204, 0.3) 80%,
              rgba(229, 234, 255, 0.4) 100%
            );
          }
        }

        .next {
          border-top-right-radius: 16px;
          border-bottom-right-radius: 16px;
          border-left: 0;
        }

        .previous {
          border-top-left-radius: 16px;
          border-bottom-left-radius: 16px;
          border-right: 0;
        }
      }

      .right {
        margin: 0 16px;

        .divider {
          width: 1px;
          background: rgba(black, .5);
          height: 22px;
          margin-right: 10px;
        }
      }

      .right {
        .rotate-left, .rotate-right {
          img {
            margin: 0;
            width: 24px;
            height: 24px;
          }
        }

        .rotate-right, .rotate-left, .delete {
          transition: background-color ease-in 360ms;
          border-radius: 4px;
          padding: 4px 6px;

          &:hover {
            background: linear-gradient(180deg,
              rgba(250, 255, 255, 0.4) 0%,
              rgba(241, 255, 246, 0.3) 40%,
              rgba(165, 175, 175, 0.5) 55%,
              rgba(198, 198, 204, 0.3) 80%,
              rgba(229, 234, 255, 0.4) 100%
            );
          }
        }
      }
    }
  }
}

.PhotoViewer_slide-show {
  background: black;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;

  img {
    height: 100%;
    width: 100%;
    object-fit: contain;
  }
}
</style>
