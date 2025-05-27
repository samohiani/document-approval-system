const {
  Approval,
  ApprovalFlow,
  Form,
  FormResponse,
  User,
  Department,
} = require("../models");
const { Op } = require("sequelize");

exports.getAdminDashboardCounts = async (req, res) => {
  try {
    const totalUsers = await User.count();

    const pendingFormsCount = await FormResponse.count({
      where: { status: "pending" },
    });

    const approvedFormsCount = await FormResponse.count({
      where: { status: "approved" },
    });

    const rejectedFormsCount = await FormResponse.count({
      where: { status: "rejected" },
    });

    return res.status(200).json({
      status: "success",
      message: "Admin dashboard details retrieved successfully",
      data: {
        totalUsers: totalUsers,
        pendingForms: pendingFormsCount,
        approvedForms: approvedFormsCount,
        rejectedForms: rejectedFormsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching form", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving the details",
      data: [],
    });
  }
};

exports.getHODDashboardStats = async (req, res, next) => {
  try {
    const hodId = req.user.id;

    // Step 1: Get HOD's department
    const hod = await User.findByPk(hodId);
    if (!hod)
      return res
        .status(404)
        .json({ status: "error", message: "HOD not found" });

    const departmentId = hod.department_id;

    // Step 2: Get all users in HOD's department
    const deptUsers = await User.findAll({
      where: { department_id: departmentId },
      attributes: ["id"],
    });

    const deptUserIds = deptUsers.map((user) => user.id);

    // Step 3: Get FormResponses submitted by users in that department
    const formResponses = await FormResponse.findAll({
      where: {
        user_id: { [Op.in]: deptUserIds },
      },
      attributes: ["id"],
    });

    const formResponseIds = formResponses.map((fr) => fr.id);

    // Get today's date boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    //Fetch approvals related to those form responses & needing HOD
    const approvals = await Approval.findAll({
      where: {
        response_id: { [Op.in]: formResponseIds },
        approver_id: hodId, // Assigned specifically to this HOD
      },
    });

    //Categorize the approvals
    const pendingApprovals = approvals.filter(
      (app) => app.status === "pending"
    );
    const approvedToday = approvals.filter(
      (app) =>
        app.status === "approved" &&
        new Date(app.updatedAt) >= startOfToday &&
        new Date(app.updatedAt) <= endOfToday
    );
    const rejectedToday = approvals.filter(
      (app) =>
        app.status === "rejected" &&
        new Date(app.updatedAt) >= startOfToday &&
        new Date(app.updatedAt) <= endOfToday
    );

    return res.status(200).json({
      status: "success",
      message: "HOD dashboard stats retrieved successfully",
      data: {
        pendingApprovals: pendingApprovals.length,
        approvedToday: approvedToday.length,
        rejectedToday: rejectedToday.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    //Get student's own form submissions and count statuses
    const responses = await FormResponse.findAll({
      where: { user_id: userId },
      attributes: ["status"],
    });

    const statusCount = responses.reduce(
      (acc, { status }) => {
        const key = status.toLowerCase();
        if (acc[key] !== undefined) acc[key]++;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );

    //Identify forms that students can initiate
    const approvalFlows = await ApprovalFlow.findAll();
    const availableFormIds = [];

    approvalFlows.forEach((flow) => {
      try {
        let flowDef = flow.flow_definition;

        if (typeof flowDef === "string") {
          flowDef = JSON.parse(flowDef);
        }

        if (
          Array.isArray(flowDef) &&
          flowDef[0]?.role_required?.toLowerCase() === "student"
        ) {
          availableFormIds.push(flow.form_id);
        }
      } catch (err) {
        console.error(
          `Error parsing flow_definition for ApprovalFlow ID ${flow.id}:`,
          err.message
        );
      }
    });

    // 3. Fetch available forms for the student
    const availableForms = await Form.findAll({
      where: {
        id: {
          [Op.in]: availableFormIds,
        },
      },
    });

    res.status(200).json({
      status: "success",
      message: "Student dashboard stats retrieved successfully",
      data: {
        pending: statusCount.pending,
        approved: statusCount.approved,
        rejected: statusCount.rejected,
        availableForms: availableForms.length,
      },
    });
  } catch (err) {
    console.error("Error fetching student dashboard stats:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch student dashboard data.",
    });
  }
};

exports.getFacultyDashboardStats = async (req, res) => {
  try {
    const deanId = req.user.id;

    // Get dean's faculty
    const dean = await User.findByPk(deanId, {
      include: [
        {
          model: Department,
          as: "faculty",
        },
      ],
    });

    if (!dean || !dean.faculty) {
      return res.status(404).json({
        status: "error",
        message: "Faculty not found",
      });
    }

    // Get all departments in the faculty
    const facultyDepartments = await Department.findAll({
      where: { faculty_id: dean.faculty.id },
    });

    const departmentIds = facultyDepartments.map((dept) => dept.id);

    // Get form statistics for each department
    const departmentStats = await Promise.all(
      departmentIds.map(async (deptId) => {
        const department = facultyDepartments.find((d) => d.id === deptId);

        // Get all form responses from users in this department
        const responses = await FormResponse.findAll({
          include: [
            {
              model: User,
              where: {
                department_id: deptId,
              },
            },
          ],
        });

        const stats = responses.reduce(
          (acc, response) => {
            const status = response.status.toLowerCase();
            acc.Submitted++;
            if (status === "approved") acc.Approved++;
            if (status === "rejected") acc.Rejected++;
            return acc;
          },
          { name: department.name, Submitted: 0, Approved: 0, Rejected: 0 }
        );

        return stats;
      })
    );

    return res.status(200).json({
      status: "success",
      message: "Faculty dashboard stats retrieved successfully",
      data: {
        departments: departmentStats,
      },
    });
  } catch (err) {
    console.error("Error fetching faculty dashboard stats:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch faculty dashboard data",
    });
  }
};

exports.getStaffDashboardStats = async (req, res) => {
  try {
    const staffId = req.user.id;
    const now = new Date();

    // Get last 4 weeks of data
    const weeks = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7 + 7));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      weekEnd.setHours(23, 59, 59, 999);

      // Get all approvals in this week
      const weekResponses = await FormResponse.findAll({
        include: [
          {
            model: Approval,
            where: {
              approver_id: staffId,
              updatedAt: {
                [Op.between]: [weekStart, weekEnd],
              },
            },
          },
        ],
      });

      const weekStats = weekResponses.reduce(
        (acc, response) => {
          const approval = response.Approvals[0];
          acc.Received++;
          if (approval.status === "approved") acc.Approved++;
          if (approval.status === "rejected") acc.Rejected++;
          return acc;
        },
        { name: `Week ${4 - i}`, Received: 0, Approved: 0, Rejected: 0 }
      );

      weeks.unshift(weekStats); // Add to start of array for chronological order
    }

    return res.status(200).json({
      status: "success",
      message: "Staff dashboard stats retrieved successfully",
      data: weeks,
    });
  } catch (err) {
    console.error("Error fetching staff dashboard stats:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch staff dashboard data",
    });
  }
};

