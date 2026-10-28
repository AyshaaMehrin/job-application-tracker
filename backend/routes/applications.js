
const express = require("express");
const mongoose = require("mongoose");
const Application = require("../models/Application");

const router = express.Router();

const finalStatuses = ["Rejected", "Accepted", "Declined"];

const transitions = {
  Applied: ["Interview", "Rejected"],
  Interview: ["Offer", "Rejected"],
  Offer: ["Accepted", "Declined"],
  Rejected: [],
  Accepted: [],
  Declined: []
};

const reply = (res, status, success, message, data = null) =>
  res.status(status).json({ success, message, data });

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCompanyPrefix = (company) =>
  (company.match(/[a-z]/gi) || [])
    .join("")
    .toUpperCase()
    .slice(0, 3);

const validDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
};

const withOverdue = (app) => {
  const item = app.toObject();
  item.isOverdue =
    item.status === "Applied" &&
    new Date() > new Date(item.followUpDate);
  return item;
};

const duplicateExists = async (company, role, excludeId) => {
  const query = {
    company: new RegExp(`^${escapeRegex(company.trim())}$`, "i"),
    role: new RegExp(`^${escapeRegex(role.trim())}$`, "i"),
    status: { $nin: finalStatuses }
  };

  if (excludeId) query._id = { $ne: excludeId };

  return Application.findOne(query);
};

// GET applications, filter, search and status counts
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.company) {
      filter.company = {
        $regex: escapeRegex(req.query.company),
        $options: "i"
      };
    }

    const applications = await Application.find(filter).sort({
      createdAt: -1
    });

    const all = await Application.find();
    const counts = {
      Applied: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
      Accepted: 0,
      Declined: 0
    };

    all.forEach((app) => counts[app.status]++);

    return reply(res, 200, true, "Applications fetched", {
      applications: applications.map(withOverdue),
      counts
    });
  } catch (err) {
    return reply(res, 400, false, err.message);
  }
});

// CREATE application
router.post("/", async (req, res) => {
  try {
    const {
      company,
      role,
      jobType,
      appliedDate,
      expectedSalary,
      notes
    } = req.body;

    if (!company?.trim() || !role?.trim() ||
        !jobType || !appliedDate) {
      return reply(res, 400, false, "Fill all required fields");
    }

    if (!validDate(appliedDate)) {
      return reply(res, 400, false,
        "Applied Date cannot be in the future or invalid");
    }

    if (!["Full-time", "Internship", "Contract"].includes(jobType)) {
      return reply(res, 400, false, "Invalid job type");
    }

    if (expectedSalary != null &&
        expectedSalary !== "" &&
        (!Number.isFinite(Number(expectedSalary)) ||
         Number(expectedSalary) < 0)) {
      return reply(res, 400, false, "Invalid expected salary");
    }

    if (await duplicateExists(company, role)) {
      return reply(res, 409, false,
        "An active application for this company and role already exists");
    }

    const prefix = getCompanyPrefix(company);
    if (!prefix) {
      return reply(res, 400, false,
        "Company name must contain letters");
    }

    const previous = await Application.find({
      applicationId: new RegExp(`^JA-${prefix}-\\d{3,}$`)
    }).sort({ applicationId: -1 });

    const sequence = previous.reduce((max, app) => {
      const n = Number(app.applicationId.split("-").pop());
      return Math.max(max, n || 0);
    }, 0) + 1;

    const app = await Application.create({
      applicationId: `JA-${prefix}-${String(sequence).padStart(3, "0")}`,
      company: company.trim(),
      companyKey: company.trim().toLowerCase(),
      role: role.trim(),
      jobType,
      appliedDate: new Date(appliedDate),
      expectedSalary:
        expectedSalary == null || expectedSalary === ""
          ? null
          : Number(expectedSalary),
      notes: notes || "",
      status: "Applied",
      followUpDate: new Date(
        new Date(appliedDate).getTime() + 7 * 86400000
      ),
      statusHistory: [{ status: "Applied", date: new Date() }]
    });

    return reply(res, 201, true, "Application created", withOverdue(app));
  } catch (err) {
    if (err.code === 11000) {
      return reply(res, 409, false,
        "Application ID conflict. Please try again.");
    }
    return reply(res, 400, false, err.message);
  }
});

// GET one application
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return reply(res, 400, false, "Invalid application ID");
    }

    const app = await Application.findById(req.params.id);
    if (!app) return reply(res, 404, false, "Application not found");

    return reply(res, 200, true, "Application fetched", withOverdue(app));
  } catch (err) {
    return reply(res, 400, false, err.message);
  }
});

// EDIT application (cannot edit ID or applied date)
router.put("/:id", async (req, res) => {
  try {
    const { company, role, jobType, expectedSalary, notes } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return reply(res, 400, false, "Invalid application ID");
    }

    const app = await Application.findById(req.params.id);
    if (!app) return reply(res, 404, false, "Application not found");

    if (company !== undefined && !company.trim()) {
      return reply(res, 400, false, "Company name is required");
    }
    if (role !== undefined && !role.trim()) {
      return reply(res, 400, false, "Job role is required");
    }
    if (jobType !== undefined &&
        !["Full-time", "Internship", "Contract"].includes(jobType)) {
      return reply(res, 400, false, "Invalid job type");
    }
    if (expectedSalary != null && expectedSalary !== "" &&
        (!Number.isFinite(Number(expectedSalary)) ||
         Number(expectedSalary) < 0)) {
      return reply(res, 400, false, "Invalid expected salary");
    }

    const nextCompany = company?.trim() ?? app.company;
    const nextRole = role?.trim() ?? app.role;

    if (await duplicateExists(nextCompany, nextRole, app._id)) {
      return reply(res, 409, false,
        "An active application for this company and role already exists");
    }

    app.company = nextCompany;
    app.companyKey = nextCompany.toLowerCase();
    app.role = nextRole;

    if (jobType !== undefined) app.jobType = jobType;
    if (expectedSalary !== undefined) {
      app.expectedSalary =
        expectedSalary === "" || expectedSalary == null
          ? null
          : Number(expectedSalary);
    }
    if (notes !== undefined) app.notes = notes;

    await app.save();
    return reply(res, 200, true, "Application updated", withOverdue(app));
  } catch (err) {
    return reply(res, 400, false, err.message);
  }
});

// CHANGE STATUS with transition validation
router.patch("/:id/status", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return reply(res, 400, false, "Invalid application ID");
    }

    const app = await Application.findById(req.params.id);
    if (!app) return reply(res, 404, false, "Application not found");

    const { status } = req.body;

    if (!transitions[app.status]?.includes(status)) {
      return reply(res, 400, false,
        `Cannot change status from ${app.status} to ${status}.`);
    }

    app.status = status;
    app.statusHistory.push({ status, date: new Date() });
    await app.save();

    return reply(res, 200, true, "Status updated", withOverdue(app));
  } catch (err) {
    return reply(res, 400, false, err.message);
  }
});

// DELETE application
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return reply(res, 400, false, "Invalid application ID");
    }

    const app = await Application.findById(req.params.id);
    if (!app) return reply(res, 404, false, "Application not found");

    if (app.status === "Interview" || app.status === "Offer") {
      return reply(res, 400, false,
        "Applications in Interview or Offer status cannot be deleted");
    }

    await app.deleteOne();
    return reply(res, 200, true, "Application deleted", null);
  } catch (err) {
    return reply(res, 400, false, err.message);
  }
});

module.exports = router;
