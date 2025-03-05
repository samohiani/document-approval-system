require("dotenv").config();
const sequelize = require("./config/db");
const { Role, College, Department, User } = require("./models");
const bcrypt = require("bcrypt");

async function seed() {
  try {
    await sequelize.sync({ force: true });
    console.log("Database synced!");

    // Create roles
    const roles = await Promise.all([
      Role.create({ name: "student" }),
      Role.create({ name: "admin" }),
      Role.create({ name: "dean" }),
      Role.create({ name: "hod" }),
    ]);
    console.log("Roles created.");

    // Create colleges
    const colleges = await Promise.all([
      College.create({ name: "College of Engineering" }),
      College.create({ name: "College of Science and technology" }),
      College.create({ name: "College of Management and Social Sciences" }),
    ]);
    console.log("Colleges created.");

    // Create departments
    const departments = await Promise.all([
      Department.create({
        name: "Computer Science",
        college_id: colleges[1].id,
      }),
      Department.create({
        name: "Mechanical Engineering",
        college_id: colleges[0].id,
      }),
      Department.create({ name: "Finance", college_id: colleges[2].id }),
      Department.create({ name: "Marketing", college_id: colleges[2].id }),
    ]);
    console.log("Departments created.");

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create sample users
    // Admin user
    await User.create({
      first_name: "Admin",
      last_name: "User",
      email: "admin@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "admin").id,
    });
    // Student user
    await User.create({
      first_name: "Student",
      last_name: "User",
      email: "student@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "student").id,
      college_id: colleges[0].id,
      department_id: departments[0].id,
    });
    // Staff user
    await User.create({
      first_name: "Staff",
      last_name: "User",
      email: "staff@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "dean").id,
      college_id: colleges[0].id,
    });

    console.log("Users created.");
    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
}

seed();
