const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use("/auth", authRoutes);

app.listen(port, () => {
  console.log(`Сервер запущено на http://localhost:${port}`);
});
