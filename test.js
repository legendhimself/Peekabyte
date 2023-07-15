const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const { Readable } = require('stream');
const {
  encodeDataIntoImage,
  decodeDataFromImage,
} = require('./src/functions/Stegan');

(async () => {
  const frameBuffers = await extractFrames('./video.mp4');
  // modify them here if needed
  encodeVideo(frameBuffers, './output.mp4');
})();

function extractFrames(inputFilePath) {
  return new Promise((resolve, reject) => {
    let bufferStream = new stream.PassThrough();

    const frameBuffers = [];

    ffmpeg(inputFilePath)
      .on('error', (err) => {
        console.error(`Error during frame extraction: ${err.message}`);
      })
      .on('end', () => {
        console.log(`Extracted ${frameBuffers.length} frames`);
      })
      .outputFormat('image2pipe')
      .writeToStream(bufferStream);
    bufferStream.on('data', (data) => {
      frameBuffers.push(data);
    });
    bufferStream.on('end', (d) => {
      resolve(frameBuffers);
    });
  });
}

function encodeVideo(frameBuffers, outputPath) {
  ffmpeg(Readable.from(Buffer.concat(frameBuffers)))
    .on('error', (err) => {
      console.error('An error occurred while encoding the video:', err);
    })
    .on('end', () => {
      console.log('Video encoding completed successfully.');
    })
    .output(outputPath)
    .run();
}