exports.getSubDeanDashboardStats = async (req, res) => {
  try {
    const subDeanId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all responses that need sub-dean approval
    const formResponses = await FormResponse.findAll({
      include: [
        {
          model: Form,
          attributes: ["title"],
        },
        {
          model: Approval,
          where: {
            approver_id: subDeanId,
            updatedAt: {
              [Op.between]: [startOfMonth, endOfMonth],
            },
          },
        },
      ],
    });

    // Group responses by form type
    const formStats = formResponses.reduce((acc, response) => {
      const formName = response.Form?.title || "Others";

      if (!acc[formName]) {
        acc[formName] = {
          name: formName,
          Received: 0,
          Processed: 0,
          Returned: 0,
        };
      }

      acc[formName].Received++;

      const approval = response.Approvals[0];
      if (approval.status === "approved") {
        acc[formName].Processed++;
      } else if (approval.status === "rejected") {
        acc[formName].Returned++;
      }

      return acc;
    }, {});

    // Convert to array format
    const stats = Object.values(formStats);

    return res.status(200).json({
      status: "success",
      message: "Sub Dean dashboard stats retrieved successfully",
      data: stats,
    });
  } catch (err) {
    console.error("Error fetching sub dean dashboard stats:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch sub dean dashboard data",
    });
  }
};
