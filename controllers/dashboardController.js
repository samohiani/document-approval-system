const {
  Approval,
  ApprovalFlow,
  Form,
  FormResponse,
  User,
  Role,
} = require("../models");
const { Op } = require("sequelize");

// Helper function for Admin Dashboard
async function getAdminDashboardData() {
  const totalUsers = await User.count();
  const totalForms = await Form.count({ where: { deleted_flag: false } });

  const formSubmissionsSummary = {
    total: await FormResponse.count(),
    pending: await FormResponse.count({ where: { status: "pending" } }),
    approved: await FormResponse.count({ where: { status: "approved" } }),
    rejected: await FormResponse.count({ where: { status: "rejected" } }),
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentSubmissionsCount = await FormResponse.count({
    where: {
      created_on: {
        [Op.gte]: sevenDaysAgo,
      },
    },
  });

  // Calculate average processing time for completed forms
  // This is a more complex query, averaging the difference between created_on and updated_on for approved/rejected
  const completedResponsesTimes = await FormResponse.findAll({
    where: { status: { [Op.in]: ["approved", "rejected"] } },
    attributes: ["created_on", "updated_on"],
  });

  let totalProcessingTime = 0;
  let processedCount = 0;
  completedResponsesTimes.forEach((res) => {
    if (res.updated_on && res.created_on) {
      totalProcessingTime +=
        new Date(res.updated_on).getTime() - new Date(res.created_on).getTime();
      processedCount++;
    }
  });
  const averageProcessingTimeMs =
    processedCount > 0 ? totalProcessingTime / processedCount : 0;
  // Convert to a more readable format, e.g., hours or days
  const averageProcessingTimeHours = averageProcessingTimeMs / (1000 * 60 * 60);

  return {
    totalUsers,
    totalForms,
    formSubmissionsSummary,
    recentSubmissionsCount,
    averageProcessingTimeHours: parseFloat(
      averageProcessingTimeHours.toFixed(2)
    ),
  };
}

// Helper function for Student Dashboard
async function getStudentDashboardData(userId) {
  const myTotalSubmissions = await FormResponse.count({
    where: { user_id: userId },
  });
  const mySubmissionsStatus = {
    pending: await FormResponse.count({
      where: { user_id: userId, status: "pending" },
    }),
    approved: await FormResponse.count({
      where: { user_id: userId, status: "approved" },
    }),
    rejected: await FormResponse.count({
      where: { user_id: userId, status: "rejected" },
    }),
  };

  // Simplified initiatable forms count (actual logic might be more complex as in formController)
  // This requires knowing the user's role and potentially department/college
  // For a basic version, we can count forms that have an approval flow defined
  // A more accurate count would replicate the logic from formController.getInitiatableForms
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: "role" }],
  });
  let initiatableFormsCount = 0;
  if (user && user.role) {
    const allForms = await Form.findAll({
      include: [
        {
          model: ApprovalFlow,
          as: "approvalFlow",
          where: { flow_definition: { [Op.ne]: null } },
          required: true,
        },
      ],
      where: { deleted_flag: false },
    });

    let contextualRole = user.role.name.toLowerCase();
    if (contextualRole === "pg coordinator") {
      // Example contextual role logic
      if (user.department_id) contextualRole = "departmental pg coordinator";
      else if (user.college_id) contextualRole = "college pg coordinator";
    }

    initiatableFormsCount = allForms.filter((form) => {
      try {
        let flowDef = form.approvalFlow?.flow_definition;
        if (typeof flowDef === "string") flowDef = JSON.parse(flowDef);
        return (
          Array.isArray(flowDef) &&
          flowDef.length > 0 &&
          flowDef[0]?.role_required?.toLowerCase() === contextualRole
        );
      } catch (e) {
        return false;
      }
    }).length;
  }

  return {
    myTotalSubmissions,
    mySubmissionsStatus,
    initiatableFormsCount,
  };
}

// Helper function for Approver Dashboard
async function getApproverDashboardData(
  userId,
  userRole,
  userDepartmentId,
  userCollegeId
) {
  const myPendingApprovalsCount = await Approval.count({
    where: { approver_id: userId, status: "pending" },
  });

  const myApprovalStats = {
    approvedByMe: await Approval.count({
      where: { approver_id: userId, status: "approved" },
    }),
    rejectedByMe: await Approval.count({
      where: { approver_id: userId, status: "rejected" },
    }),
  };

  const processedApprovalsTimes = await Approval.findAll({
    where: {
      approver_id: userId,
      status: { [Op.in]: ["approved", "rejected"] },
    },
    attributes: ["created_on", "updated_on"],
  });
  let totalApprovalProcessTime = 0;
  let processedApprovalCount = 0;
  processedApprovalsTimes.forEach((appr) => {
    if (appr.updated_on && appr.created_on) {
      totalApprovalProcessTime +=
        new Date(appr.updated_on).getTime() -
        new Date(appr.created_on).getTime();
      processedApprovalCount++;
    }
  });
  const averageApprovalTimeMs =
    processedApprovalCount > 0
      ? totalApprovalProcessTime / processedApprovalCount
      : 0;
  const averageApprovalTimeHours = averageApprovalTimeMs / (1000 * 60 * 60);

  const data = {
    myPendingApprovalsCount,
    myApprovalStats,
    averageApprovalTimeHours: parseFloat(averageApprovalTimeHours.toFixed(2)),
  };

  // Contextual data for HOD (role_id 4)
  if (userRole.name.toLowerCase() === "hod" && userDepartmentId) {
    data.departmentSubmissionsCount = await FormResponse.count({
      include: [
        {
          model: User,
          as: "user",
          where: { department_id: userDepartmentId },
        },
      ],
    });
  }

  // Contextual data for Deans (role_id 3 for general Dean, 5 for College Dean)
  if (userRole.name.toLowerCase() === "college dean" && userCollegeId) {
    data.collegeSubmissionsCount = await FormResponse.count({
      include: [
        {
          model: User,
          as: "user",
          where: { college_id: userCollegeId },
        },
      ],
    });
  }

  return data;
}

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: "role" }],
    });

    if (!user || !user.role) {
      return res
        .status(403)
        .json({ status: "error", message: "User role not found or invalid." });
    }

    let dashboardData;

    switch (
      user.role.name.toLowerCase() // Switched to use role name for clarity
    ) {
      case "admin": // role_id 2
        dashboardData = await getAdminDashboardData();
        break;
      case "student": // role_id 1
        dashboardData = await getStudentDashboardData(userId);
        break;
      case "college dean": // role_id 3
      case "hod": // role_id 4
      case "dean sps": // role_id 5
      case "sub-dean sps": // role_id 6
      case "college pg coordinator": // role_id 7
      case "departmental pg coordinator": // role_id 8
        dashboardData = await getApproverDashboardData(
          userId,
          user.role,
          user.department_id,
          user.college_id
        );
        break;
      default:
        return res.status(403).json({
          status: "error",
          message: "No dashboard data available for this role.",
        });
    }

    return res.status(200).json({
      status: "success",
      message: "Dashboard data retrieved successfully",
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving dashboard data.",
      data: null,
    });
  }
};
