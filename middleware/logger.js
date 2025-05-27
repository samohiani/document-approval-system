const fs = require("fs");
const path = require("path");

// Create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "..", "access.log"),
  { flags: "a" }
);

const loggerMiddleware = (req, res, next) => {
  const start = process.hrtime();
  const clientIp = req.ip || req.connection.remoteAddress;

  res.on("finish", () => {
    const durationInMilliseconds = getDurationInMilliseconds(start);
    const logMessage = `${new Date().toISOString()} - ${req.method} ${
      req.originalUrl
    } - ${
      res.statusCode
    } - ${durationInMilliseconds.toLocaleString()} ms - IP: ${clientIp}\n`;

    // Log to console
    console.log(logMessage.trim());

    // Log to file
    accessLogStream.write(logMessage);
  });

  next();
};

const getDurationInMilliseconds = (start) => {
  const NS_PER_SEC = 1e9; //  Convert nanoseconds to seconds
  const NS_TO_MS = 1e6; // Convert nanoseconds to milliseconds
  const diff = process.hrtime(start);
  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};

module.exports = loggerMiddleware;
