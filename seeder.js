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
      Role.create({ name: "college dean" }),
      Role.create({ name: "hod" }),
      Role.create({ name: "dean sps" }),
      Role.create({ name: "sub-dean sps" }),
      Role.create({ name: "college pg coordinator" }),
      Role.create({ name: "departmental pg coordinator" }),
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
      college_id: colleges[1].id,
      department_id: departments[0].id,
    }); // HOD user for Mechanical Engineering
    await User.create({
      first_name: "HOD Mechanical",
      last_name: "Engineering",
      email: "hod-mech@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "hod").id,
      college_id: colleges[0].id,
      department_id: departments[1].id,
    });

    // HOD user for Computer Science
    await User.create({
      first_name: "HOD Computer",
      last_name: "Science",
      email: "hod-cs@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "hod").id,
      college_id: colleges[1].id,
      department_id: departments[0].id,
    });

    // College Dean user
    await User.create({
      first_name: "CST",
      last_name: "Dean",
      email: "cstdean@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "college dean").id,
      college_id: colleges[1].id,
    });

    await User.create({
      first_name: "COE",
      last_name: "Dean",
      email: "coedean@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "college dean").id,
      college_id: colleges[0].id,
    });

    // Dean SPS user
    await User.create({
      first_name: "Dean",
      last_name: "SPS",
      email: "deansps@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "dean sps").id,
      college_id: colleges[1].id,
    });

    // Sub-dean SPS user
    await User.create({
      first_name: "Sub",
      last_name: "Dean",
      email: "subdean@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "sub-dean sps").id,
      college_id: colleges[2].id,
    });

    // College PG Coordinator user
    await User.create({
      first_name: "College PG",
      last_name: "Coordinator",
      email: "col-pgcoordinator@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "college pg coordinator").id,
      college_id: colleges[1].id,
    }); 
    
    // Departmental PG Coordinator user for Computer Science
    await User.create({
      first_name: "Departmental PG",
      last_name: "Coordinator",
      email: "dep-pgcoordinator@example.com",
      password: hashedPassword,
      role_id: roles.find((r) => r.name === "departmental pg coordinator").id,
      college_id: colleges[1].id,
      department_id: departments[0].id,
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
