const { validationResult } = require("express-validator");
const fs = require("node:fs");
const passportStrategy = require("../config/passportStrategy");
const validators = require("./validators");
const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const upload = require("../config/upload");
const crypto = require("node:crypto");

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
  res.render("index", { user: req.user });
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
      include: { files: true, shares: true },
    });

    if (!folder) return res.redirect("/home");
    return res.render("folder", {
      folder,
      looseFiles: req.user.files,
      folders: req.user.folders,
      url: req.host,
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

exports.renderShareForm = async (req, res, next) => {
  if (!req.isAuthenticated()) return res.redirect("/");
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: Number(req.query.id), user: { id: req.user.id } },
    });

    if (!folder) return res.redirect(req.get("Referrer") || "/home");
    return res.render("share-folder-form", { folder });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

exports.renderShareLink = [
  async (req, res) => {
    const link = req.params.link;
    const share = await prisma.share.findUnique({
      where: { link },
      include: { folder: { include: { files: true } } },
    });
    if (!share) return res.redirect(req.get("Referrer") || "/home");

    return res.render("folder", {
      folder: share.folder,
      shared: true,
    });
  },
];

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

const checkPOSTValidation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).redirect(req.get("Referrer") || "/home");
  }
  next();
};

exports.uploadFile = [
  async (req, res, next) => {
    if (req.isAuthenticated()) return next();
    return res.status(400).redirect("/");
  },
  validators.validateFile,
  checkPOSTValidation,
  upload.single("file"),
  async (req, res) => {
    const { filename, path, size, mimetype, originalname } = req.file;
    const { folderId, name } = req.body;
    const folder = folderId ? { connect: { id: Number(folderId) } } : {};
    const extension = originalname.substring(originalname.lastIndexOf(".") + 1);
    await prisma.file.create({
      data: {
        name,
        filename,
        size,
        mimetype,
        extension,
        path: path.substring(6), // removes public/ from path since express starts there for static assets
        user: { connect: { id: req.user.id } },
        folder,
      },
    });
    res.redirect(req.get("Referrer") || "/home");
  },
];

exports.updateFile = [
  validators.validateFileUpdate,
  checkPOSTValidation,
  async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const { id, name, folderId } = req.body;

    const updateData = { folder: {} };

    if (name) updateData.name = name;
    if (folderId) {
      updateData.folder.connect = { id: Number(folderId) };
    } else {
      updateData.folder.disconnect = true;
    }

    await prisma.file.update({
      where: { id: Number(id) },
      data: updateData,
    });
    res.redirect(req.get("Referrer") || "/home");
  },
];

exports.deleteFile = [
  async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const id = Number(req.params.id);
    const file = await prisma.file.findUnique({ where: { id: id } });

    fs.unlink(`./public${file.path}`, async (e) => {
      if (e) {
        console.error(e);
        next(e);
      }
      await prisma.file.delete({
        where: {
          id,
        },
      });
      res.redirect(req.get("Referrer") || "/home");
    });
  },
];

// folders

exports.createFolder = [
  validators.validateFolder,
  checkPOSTValidation,
  async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const { name } = req.body;
    await prisma.folder.create({
      data: { name, user: { connect: { id: req.user.id } } },
    });
    res.redirect("/home");
  },
];

exports.updateFolder = [
  validators.validateFolderUpdate,
  checkPOSTValidation,
  async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const { name, id, addFileIds, removeFileIds } = req.body;

    const updateData = { files: {} };
    const connectList = [];
    const disconnectList = [];

    if (name) updateData.name = name;
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
      where: { id: Number(id) },
      data: updateData,
    });
    res.redirect(req.get("Referrer") || "/home");
  },
];

exports.deleteFolder = [
  async (req, res) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const id = Number(req.params.id);

    await prisma.folder.delete({
      where: {
        id,
      },
    });

    res.redirect(req.get("Referrer") || "/home");
  },
];

// share links

exports.createShareLink = [
  async (req, res) => {
    if (!req.isAuthenticated()) return res.status(400).redirect("/");
    const { id, duration } = req.body;
    const durationMS = Number(duration) * 24 * 60 * 60 * 1000; // days, hours, min, sec, ms
    const expiresAt = new Date(Date.now().valueOf() + durationMS);
    const link = crypto.randomUUID();
    console.table({ id, expires: expiresAt.toString(), link });
    await prisma.share.create({
      data: { link, expiresAt, folder: { connect: { id: Number(id) } } },
    });

    res.redirect(`/folder/${id}`);
  },
];
