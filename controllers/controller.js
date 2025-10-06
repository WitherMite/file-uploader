const db = require("../db/queries");

exports.getIndex = async (req, res) => {
  const values = await db.getAllValues();
  res.render("index", { values });
};
