const crypto = require("crypto");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { UPLOAD_MESSAGES } = require("../constants/messages");

// Product images go to this Cloudinary folder only.
const UPLOAD_FOLDER = "products";
const ALLOWED_FIELDS = ["folder"];

const createUploadSignature = (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const unexpected = Object.keys(body).filter((key) => !ALLOWED_FIELDS.includes(key));
  if (unexpected.length > 0 || (body.folder !== undefined && body.folder !== UPLOAD_FOLDER)) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: UPLOAD_MESSAGES.INVALID_PARAMETERS });
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res
      .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
      .json({ message: UPLOAD_MESSAGES.NOT_CONFIGURED });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${UPLOAD_FOLDER}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest("hex");

  return res.status(HTTP_STATUS.OK).json({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder: UPLOAD_FOLDER,
  });
};

module.exports = { createUploadSignature };
