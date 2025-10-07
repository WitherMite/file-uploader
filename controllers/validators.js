const { body } = require("express-validator");
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

const checkUsernameUnique = async (val) => {
  const user = await prisma.user.findUnique({ where: { username: val } });
  if (user?.id) {
    throw new Error("Username already in use");
  }
};

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
