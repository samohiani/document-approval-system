require("dotenv").config();
const express = require("express");
const sequelize = require("./config/db");
const models = require("./models");

const authRoutes = require("./routes/auth.routes");
const formRoutes = require("./routes/form.routes");
const questionRoutes = require("./routes/question.routes");
const responseRoutes = require("./routes/responses.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to Ohiani Samuel's FYP");
});

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/response", responseRoutes);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true, force: false });
    console.log("Database & tables created!");
    console.log("Database connected...");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Error creating database tables:", err);
  }
};

startServer();
