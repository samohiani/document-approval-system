require("dotenv").config();
const sequelize = require("../config/db");
const { User, Role, College, Department } = require("../models"); // Add College, Department, and sequelize
const bcrypt = require("bcrypt");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: Role,
          as: "role", // Make sure this alias matches your model association
          attributes: ["name"],
        },
      ],
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "department_id",
        "college_id",
      ],
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role ? user.role.name : null, // Handle if role is somehow not found
      department_id: user.department_id,
      college_id: user.college_id,
    }));

    return res.status(200).json({
      status: "success",
      message: "Users retrieved successfully",
      data: formattedUsers,
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving users.",
      data: [],
    });
  }
};

exports.createUser = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    role_id,
    department_id,
    college_id,
  } = req.body;

  if (!first_name || !last_name || !email || !password || !role_id) {
    return res.status(400).json({
      status: "error",
      message:
        "Missing required fields: first_name, last_name, email, password, role_id.",
    });
  }

  const t = await sequelize.transaction();
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await t.rollback();
      return res
        .status(409)
        .json({ status: "error", message: "Email already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create(
      {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        role_id,
        department_id,
        college_id,
      },
      { transaction: t }
    );

    await t.commit();
    // Exclude password from response
    const userResponse = { ...newUser.toJSON() };
    delete userResponse.password;

    return res.status(201).json({
      status: "success",
      message: "User created successfully.",
      data: userResponse,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error creating user:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the user.",
    });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id, {
      include: [
        { model: Role, as: "role", attributes: ["id", "name"] },
        { model: Department, as: "department", attributes: ["id", "name"] },
        { model: College, as: "college", attributes: ["id", "name"] },
      ],
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }
    return res.status(200).json({ status: "success", data: user });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching the user.",
    });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    email,
    role_id,
    department_id,
    college_id,
    password,
  } = req.body;

  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: { email },
        transaction: t,
      });
      if (existingUser) {
        await t.rollback();
        return res
          .status(409)
          .json({ status: "error", message: "Email already in use." });
      }
      user.email = email;
    }

    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (role_id) user.role_id = role_id;
    if (department_id !== undefined) user.department_id = department_id; // Allow setting to null
    if (college_id !== undefined) user.college_id = college_id; // Allow setting to null

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save({ transaction: t });
    await t.commit();

    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    return res.status(200).json({
      status: "success",
      message: "User updated successfully.",
      data: userResponse,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error updating user:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the user.",
    });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }

    // Add dependency checks here if needed (e.g., FormResponses, Approvals)
    // For simplicity, direct delete for now. Consider soft deletes or more robust checks.
    // const formResponsesCount = await FormResponse.count({ where: { user_id: id }, transaction: t });
    // if (formResponsesCount > 0) {
    //   await t.rollback();
    //   return res.status(400).json({ status: "error", message: "Cannot delete user with existing form responses." });
    // }

    await user.destroy({ transaction: t });
    await t.commit();
    return res
      .status(200)
      .json({ status: "success", message: "User deleted successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting user:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the user.",
    });
  }
};

exports.getColleges = async (req, res) => {
  try {
    const colleges = await College.findAll();
    return res.status(200).json({
      status: "success",
      message: "Colleges retrieved successfully",
      data: colleges,
    });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving colleges.",
      data: [],
    });
  }
};

exports.createCollege = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res
      .status(400)
      .json({ status: "error", message: "College name is required." });
  }
  const t = await sequelize.transaction();
  try {
    const existingCollege = await College.findOne({ where: { name } });
    if (existingCollege) {
      await t.rollback();
      return res
        .status(409)
        .json({ status: "error", message: "College name already exists." });
    }
    const college = await College.create({ name }, { transaction: t });
    await t.commit();
    return res
      .status(201)
      .json({
        status: "success",
        message: "College created successfully.",
        data: college,
      });
  } catch (error) {
    await t.rollback();
    console.error("Error creating college:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating the college.",
      });
  }
};

