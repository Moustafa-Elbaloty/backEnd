const MAX_SIZE = 10 * 1024 * 1024;

const getSize = (base64) =>
  Buffer.byteLength(base64.split(",")[1], "base64");

const isImage = (b64) =>
  b64.startsWith("data:image/jpeg") || b64.startsWith("data:image/png");

const isPDF = (b64) => b64.startsWith("data:application/pdf");

module.exports = { getSize, isImage, isPDF, MAX_SIZE };
