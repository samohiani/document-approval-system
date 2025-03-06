const Form = require("../models/form");
const Question = require("../models/question");

exports.createForm = async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const form = await Form.create({
      title,
      description,
      created_by: req.user.id,
    });

    return res.status(201).json({
      status: "success",
      message: "Form created successfully",
      data: form,
    });
  } catch (error) {
    console.error("Error creating form:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the form",
      data: [],
    });
  }
};

exports.getForms = async (req, res) => {
  try {
    const forms = await Form.findAll({
      where: { deleted_flag: false },
    });
    return res.status(200).json({
      status: "success",
      message: "Forms retrieved successfully",
      data: forms,
    });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving forms",
      data: [],
    });
  }
};

// Retrieve details of a single form (including its non-deleted questions)
exports.getFormById = async (req, res) => {
  const { id } = req.params;

  try {
    const form = await Form.findOne({
      where: { id, deleted_flag: false },
      include: [
        {
          model: Question,
          as: "questions",
          where: { deleted_flag: false },
          required: false,
        },
      ],
    });

    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
        data: [],
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Form retrieved successfully",
      data: form,
    });
  } catch (error) {
    console.error("Error fetching form", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving the form",
      data: [],
    });
  }
};

// Update an existing form (Admin only)
exports.updateForm = async (req, res) => {
  const { id, title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const form = await Form.findOne({ where: { id, deleted_flag: false } });
    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
        data: [],
      });
    }

    form.title = title;
    form.description = description;
    form.modified_by = req.user.id;
    await form.save();

    return res.status(200).json({
      status: "success",
      message: "Form updated successfully",
      data: form,
    });
  } catch (error) {
    console.error("Error updating form:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the form",
      data: [],
    });
  }
};

exports.deleteForm = async (req, res) => {
  const { form_id } = req.body;

  if (!form_id) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const form = await Form.findOne({
      where: { id: form_id, deleted_flag: false },
    });
    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
        data: [],
      });
    }

    form.deleted_flag = true;
    form.deleted_by = req.user.id;
    await form.destroy();
    await form.save();

    return res.status(200).json({
      status: "success",
      message: "Form deleted successfully",
      data: [],
    });
  } catch (error) {
    console.error("Error deleting form:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the form",
      data: [],
    });
  }
};
