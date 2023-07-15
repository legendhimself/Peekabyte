const express = require('express');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const { Readable } = require('stream');

const {
  encodeDataIntoImage,
  decodeDataFromImage,
} = require('./functions/Stegan');
const uploadImage = require('./functions/S3');
const fetchBuffer = require('./functions/fetchBuffer');
const { getBytesAvailable, conceal } = require('./steganography/conceal');
const { reveal } = require('./steganography/reveal');
const { decrypt } = require('./steganography/encryption');
const {
  extractFrames,
  saveVideoBufferToFile,
  encodeDataIntoVideo,
} = require('./steganography/video');
const { writeFile } = require('fs/promises');

const app = express();

app.use(bodyParser.json());

// parse application/json
const upload = multer();

// Define endpoints
app.post('/encodeText', upload.single('image'), async (req, res) => {
  console.log(req.file);
  const { buffer } = req.file;
  const message = req.body.message;
  const password = req.body.password;
  const fileName = req.body.filename;

  if (!message) return res.status(200).send({ error: 'No message provided' });
  if (!password) {
    return res.status(200).send({ error: 'No password provided' });
  }
  if (!fileName) return res.status(200).send({ error: 'No filename provided' });

  try {
    const encodedImage = await encodeDataIntoImage(
      buffer,
      message,
      password,
      false,
    );
    await uploadImage(fileName, encodedImage);
    return res.status(200).send({
      message: 'Image uploaded',
      url: `https://acmmjcet-memorium.s3.eu-central-1.amazonaws.com/${fileName}`,
      error: '',
    });
  } catch (e) {
    return res.status(500).send({ error: e.message });
  }
});

app.post('/decode', async (req, res) => {
  const { url, password } = req.body;
  console.log(url, password);
  if (!url) {
    return res.status(200).send({ message: '', error: 'No url provided' });
  }
  if (!password) {
    return res.status(200).send({ message: '', error: 'No password provided' });
  }
  const decode = await decodeDataFromImage(await fetchBuffer(url), password);
  if (decode === 0)
    return res.status(200).send({ message: '', error: 'Wrong password' });
  console.log(decode, 'decode');
  if (decode instanceof Buffer) {
    res.contentType('image/png');
    return res.send(Buffer.from(decode, 'binary'));
  }
  res.contentType('application/json');
  return res.status(200).send({ error: '', message: decode });
});

app.post('/decodeImage', upload.single('image'), async (req, res) => {
  const { password } = req.body;
  const { buffer } = req.file;

  if (!password) {
    return res.status(200).send({ message: '', error: 'No password provided' });
  }
  const decode = await decodeDataFromImage(buffer, password);
  if (decode === 0)
    return res.status(200).send({ message: '', error: 'Wrong password' });
  console.log(decode, 'decode');
  if (decode instanceof Buffer) {
    res.contentType('image/png');
    return res.send(Buffer.from(decode, 'binary'));
  }
  res.contentType('application/json');
  return res.status(200).send({ error: '', message: decode });
});

app.post(
  '/encodeImage',
  upload.fields([{ name: 'image' }, { name: 'imageToEncode' }]),
  async (req, res) => {
    console.log(req.files);
    const { buffer } = req.files.image[0];
    const { buffer: bufferToEncode } = req.files.imageToEncode[0];
    console.log(buffer, bufferToEncode);
    const password = req.body.password;
    const fileName = req.body.filename;

    if (!password) {
      return res.status(200).send({ error: 'No password provided' });
    }
    if (!fileName)
      return res.status(200).send({ error: 'No filename provided' });

    try {
      const encodedImage = await encodeDataIntoImage(
        buffer,
        bufferToEncode,
        password,
        true,
      );
      await uploadImage(fileName, encodedImage);
      return res.status(200).send({
        message: 'Image uploaded',
        url: `https://acmmjcet-memorium.s3.eu-central-1.amazonaws.com/${fileName}`,
        error: '',
      });
    } catch (e) {
      return res.status(500).send({ error: e.message });
    }
  },
);

app.post('/encodeVideo', upload.single('video'), async (req, res) => {
  const { buffer } = req.file;
  const message = req.body.message;
  const password = req.body.password;
  const fileName = req.body.filename;

  if (!message) return res.status(200).send({ error: 'No message provided' });
  if (!password) {
    return res.status(200).send({ error: 'No password provided' });
  }
  if (!fileName) return res.status(200).send({ error: 'No filename provided' });

  try {
    const [videoBufferEncoded, metadata] = await encodeDataIntoVideo(
      buffer,
      message,
      password,
      false,
    );
    console.log(videoBufferEncoded.length, 'encoded buffer length');
    await saveVideoBufferToFile(videoBufferEncoded, './output.mp4', metadata);
    await uploadImage(fileName, videoBufferEncoded);
    return res.status(200).send({
      message: 'Video uploaded',
      url: `https://acmmjcet-memorium.s3.eu-central-1.amazonaws.com/${fileName}`,
      error: '',
    });
  } catch (e) {
    return res.status(500).send({ error: e.message });
  }
});

app.listen(8989, () => {
  console.log('Server started on port 8989');
});
