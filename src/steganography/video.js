const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const { Readable } = require('stream');

function extractFrames(input) {
  return new Promise((resolve, reject) => {
    let bufferStream = new stream.PassThrough();
    let frameBuffers = [];
    console.log('input', input);
    ffmpeg(input)
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
      ffmpeg.ffprobe(input, async (e, data) => {
        if (e) throw new Error(e);
        resolve([frameBuffers, data]);
      });
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

async function saveVideoBufferToFile(videoBuffer, outputPath, metadata) {
  const videoStream = metadata.streams[0];

  const videoOptions = [
    '-c:v libx264', // Set the video codec to libx264
    '-s ' + videoStream.width + 'x' + videoStream.height, // Set the video resolution
    '-r ' + videoStream.r_frame_rate, // Set the video frame rate
    // bit deapth
    '-pix_fmt yuv420p', // Set the pixel format
  ];

  await new Promise((resolve, reject) => {
    ffmpeg(Readable.from(videoBuffer))
      .outputOption(videoOptions)
      .on('error', (err) => {
        console.error('An error occurred while saving the video to file:', err);
        reject(err);
      })
      .on('end', () => {
        console.log('Saving the video to file completed successfully.');
        resolve();
      })
      .output(outputPath)
      .run();
  });

  // ffmpeg.ffprobe(outputPath, async (e, data) => {
  //   if (e) throw new Error(e);
  //   console.log('data', data);
  // });
}

// (async () => {
//   const password = 'pure is dumb';
//   const dataToInsert = 'Vox is pro';
//   const [videoBufferEncoded, metadata] = await encodeDataIntoVideo(
//     './video.mp4',
//     dataToInsert,
//     password,
//     false,
//   );
//   console.log(videoBufferEncoded.length, 'encoded buffer length');
//   await saveVideoBufferToFile(videoBufferEncoded, './output.mp4', metadata);

//   // Await the encoding and saving operations to complete
//   const [encodedVideoFrames, _] = await extractFrames('./output.mp4');
//   console.log(encodedVideoFrames[0].length, 'encoded frame length');
//   await writeFile('encodedFrame.png', encodedVideoFrames[0]);

//   // Use a for loop instead of forEach to enable proper async/await usage
//   let index = 0;
//   for (const encodedVideoFrame of encodedVideoFrames) {
//     try {
//       fs.writeFile(
//         './outframes/frame' + index + '.png',
//         encodedVideoFrame,
//         function (err) {
//           if (err) throw err;
//         },
//       );
//       index++;
//       // console.log(
//       //   password,
//       //   await decodeDataFromImage(
//       //     await sharp(encodedVideoFrame).png().toBuffer(),
//       //     password,
//       //   ),
//       //   'here',
//       // );
//     } catch (e) {
//       console.log(e);
//     }
//   }
// })();

async function encodeDataIntoVideo(videoPath, data, password, isTheDataImage) {
  let [frames, metadata] = await extractFrames(videoPath);
  console.log(
    frames[0].length,
    Buffer.concat(frames).length,
    'extracted frames',
  );
  await writeFile('normalFrame.png', frames[0]);

  if (isTheDataImage) {
    const isDecodedPNG = await sharp(data)
      .metadata()
      .then((metadata) => metadata.format === 'png')
      .catch(() => false);

    if (!isDecodedPNG) {
      data = await sharp(data).png().toBuffer();
    }
  } else data = Buffer.from(data);
  const encodedFrames = [];
  for (const [index, frame] of frames.entries()) {
    if (!data || data.length == 0) return;
    try {
      const encodedFrame = await encodeDataIntoImage(
        frame,
        data,
        password,
        false,
      );

      encodedFrames.push(encodedFrame);
      // save the frame using fs
      fs.writeFile(
        './frames/frame' + index + '.png',
        encodedFrame,
        function (err) {
          if (err) throw err;
        },
      );
    } catch (e) {
      console.log(e);
    }
  }

  return [Buffer.concat(encodedFrames), metadata];
}

module.exports = {
  extractFrames,
  encodeVideo,
  saveVideoBufferToFile,
  encodeDataIntoVideo,
};
