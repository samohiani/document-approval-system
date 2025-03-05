const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = function auth(requiredRoles) {
  return async function (req, res, next) {
    // Get the authorization header (case-insensitive)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "You are not logged in.",
        data: [],
      });
    }

    // Extract token from header
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Token is missing.",
        data: [],
      });
    }

    try {
      // Verify token using the secret key from environment variables
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      // Retrieve user from the database based on token's id
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found.",
          data: [],
        });
      }

      if (requiredRoles) {
        // Convert to array if it's not already
        const allowedRoles = Array.isArray(requiredRoles)
          ? requiredRoles
          : [requiredRoles];
        if (!allowedRoles.includes(user.role_id)) {
          return res.status(403).json({
            status: "error",
            message: "Access denied.",
            data: [],
          });
        }
      }
      // Attach the user object to the request for downstream use
      req.user = user;
      next();
    } catch (error) {
      console.error("JWT verification error:", error);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          status: "error",
          message: "Token expired, please log in again",
          data: [],
        });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          status: "error",
          message: "Invalid token",
          data: [],
        });
      }
      return res.status(401).json({
        status: "error",
        message: "Token verification failed",
        data: [],
      });
    }
  };
};
