<template>
  <div class="VLC-MediaPlayer">
    <video
      ref="video"
      width="300"
      height="300"
      controls="controls"
      autoplay="autoplay"
    />
    <div/>
  </div>
</template>

<script>
import { createFFmpeg } from '@ffmpeg/ffmpeg';
import { Observable, fromEvent, partition, combineLatest, zip, } from 'rxjs';
import { map, flatMap, take, skip, } from 'rxjs/operators';
import { fetchFile } from '../../services/fs';
import { mp4 } from 'mux.js';

export default {
  name: 'VlcMediaPlayer',
  props: {
    filePath: {
      default: null,
      type: Object,
    },
  },
  mounted() {
    this.fetchVideoFile();
  },
  methods: {
    async transcodeVideo(argBuffer) {

      let duration = -1;
      const segment_duration = 1;

      const bufferStream = (sourceBuffer) =>
        new Observable(async subscriber => {
          const ffmpeg = createFFmpeg({
            log: false,
          });

          ffmpeg.setProgress((arg) => {
            if (arg.duration) {
              duration = arg.duration;
            }
          });

          const fileExists = file => ffmpeg.FS('readdir', '/')
            .includes(file);
          const readFile = file => ffmpeg.FS('readFile', file);

          await ffmpeg.load();
          this.onSicktir = () => {
            try {
              ffmpeg.exit();
            } catch (e) {
              console.error(e);
            }
          };

          ffmpeg.FS(
            'writeFile',
            'input.mp4',
            new Uint8Array(sourceBuffer, 0, sourceBuffer.byteLength)
          );

          let index = 0;

          ffmpeg
            .run(
              '-i',
              'input.mp4',
              '-preset',
              'ultrafast',
              '-g',
              '1',
              // Encode for MediaStream
              '-segment_format_options',
              'movflags=frag_keyframe+empty_moov+default_base_moof',
              // encode 5 second segments
              '-segment_time',
              `${segment_duration}`,
              // write to files by index
              '-f',
              'segment',
              '%d.mp4'
            )
            .then(() => {
              // send out the remaining files
              while (fileExists(`${index}.mp4`)) {
                subscriber.next(readFile(`${index}.mp4`));
                index++;
              }
              subscriber.complete();
            });

          this.interval = setInterval(() => {
            // periodically check for files that have been written
            if (fileExists(`${index + 1}.mp4`)) {
              subscriber.next(readFile(`${index}.mp4`));
              index++;
              if (index > 0) {
                ffmpeg.FS('unlink', `${index - 1}.mp4`);
              }
            }
          }, 200);
        });

      const mediaSource = new MediaSource();
      const videoPlayer = this.$refs.video;
      videoPlayer.src = URL.createObjectURL(mediaSource);
      videoPlayer.loop = true;
      videoPlayer.play();

      const mediaSourceOpen = fromEvent(mediaSource, 'sourceopen');

      const bufferStreamReady = combineLatest(
        mediaSourceOpen,
        bufferStream(argBuffer)
      )
        .pipe(map(([, a]) => a));

      const sourceBufferUpdateEnd = bufferStreamReady.pipe(
        take(1),
        map(buffer => {
          // create a buffer using the correct mime type
          const mime = `video/mp4; codecs="${mp4.probe
            .tracks(buffer)
            .map(t => t.codec)
            .join(',')}"`;
          const sourceBuf = mediaSource.addSourceBuffer(mime);

          // append the buffer
          mediaSource.duration = segment_duration;
          sourceBuf.timestampOffset = 0;
          sourceBuf.appendBuffer(buffer);

          // create a new event stream
          return fromEvent(sourceBuf, 'updateend')
            .pipe(map(() => sourceBuf));
        }),
        flatMap(value => value)
      );

      zip(sourceBufferUpdateEnd, bufferStreamReady.pipe(skip(1)))
        .pipe(
          map(([sourceBuf, buffer]) => {
            let append_duration = segment_duration;
            if (mediaSource.duration + segment_duration > duration) {
              append_duration = duration - mediaSource.duration;
            }
            mediaSource.duration += append_duration;
            sourceBuf.timestampOffset += append_duration;
            sourceBuf.appendBuffer(buffer.buffer);
          })
        )
        .subscribe();
    },
    async fetchVideoFile() {
      const fileBuffer = await fetchFile(this.filePath);
      const supportedMime = this.mediaPlayerSupported(fileBuffer);
      console.log('Fucking support', supportedMime);
      if (supportedMime) {
        this.$refs.video.src = URL.createObjectURL(new Blob([fileBuffer]));
        this.$refs.video.play();
      } else {
        await this.transcodeVideo(fileBuffer);
      }
    },
    mediaPlayerSupported(arg) {
      console.log('check', mp4.probe.tracks(arg));
      const mimeCodec = `video/mp4; codecs="${mp4.probe
        .tracks(arg)
        .map(t => t.codec)
        .join(',')}"`;
      if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
        return mimeCodec;
      } else {
        console.error('Unsupported MIME type or codec: ', mimeCodec);
        return false;
      }
    }
  },
  beforeUnmount() {
    clearInterval(this.interval);
    this.onSicktir();
  },
  data() {
    return {
      onSicktir: () => {
      },
      interval: null,
    };
  }
};
</script>

<style lang="scss">
.VLC-MediaPlayer {
  background: black;

  video {
    width: 100%;
    height: 100%;
  }
}
</style>
