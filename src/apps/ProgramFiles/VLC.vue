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
    this.doTheWork();
  },
  methods: {
    async doTheWork() {
      console.log('doing the thing');

      let duration = -1;
      const segment_duration = 1;

      const bufferStream = () =>
        new Observable(async subscriber => {
          const ffmpeg = createFFmpeg({
            log: false,
          });

          ffmpeg.setProgress((arg) => {
            // console.log('progress:', arg);
            if (arg.duration) {
              duration = arg.duration;
              console.log('Video Duration is:', duration);
            }
          });

          const fileExists = file => ffmpeg.FS('readdir', '/')
            .includes(file);
          const readFile = file => ffmpeg.FS('readFile', file);

          await ffmpeg.load();
          const sourceBuffer = await fetchFile(this.filePath);
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

          setInterval(() => {
            // periodically check for files that have been written
            if (fileExists(`${index + 1}.mp4`)) {
              subscriber.next(readFile(`${index}.mp4`));
              index++;
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
        bufferStream()
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
            console.log('appending Buffer:', buffer.length / 1024);
            console.log('mediaSource.duration is:', mediaSource.duration);

            let append_duration = segment_duration;
            if (mediaSource.duration + segment_duration > duration) {
              append_duration = duration - mediaSource.duration;
              if(append_duration > 1) append_duration -= 1;
              console.log('last segment!', append_duration);
            }
            console.log('append duration', append_duration);
            mediaSource.duration += append_duration;
            sourceBuf.timestampOffset += append_duration;
            sourceBuf.appendBuffer(buffer.buffer);
          })
        )
        .subscribe();
    },
  },
  beforeUnmount() {
    this.onSicktir();
  },
  data() {
    return {
      onSicktir: () => {
      }
    };
  }
};
</script>

<style lang="scss">
.VLC-MediaPlayer {
  padding: 1rem;
  background: white;

  video {
    width: 100%;
    height: 100%;
  }
}
</style>
