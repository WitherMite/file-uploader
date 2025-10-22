const { body } = require("express-validator");
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

const checkUsernameUnique = async (val) => {
  const user = await prisma.user.findUnique({ where: { username: val } });
  if (user?.id) {
    throw new Error("Username already in use");
  }
};

const checkAllIds = (array) => array.every((id) => Number(id) % 1 === 0);

exports.validateUser = [
  body("username")
    .trim()
    .isAlpha()
    .isLength({ min: 3, max: 15 })
    .withMessage("Username must be between 3 and 15 characters")
    .bail()
    .custom(checkUsernameUnique),
  body("password")
    .isLength({ min: 6, max: 35 })
    .withMessage("Password must be between 6 and 35 characters"),
  body("confirmPassword")
    .custom((val, { req }) => val === req.body.password)
    .withMessage("Password fields must match"),
];

exports.validateFile = [
  body("folderId").optional().isInt({ min: 0 }),
  body("name").trim(),
];

exports.validateFileUpdate = [this.validateFile, body("id").isInt({ min: 0 })];

exports.validateFolder = [body("name").trim()];

exports.validateFolderUpdate = [
  this.validateFolder,
  body("id").isInt({ min: 0 }),
  body("addFileIds").optional().toArray().custom(checkAllIds),
  body("removeFileIds").optional().toArray().custom(checkAllIds),
];
