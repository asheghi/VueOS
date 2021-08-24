<template>
  <div class="OpenWithDialog">
    <div class="head">
      <img
        width="36"
        height="36"
        class="thumbnail"
        :src="thumbnail"
        alt=""
      >
      <h1 class="filename">
        {{ fileName }}
      </h1>
    </div>
    <div class="remember" v-if="options && options.length">
      <input
        id="always"
        :checked="always"
        @change="always = $event.target.checked"
        type="checkbox"
        name="always"
      >
      <label for="always">Always open with</label>
    </div>
    <div
      v-if="loading"
      class="loading"
    >
      Loading ...
    </div>
    <div
      v-if="!loading && options.length"
      class="apps"
    >
      <div
        v-for="(app,key) in options"
        :key="key"
        class="app"
        @click="onAppClicked(app)"
      >
        <img
          class="appIcon"
          width="36"
          height="36"
          :src="app.icon"
          alt=""
        >
        <h2 class="appTitle">
          {{ app.title && app.title.trim() ? app.title : app.name }}
        </h2>
      </div>
    </div>
    <div v-if="!loading && !options.length" class="no-options">
      <h3>no application available to open this file.</h3>
    </div>
  </div>
</template>

<script>
import { basename } from 'path-browserify';
import { getAppWindowProperties, getFileThumbnail } from '../../services/apps';
import IconDefaultFile from '../../assets/icons/unknown.png';
import { closeWindow } from '../../services/wm';

export default {
  name: 'OpenWithDialog',
  props: {
    apps: {
      type: Array,
      required: true,
    },
    onAppSelected: {
      type: Function,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    wmId: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      thumbnail: IconDefaultFile,
      always: false,
      loading: false,
      options: [],
    };
  },
  computed: {
    fileName() {
      return basename(this.filePath);
    },
  },
  created() {
    this.updateThumbnail();
    this.calculateOptions();
  },
  methods: {
    async updateThumbnail() {
      this.thumbnail = await getFileThumbnail(this.filePath);
    },
    async calculateOptions() {
      const handler = async (app) => {
        const { icon, title } = await getAppWindowProperties(app, this.filePath);
        return { icon, title, name: app };
      };
      this.loading = true;
      this.options = await Promise.all(this.apps.map(handler));
      this.loading = false;
    },
    onAppClicked(app) {
      closeWindow(this.wmId);
      this.onAppSelected(app.name, this.always);
    },
  },
};
</script>

<style lang="scss">
.OpenWithDialog{
  background: white;
  padding: 16px;

  .head{
    display: flex;
    align-items: center;
    img{
      margin-right: 1rem;
    }
    .filename{
      font-size: 18px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-weight: 500;
      color: #1963b2;
    }
  }

  .remember{
    display: flex;
    align-items: center;
    margin-top: 1rem;
    font-size: 16px;
    label{
      margin-left: .25em;
    }
    input[type=checkbox]{
      font-size: 22px;
      width: 18px;
      height: 18px;
    }
  }
  .loading{
    padding: 1rem;
  }
  .apps{
    margin-top: 1rem;
    .app{
      display: flex;
      align-items: center;
      margin: 0 -16px;
      margin-bottom: .5rem;

      padding: 8px 16px;

      .appIcon{
        width: 42px;
        height: 42px;
      }

      .appTitle{
        margin-left: .5em;
        font-size: 16px;
      }

      &:hover{
        cursor: pointer;
        background: rgba(black,.06);

        .appTitle{
          color: #1963b2;
        }
      }
    }
  }
  .no-options{
    margin-top: 4rem;
  }
}
</style>
