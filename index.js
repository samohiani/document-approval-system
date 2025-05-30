require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/db");
const models = require("./models");
const loggerMiddleware = require("./middleware/logger"); // Import the logger middleware

const authRoutes = require("./routes/auth.routes");
const formRoutes = require("./routes/form.routes");
const questionRoutes = require("./routes/question.routes");
const responseRoutes = require("./routes/responses.routes");
const approvalroutes = require("./routes/approval.routes");
const dashboardroutes = require("./routes/dashboard.routes");
const adminRoutes = require("./routes/admin.routes"); 
const notificationRoutes = require('./routes/notification.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(loggerMiddleware); // Use the logger middleware

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

app.get("/", (req, res) => {
  res.send("Welcome to Ohiani Samuel's FYP");
});

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/response", responseRoutes);
app.use("/api/approval", approvalroutes);
app.use("/api/dashboard", dashboardroutes);
app.use("/api/admin", adminRoutes); 
app.use('/api/notifications', notificationRoutes);


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
