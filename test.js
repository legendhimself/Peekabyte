const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const sharp = require('sharp');
const { Readable } = require('stream');
const {
  encodeDataIntoImage,
  decodeDataFromImage,
} = require('./src/functions/Stegan');

const extractFramesFromVideo = () => {
  // Input video file
  const inputFilePath = './input.mp4';

  // Create a writable stream to store the frame buffers
  const frameBuffers = [];

  // Use fluent-ffmpeg to extract frames from the input video and pass them to the writable stream
  ffmpeg(inputFilePath)
    .on('error', (err) => {
      console.error(`Error during frame extraction: ${err.message}`);
    })
    .on('end', () => {
      console.log(`Extracted ${frameBuffers.length} frames`);
      encodeVideo(frameBuffers);
    })
    .outputFormat('image2pipe')
    .outputOptions('-vf', 'fps=30')
    .outputOptions('-pix_fmt', 'rgb24')
    .pipe(
      stream.Writable({
        write: (chunk, encoding, callback) => {
          frameBuffers.push(chunk);
          callback();
        },
        final: () => {},
      }),
    );
};
const encodeVideo = (frameBuffers) => {
  const width = 640;
  const height = 480;
  const frameRate = 30;
  const videoBitrate = 1000;
  const command = ffmpeg()
    .on('error', (err) => {
      console.error('An error occurred while encoding the video:', err);
    })
    .on('end', () => {
      console.log('Video encoding completed successfully.');
    })
    .input(Readable.from(frameBuffers))
    .inputOptions([`-r ${frameRate}`])
    .outputOptions('-vf', 'fps=30')
    .outputOptions('-pix_fmt', 'rgb24')
    .outputOptions([`-s ${width}x${height}`, `-b:v ${videoBitrate}k`])
    .output(
      stream.Writable({
        write: (chunk, encoding, callback) => {
          console.log(chunk);
          callback();
        },
        final: (e, c, d) => {
          console.log(e, c, d);
        },
      }),
    )
    .run();
};
(async () => {
  extractFramesFromVideo();
})();
