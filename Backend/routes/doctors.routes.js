const express = require("express");
const bcrypt = require("bcrypt");
const Sequelize = require("sequelize");
const { authentication } = require("../middlewares/authentication");
const { auth } = require("../middlewares/auth");
const DoctorRouter = express.Router();

const { Doctors } = require("../models/doctors");
const { Descdoctors } = require("../models/descdoctors");
const { Appointments } = require("../models/appointments");
const { User } = require("../models/user");

//Function to find which doctor is currently logged in based on their email
const getDoctorByAuthUser = async (req) => {
  const email = req.user?.dataValues?.email;
  if (!email) {
    return null;
  }

  return Doctors.findOne({
    where: {
      email,
    },
  });
};

/* --- Fetch detailed info for one specific doctor --- */
DoctorRouter.get("/single-doctor/:id", async (req, res) => {
  try {
    // Tell the database that Doctors and their Descriptions are linked
    Doctors.hasOne(Descdoctors, {
      foreignKey: "doctor_id",
    });

    // Pull the doctor data and "join" it with their extra details (bio, awards, etc.)
    const doctor = await Doctors.findOne({
      where: {
        id: req.params.id,
      },
      include: [
        {
          model: Descdoctors,
          where: {
            doctor_id: req.params.id,
          },
        },
      ],
    });

    res.status(200).json({
      doctor,
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

/* --- Admin Only: Add a new doctor to the system --- */
DoctorRouter.post(
  "/add-doctor",
  authentication,
  auth(["admin"]),
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        avatar,
        speciality,
        department,
        availability,
        rating,
        fee,
        education,
        Professional,
        Certifications,
        Expertise,
        Honors_and_Awards,
        Publications,
        Professional_Memberships,
        mobile,
      } = req.body;

      // Basic validation to make sure the main fields aren't empty
      if (!name || !email || !speciality || !department || !fee) {
        res.status(400).json({ msg: "name, email, speciality, department and fee are required" });
        return;
      }

      // Create the main doctor profile
      const doctor = await Doctors.create({
        name,
        email,
        avatar,
        speciality,
        department,
        availability: Number(availability || 0),
        rating: rating || "4.8",
        fee,
      });

      if (!doctor) {
        return res.status(400).json({ msg: "Could not add Doctor" });
      }

      // Create the detailed description row for this doctor using their new ID
      await Descdoctors.create({
        education: education || "Not specified",
        Professional: Professional || "Not specified",
        Certifications: Certifications || "Not specified",
        Expertise: Expertise || speciality,
        Honors_and_Awards: Honors_and_Awards || "Not specified",
        Publications: Publications || "Not specified",
        Professional_Memberships: Professional_Memberships || "Not specified",
        mobile: mobile || "0000000000",
        doctor_id: doctor.id,
      });

      // Also create a Login account for the doctor so they can sign in later
      const existingDoctorUser = await User.findOne({
        where: {
          email,
        },
      });

      if (!existingDoctorUser) {
        const doctorPassword = password || "doctor123";
        const hash = bcrypt.hashSync(doctorPassword, 5); // Hashing the password for security
        await User.create({
          name,
          email,
          mobile: mobile || "0000000000",
          password: hash,
          role: "doctor",
        });
      }

      res.status(200).json({
        msg: "Doctor added successfully",
        doctor,
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

/* --- Getting the list of all doctors --- */
DoctorRouter.get("/all-doctors", async (req, res) => {
  try {
    const doctors = await Doctors.findAll({});
    res.status(200).json({
      doctors,
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

/* --- Admin Only: Completely remove a doctor --- */
DoctorRouter.delete(
  "/delete-doctor/:id",
  authentication,
  auth(["admin"]),
  async (req, res) => {
    try {

      const doctor = await Doctors.findOne({
        where: {
          id: req.params.id,
        },
      });

    
      await Doctors.destroy({
        where: {
          id: req.params.id,
        },
      });

      
      await Descdoctors.destroy({
        where: {
          doctor_id: req.params.id,
        },
      });

      
      if (doctor?.dataValues?.email) {
        await User.destroy({
          where: {
            email: doctor.dataValues.email,
            role: "doctor",
          },
        });
      }

      res.status(200).json({
        msg: "Doctor deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

/* --- Admin Only: Updating doctor info --- */
DoctorRouter.patch(
  "/update-doctor/:id",
  authentication,
  auth(["admin"]),
  async (req, res) => {
    try {
      await Doctors.update(req.body, {
        where: {
          id: req.params.id,
        },
      });

      res.status(200).json({
        msg: "Doctor updated successfully",
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

/* --- Admin Only: Updating doctor biography info --- */
DoctorRouter.patch(
  "/update-descdoctor/:id",
  authentication,
  auth(["admin"]),
  async (req, res) => {
    try {
      await Descdoctors.update(req.body, {
        where: {
          doctor_id: req.params.id,
        },
      });

      res.status(200).json({
        msg: "Doctor description updated successfully",
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

/* --- Doctor Only: See a list of patients who have appointments--- */
DoctorRouter.get(
  "/my-patients",
  authentication,
  auth(["doctor"]),
  async (req, res) => {
    try {
      const doctor = await getDoctorByAuthUser(req);

      if (!doctor) {
        res.status(404).json({ msg: "Doctor profile not found for this account" });
        return;
      }

      // Find all appointments for this specific doctor
      const appointments = await Appointments.findAll({
        where: {
          doctorId: doctor.dataValues.id,
        },
        order: [["date", "ASC"], ["time", "ASC"]],
      });

      const patientIds = [...new Set(appointments.map((item) => item.dataValues.patientId))];

      // Fetch the names and contact info for those patients
      const patients = patientIds.length
        ? await User.findAll({
            where: {
              id: {
                [Sequelize.Op.in]: patientIds,
              },
            },
            attributes: ["id", "name", "email", "mobile"],
          })
        : [];

      res.status(200).json({
        doctor,
        appointments,
        patients,
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

/* --- Doctor Only: View work schedule --- */
DoctorRouter.get(
  "/my-schedule",
  authentication,
  auth(["doctor"]),
  async (req, res) => {
    try {
      const doctor = await getDoctorByAuthUser(req);

      if (!doctor) {
        res.status(404).json({ msg: "Doctor profile not found for this account" });
        return;
      }
      
      let schedule = [];
      try {
        schedule = JSON.parse(doctor.dataValues.schedule || "[]");
      } catch (error) {
        schedule = [];
      }

      res.status(200).json({
        doctorId: doctor.dataValues.id,
        schedule,
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

/* --- Doctor Only: Update work hours/days --- */
DoctorRouter.put(
  "/my-schedule",
  authentication,
  auth(["doctor"]),
  async (req, res) => {
    try {
      const { schedule } = req.body;

      if (!Array.isArray(schedule)) {
        res.status(400).json({ msg: "schedule should be an array" });
        return;
      }

      const doctor = await getDoctorByAuthUser(req);

      if (!doctor) {
        res.status(404).json({ msg: "Doctor profile not found for this account" });
        return;
      }

      await Doctors.update(
        {
          schedule: JSON.stringify(schedule),
        },
        {
          where: {
            id: doctor.dataValues.id,
          },
        }
      );

      res.status(200).json({ msg: "Schedule updated successfully" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

module.exports = { DoctorRouter };
