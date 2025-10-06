const pool = require("./pool");

exports.getAllValues = async () => {
  const { rows } = await pool.query("SELECT * FROM test");
  return rows;
};
