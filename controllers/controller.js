const { validationResult } = require("express-validator");
const { PrismaClient } = require("../generated/prisma");
const bcrypt = require("bcryptjs");
const passportStrategy = require("../config/passportStrategy");
const validators = require("./validators");
const multer = require("multer");

const prisma = new PrismaClient();
const upload = multer({ dest: "public/files/" });

// authentication

exports.loginUser = passportStrategy.authenticate("local", {
  successRedirect: "/files",
  failureRedirect: "/",
});

exports.logoutUser = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
};

// render methods

exports.renderIndex = async (req, res) => {
  res.render("index");
};

exports.renderSignupForm = async (req, res) => {
  res.render("signup-form");
};

exports.renderLoginForm = async (req, res) => {
  res.render("login-form");
};

exports.renderFiles = async (req, res) => {
  if (req.isAuthenticated()) {
    const files = await prisma.file.findMany({
      where: { userId: req.user.id },
    });
    console.table(files);
    return res.render("files", { files });
  }
  return res.redirect("/");
};

// CRUD

exports.createUser = [
  validators.validateUser,
  async (req, res, next) => {
    const { username, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("signup-form", {
        username,
        errorList: errors.array(),
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, password: hashedPassword },
      });
      req.login(user, (e) => {
        if (e) return next(e);
        return res.redirect("/files");
      });
    } catch (e) {
      console.error(e);
      return next(e);
    }
  },
];

exports.uploadFile = [
  async (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(400).redirect("/");
  },
  upload.single("file"),
  async (req, res) => {
    const { filename, path, size, mimetype } = req.file;
    console.table(req.file);
    await prisma.file.create({
      data: {
        filename,
        size,
        mimetype,
        path: path.substring(6), // removes public/ from path since express starts there for static assets
        user: { connect: { id: req.user.id } },
      },
    });
    res.redirect("/files");
  },
];
