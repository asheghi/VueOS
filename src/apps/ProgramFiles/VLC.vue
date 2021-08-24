<template>
  <div>
    vlc should play this file :{{ filePath }}
    <div/>
  </div>
</template>

<script>
export default {
  name: 'VlcMediaPlayer',
  props: {
    filePath: {
      default: null,
      type: Object,
    },
  },
};
</script>

<style scoped>

</style>
