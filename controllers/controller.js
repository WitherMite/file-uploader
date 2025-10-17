const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const passportStrategy = require("../config/passportStrategy");
const validators = require("./validators");
const multer = require("multer");
const prisma = require("../config/db");

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
  if (!req.isAuthenticated()) return res.redirect("/");
  const { username, folders, files } = req.user;
  return res.render("home", { username, folders, files });
};

exports.renderFolder = async (req, res, next) => {
  if (!req.isAuthenticated()) return res.redirect("/");
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: Number(req.params.folderId) },
      include: { files: true },
    });

    if (!folder) return res.redirect("/home");
    return res.render("folder", { folder, looseFiles: req.user.files });
  } catch (e) {
    console.error(e);
    next(e);
  }
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

// files

exports.uploadFile = [
  async (req, res, next) => {
    if (req.isAuthenticated()) return next();
    return res.status(400).redirect("/");
  },
  upload.single("file"),
  async (req, res) => {
    const { filename, path, size, mimetype } = req.file;
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

exports.deleteFile = [];

// folders

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

// TODO: ensure this doesnt try to add a file that has a folder to another, or remove a file not in a folder with custom form validation
exports.updateFolder = [
  async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const { foldername, folderId, addFileIds, removeFileIds } = req.body;

    const updateData = { files: {} };
    const connectList = [];
    const disconnectList = [];

    if (foldername) updateData.name = foldername;
    if (addFileIds) {
      [...addFileIds].forEach((id) => connectList.push({ id: Number(id) }));
      updateData.files.connect = connectList;
    }
    if (removeFileIds) {
      [...removeFileIds].forEach((id) =>
        disconnectList.push({ id: Number(id) })
      );
      updateData.files.disconnect = disconnectList;
    }

    await prisma.folder.update({
      where: { id: Number(folderId) },
      data: updateData,
    });
    res.redirect(req.get("Referrer") || "/home");
  },
];

exports.deleteFolder = [
  async (req, res) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const id = Number(req.params.id);
    const moveFiles = prisma.folder.update({
      where: {
        id,
      },
      data: { files: { set: [] } },
    });

    const deleteFolder = prisma.folder.delete({
      where: {
        id,
      },
    });

    await prisma.$transaction([moveFiles, deleteFolder]);

    res.redirect(req.get("Referrer") || "/home");
  },
];
