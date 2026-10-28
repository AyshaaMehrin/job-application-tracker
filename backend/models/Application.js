
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true },
  company: { type: String, required: true, trim: true },
  companyKey: { type: String, required: true },
  role: { type: String, required: true, trim: true },
  jobType: {
    type: String,
    enum: ["Full-time", "Internship", "Contract"],
    required: true
  },
  appliedDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (date) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      message: "Applied Date cannot be in the future"
    }
  },
  expectedSalary: { type: Number, min: 0, default: null },
  notes: { type: String, default: "" },
  status: {
    type: String,
    enum: ["Applied", "Interview", "Offer", "Rejected", "Accepted", "Declined"],
    default: "Applied"
  },
  followUpDate: { type: Date, required: true },
  statusHistory: [{
    status: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

applicationSchema.index({ companyKey: 1, role: 1, status: 1 });

module.exports = mongoose.model("Application", applicationSchema);
