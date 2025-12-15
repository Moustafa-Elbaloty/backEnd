const { isImage, isPDF, getSize, MAX_SIZE } = require("../utils/validateBase64");

const validateUploads = (req, res, next) => {
  const { idCard, commercialReg } = req.body;

  if (!idCard || !isImage(idCard) || getSize(idCard) > MAX_SIZE) {
    return res.status(400).json({ message: "Invalid idCard" });
  }

  if (!commercialReg || !isPDF(commercialReg) || getSize(commercialReg) > MAX_SIZE) {
    return res.status(400).json({ message: "Invalid commercialReg" });
  }

  next();
};

module.exports = validateUploads;
