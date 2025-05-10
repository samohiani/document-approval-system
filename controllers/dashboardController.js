const {
  Approval,
  ApprovalFlow,
  Form,
  FormResponse,
  User,
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
