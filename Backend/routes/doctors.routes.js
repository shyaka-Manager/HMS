const express = require("express");
const bcrypt = require("bcrypt");
const Sequelize = require("sequelize");
const { authentication } = require("../middlewares/authentication");
const { auth } = require("../middlewares/auth");
const DoctorRouter = express.Router();

// const db = require("../models");
const { Doctors } = require("../models/doctors");
const { Descdoctors } = require("../models/descdoctors");
const { Appointments } = require("../models/appointments");
const { User } = require("../models/user");
const { Slots } = require("../models/slots");

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

const parseSchedule = (scheduleValue) => {
  try {
    const parsedSchedule = JSON.parse(scheduleValue || "[]");
    return Array.isArray(parsedSchedule) ? parsedSchedule : [];
  } catch (error) {
    return [];
  }
};

const createSlotKey = (slot) => `${slot.date}|${slot.time}`;

DoctorRouter.get("/single-doctor/:id", async (req, res) => {
  try {
    // create association between doctors and descdoctors table(imp)
    Doctors.hasOne(Descdoctors, {
      foreignKey: "doctor_id",
    });

    // join the doctors and descdoctors table and  get the complete data of the doctor
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

DoctorRouter.get("/available-slots/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctors.findOne({
      where: {
        id: doctorId,
      },
    });

    if (!doctor) {
      res.status(400).json({ msg: "Doctor does not exist" });
      return;
    }

    const schedule = parseSchedule(doctor.dataValues.schedule);
    const bookedSlots = await Slots.findAll({
      where: {
        doctorId,
        isBooked: true,
      },
    });

    const bookedSlotSet = new Set(
      bookedSlots.map((slot) => createSlotKey(slot.dataValues)),
    );

    const availableSlots = schedule.filter(
      (slot) => !bookedSlotSet.has(createSlotKey(slot)),
    );

    res.status(200).json({
      availableSlots,
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

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

      if (!name || !email || !speciality || !department || !fee) {
        res.status(400).json({
          msg: "name, email, speciality, department and fee are required",
        });
        return;
      }

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

      const existingDoctorUser = await User.findOne({
        where: {
          email,
        },
      });

      if (!existingDoctorUser) {
        const doctorPassword = password || "doctor123";
        const hash = bcrypt.hashSync(doctorPassword, 5);
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
  },
);

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
  },
);

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
  },
);

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
  },
);

DoctorRouter.get(
  "/my-patients",
  authentication,
  auth(["doctor"]),
  async (req, res) => {
    try {
      const doctor = await getDoctorByAuthUser(req);

      if (!doctor) {
        res
          .status(404)
          .json({ msg: "Doctor profile not found for this account" });
        return;
      }

      const appointments = await Appointments.findAll({
        where: {
          doctorId: doctor.dataValues.id,
        },
        order: [
          ["date", "ASC"],
          ["time", "ASC"],
        ],
      });

      const patientIds = [
        ...new Set(appointments.map((item) => item.dataValues.patientId)),
      ];

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
  },
);

DoctorRouter.get(
  "/my-schedule",
  authentication,
  auth(["doctor"]),
  async (req, res) => {
    try {
      const doctor = await getDoctorByAuthUser(req);

      if (!doctor) {
        res
          .status(404)
          .json({ msg: "Doctor profile not found for this account" });
        return;
      }

      const schedule = parseSchedule(doctor.dataValues.schedule);

      res.status(200).json({
        doctorId: doctor.dataValues.id,
        schedule,
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

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
        res
          .status(404)
          .json({ msg: "Doctor profile not found for this account" });
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
        },
      );

      res.status(200).json({ msg: "Schedule updated successfully" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

module.exports = { DoctorRouter };
