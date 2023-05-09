'use strict';
const { request } = require('undici');
const fetchBuffer = async (input) => {
  if (!input) return null;
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === 'string' && input.startsWith('http')) {
    const res = await request(input);
    const arrBuffer = await res.body.arrayBuffer();
    return Buffer.from(arrBuffer);
  }
};

module.exports = fetchBuffer;
