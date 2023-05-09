const sharp = require('sharp');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { reveal, conceal } = require('../steganography/main');

const encodeDataIntoImage = async (
  imageData,
  dataToEncode,
  password,
  isImage,
) => {
  const isPNG = await sharp(imageData)
    .metadata()
    .then((metadata) => metadata.format === 'png')
    .catch(() => false);

  if (isImage) {
    const isDecodedPNG = await sharp(dataToEncode)
      .metadata()
      .then((metadata) => metadata.format === 'png')
      .catch(() => false);

    if (!isDecodedPNG) {
      dataToEncode = await sharp(dataToEncode).png().toBuffer();
    }
  }

  if (!isPNG) imageData = await sharp(imageData).png().toBuffer();
  const encodedImage = conceal(password)(imageData, dataToEncode);
  return encodedImage;
};

const decodeDataFromImage = async (imageData, password) => {
  const isPNG = await sharp(imageData)
    .metadata()
    .then((metadata) => metadata.format === 'png')
    .catch(() => false);

  if (!isPNG) return 'Not a PNG image';
  try {
    const decodedData = reveal(password)(imageData);

    const isDecodedPNG = await sharp(decodedData)
      .metadata()
      .then((metadata) => metadata.format === 'png')
      .catch(() => false);

    console.log(isDecodedPNG);
    if (isDecodedPNG) return decodedData;
    return decodedData.toString();
  } catch (e) {
    console.log(e);
    return 0;
  }
};

module.exports = {
  encodeDataIntoImage,
  decodeDataFromImage,
};
