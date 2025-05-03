module.exports = (req, res, next) => {
    if (req.user.role !== 2) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };
  