exports.getCollegeById = async (req, res) => {
  const { id } = req.params;
  try {
    const college = await College.findByPk(id);
    if (!college) {
      return res
        .status(404)
        .json({ status: "error", message: "College not found." });
    }
    return res.status(200).json({ status: "success", data: college });
  } catch (error) {
    console.error("Error fetching college by ID:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while fetching the college.",
      });
  }
};

exports.updateCollege = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res
      .status(400)
      .json({
        status: "error",
        message: "College name is required for update.",
      });
  }
  const t = await sequelize.transaction();
  try {
    const college = await College.findByPk(id, { transaction: t });
    if (!college) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "College not found." });
    }
    if (name !== college.name) {
      const existingCollege = await College.findOne({
        where: { name },
        transaction: t,
      });
      if (existingCollege) {
        await t.rollback();
        return res
          .status(409)
          .json({ status: "error", message: "College name already exists." });
      }
    }
    college.name = name;
    await college.save({ transaction: t });
    await t.commit();
    return res
      .status(200)
      .json({
        status: "success",
        message: "College updated successfully.",
        data: college,
      });
  } catch (error) {
    await t.rollback();
    console.error("Error updating college:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while updating the college.",
      });
  }
};

exports.deleteCollege = async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();
  try {
    const college = await College.findByPk(id, { transaction: t });
    if (!college) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "College not found." });
    }

    const departmentCount = await Department.count({
      where: { college_id: id },
      transaction: t,
    });
    if (departmentCount > 0) {
      await t.rollback();
      return res
        .status(400)
        .json({
          status: "error",
          message: "Cannot delete college with associated departments.",
        });
    }
    // Add check for users associated with this college if direct association exists beyond department
    const userCount = await User.count({
      where: { college_id: id },
      transaction: t,
    });
    if (userCount > 0) {
      await t.rollback();
      return res
        .status(400)
        .json({
          status: "error",
          message: "Cannot delete college with associated users.",
        });
    }

    await college.destroy({ transaction: t });
    await t.commit();
    return res
      .status(200)
      .json({ status: "success", message: "College deleted successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting college:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while deleting the college.",
      });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll();
    return res.status(200).json({
      status: "success",
      message: "Departments retrieved successfully",
      data: departments,
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving departments.",
      data: [],
    });
  }
};

exports.createDepartment = async (req, res) => {
  const { name, college_id } = req.body;
  if (!name || !college_id) {
    return res
      .status(400)
      .json({
        status: "error",
        message: "Department name and college_id are required.",
      });
  }
  const t = await sequelize.transaction();
  try {
    const college = await College.findByPk(college_id, { transaction: t });
    if (!college) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "College not found." });
    }
    const existingDepartment = await Department.findOne({
      where: { name, college_id },
      transaction: t,
    });
    if (existingDepartment) {
      await t.rollback();
      return res
        .status(409)
        .json({
          status: "error",
          message:
            "Department with this name already exists in the specified college.",
        });
    }
    const department = await Department.create(
      { name, college_id },
      { transaction: t }
    );
    await t.commit();
    return res
      .status(201)
      .json({
        status: "success",
        message: "Department created successfully.",
        data: department,
      });
  } catch (error) {
    await t.rollback();
    console.error("Error creating department:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating the department.",
      });
  }
};

exports.getDepartmentById = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findByPk(id, {
      include: [{ model: College, as: "college" }],
    });
    if (!department) {
      return res
        .status(404)
        .json({ status: "error", message: "Department not found." });
    }
    return res.status(200).json({ status: "success", data: department });
  } catch (error) {
    console.error("Error fetching department by ID:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while fetching the department.",
      });
  }
};

