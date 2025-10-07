const { validationResult } = require("express-validator");
const { PrismaClient } = require("../generated/prisma");
const bcrypt = require("bcryptjs");
const passportStrategy = require("../config/passportStrategy");
const validators = require("./validators");

const prisma = new PrismaClient();

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
  if (req.isAuthenticated()) res.render("files");
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
