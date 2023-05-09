'use strict';
require('dotenv/config');
const { S3 } = require('aws-sdk');

const s3 = new S3({
  accessKeyId: process.env.accessKeyId,
  secretAccessKey: process.env.secretAccessKey,
});

const uploadImage = async (filename, data) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: filename,
    Body: data,
  };

  return s3.upload(params).promise();
};

module.exports = uploadImage;
