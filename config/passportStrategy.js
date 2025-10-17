const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");

passport.use(
  new LocalStrategy(async (username, password, callback) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          folders: { include: { files: true } },
          files: { where: { folderId: null } },
        },
      });

      if (!user) {
        return callback(null, false, { message: "Incorrect username." });
      }

      const matches = await bcrypt.compare(password, user.password);

      if (!matches) {
        return callback(null, false, { message: "Incorrect password." });
      }

      return callback(null, user);
    } catch (e) {
      return callback(e);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        folders: { include: { files: true } },
        files: { where: { folderId: null } },
      },
    });

    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