exports.updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, college_id } = req.body;
  const t = await sequelize.transaction();
  try {
    const department = await Department.findByPk(id, { transaction: t });
    if (!department) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "Department not found." });
    }

    if (college_id) {
      const college = await College.findByPk(college_id, { transaction: t });
      if (!college) {
        await t.rollback();
        return res
          .status(404)
          .json({ status: "error", message: "College not found for update." });
      }
      department.college_id = college_id;
    }
    if (name) {
      const currentCollegeId = college_id || department.college_id;
      const existingDepartment = await Department.findOne({
        where: { name, college_id: currentCollegeId },
        transaction: t,
      });
      if (existingDepartment && existingDepartment.id !== parseInt(id)) {
        // Check if it's another department
        await t.rollback();
        return res
          .status(409)
          .json({
            status: "error",
            message:
              "Department with this name already exists in the specified college.",
          });
      }
      department.name = name;
    }

    await department.save({ transaction: t });
    await t.commit();
    return res
      .status(200)
      .json({
        status: "success",
        message: "Department updated successfully.",
        data: department,
      });
  } catch (error) {
    await t.rollback();
    console.error("Error updating department:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while updating the department.",
      });
  }
};

exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();
  try {
    const department = await Department.findByPk(id, { transaction: t });
    if (!department) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "Department not found." });
    }

    const userCount = await User.count({
      where: { department_id: id },
      transaction: t,
    });
    if (userCount > 0) {
      await t.rollback();
      return res
        .status(400)
        .json({
          status: "error",
          message: "Cannot delete department with associated users.",
        });
    }

    await department.destroy({ transaction: t });
    await t.commit();
    return res
      .status(200)
      .json({ status: "success", message: "Department deleted successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting department:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while deleting the department.",
      });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();
    return res.status(200).json({
      status: "success",
      message: "Roles retrieved successfully",
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving roles.",
      data: [],
    });
  }
};

exports.createRole = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res
      .status(400)
      .json({ status: "error", message: "Role name is required." });
  }
  const t = await sequelize.transaction();
  try {
    const existingRole = await Role.findOne({
      where: { name },
      transaction: t,
    });
    if (existingRole) {
      await t.rollback();
      return res
        .status(409)
        .json({ status: "error", message: "Role name already exists." });
    }
    const role = await Role.create({ name }, { transaction: t });
    await t.commit();
    return res
      .status(201)
      .json({
        status: "success",
        message: "Role created successfully.",
        data: role,
      });
  } catch (error) {
    await t.rollback();
    console.error("Error creating role:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating the role.",
      });
  }
};

exports.getRoleById = async (req, res) => {
  const { id } = req.params;
  try {
    const role = await Role.findByPk(id);
    if (!role) {
      return res
        .status(404)
        .json({ status: "error", message: "Role not found." });
    }
    return res.status(200).json({ status: "success", data: role });
  } catch (error) {
    console.error("Error fetching role by ID:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while fetching the role.",
      });
  }
};

exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res
      .status(400)
      .json({ status: "error", message: "Role name is required for update." });
  }
  const t = await sequelize.transaction();
  try {
    const role = await Role.findByPk(id, { transaction: t });
    if (!role) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "Role not found." });
    }
    if (name !== role.name) {
      const existingRole = await Role.findOne({
        where: { name },
        transaction: t,
      });
      if (existingRole) {
        await t.rollback();
        return res
          .status(409)
          .json({ status: "error", message: "Role name already exists." });
      }
    }
    role.name = name;
    await role.save({ transaction: t });
    await t.commit();
    return res
      .status(200)
      .json({
        status: "success",
        message: "Role updated successfully.",
        data: role,
      });
  } catch (error) {
    await t.rollback();
    console.error("Error updating role:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while updating the role.",
      });
  }
};

exports.deleteRole = async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();
  try {
    const role = await Role.findByPk(id, { transaction: t });
    if (!role) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: "error", message: "Role not found." });
    }

    const userCount = await User.count({
      where: { role_id: id },
      transaction: t,
    });
    if (userCount > 0) {
      await t.rollback();
      return res
        .status(400)
        .json({
          status: "error",
          message: "Cannot delete role with associated users.",
        });
    }

    await role.destroy({ transaction: t });
    await t.commit();
    return res
      .status(200)
      .json({ status: "success", message: "Role deleted successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting role:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while deleting the role.",
      });
  }
};
