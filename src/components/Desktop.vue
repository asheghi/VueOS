<template>
  <div
    ref="desktop"
    :class="$style.desktop"
  >
    <FilesContainer
      path="/C:/User/Desktop"
      direction="column"
      :file-props="{ shadow: true }"
      :context-menu-extras="contextMenuExtras"
    />
  </div>
</template>

<script>
import { fitSize } from '../styles/common';
import { inject } from '../utils/vue';
import { panelSize } from '../styles/constants';
import FilesContainer from './FilesContainer.vue';
import { fetchFile } from '../services/fs';
import DefaultWallpaper from '../assets/images/Wallpapers/1.jpg?url';

export default {
  name: 'Desktop',
  components: {
    FilesContainer,
  },
  ...inject('$wm', '$fs', '$cnf'),
  style({ className }) {
    return [
      className('desktop', {
      //  background: `url("${WallpaperImage}")`,
        position: 'absolute',
        ...fitSize,
        paddingBottom: panelSize,
        backgroundPosition: 'bottom center',
        backgroundSize: 'cover',
      }),
    ];
  },
  data() {
    return {
      wallpaper: null,
    };
  },
  computed: {
    wallpaperFile() {
      return this.$cnf.values.wallpaperPath;
    },
    contextMenuExtras() {
      return {
        'Change Background': this.openChangeBackground,
      };
    },
  },
  watch: {
    // eslint-disable-next-line func-names
    '$cnf.values.wallpaperPath': function () {
      this.loadWallpaper();
    },
  },
  async mounted() {
    this.loadWallpaper();
  },
  methods: {
    openChangeBackground() {
      this.$wm.openFile('/C:/Windows/System32/ChangeBackground.exe');
    },
    async loadWallpaper() {
      if (this.wallpaperFile) {
        const buffer = await fetchFile(this.wallpaperFile);
        const src = URL.createObjectURL(new Blob([buffer]));
        this.$refs.desktop.style.backgroundImage = `url("${src}")`;
      } else {
        this.$refs.desktop.style.backgroundImage = `url("${DefaultWallpaper}")`;
      }
    },
  },
};
</script>
