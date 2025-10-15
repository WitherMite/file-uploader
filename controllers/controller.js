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
  successRedirect: "/home",
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

exports.renderHomepage = async (req, res) => {
  if (req.isAuthenticated()) {
    const { username, folders, files } = req.user;
    console.table(files);
    return res.render("home", { username, folders, files });
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
        return res.redirect("/home");
      });
    } catch (e) {
      console.error(e);
      return next(e);
    }
  },
];

exports.createFolder = [
  async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const { name } = req.body;
    await prisma.folder.create({
      data: { name, user: { connect: { id: req.user.id } } },
    });
    res.redirect("/home");
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
    res.redirect("/home");
  },
];

// TODO: ensure this doesnt try to add a file that has a folder to another with a custom form validation fn
exports.addFilesToFolder = [
  async (req, res, next) => {
    const { folderId, fileIds } = req.body;
    const connectList = [];
    [...fileIds].forEach((id) => connectList.push({ id: Number(id) }));
    await prisma.folder.update({
      where: { id: Number(folderId) },
      data: {
        files: {
          connect: connectList,
        },
      },
    });
    res.redirect("/home");
  },
];
