module.exports = async function handler(req, res) {
  res.json({ status: "ok", time: Date.now() });
};
