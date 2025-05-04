module.exports = (req, res, next) => {
  // Перевірка наявності req.user
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  // Перевірка ролі на адміна
  if (req.user.role !== 2) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};
