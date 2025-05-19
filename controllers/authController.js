const User = require("../models/user");
const Role = require("../models/role");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Invalid credentials",
        data: [],
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
        data: [],
      });
    }

    const token = jwt.sign(
      { id: user.id, role_id: user.role_id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7h" }
    );

    // Construct the response data with user details and role name
    const responseData = {
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role ? user.role.name : null,
      },
    };

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: responseData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred during login",
      data: [],
    });
  }
};

exports.signup = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    role_id,
    college_id,
    department_id,
  } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !email || !password || !role_id) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User already exists",
        data: [],
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      role_id,
      college_id: college_id || null,
      department_id: department_id || null,
    });

    const token = jwt.sign(
      { id: newUser.id, role_id: newUser.role_id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7h" }
    );

    const responseData = {
      token,
      user: {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        role_id: newUser.role_id,
        college_id: newUser.college_id,
        department_id: newUser.department_id,
      },
    };

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred during signup",
      data: [],
    });
  }
};
