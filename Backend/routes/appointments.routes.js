const express = require("express");

const { authentication } = require("../middlewares/authentication");

const AppointmentRouter = express.Router();

const Sequelize = require("sequelize");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const { Appointments } = require("../models/appointments");
const { auth } = require("../middlewares/auth");
const { Slots } = require("../models/slots");
const { Doctors } = require("../models/doctors");
const { User } = require("../models/user");

const { Op } = Sequelize;

const parseSchedule = (scheduleValue) => {
  try {
    const parsedSchedule = JSON.parse(scheduleValue || "[]");
    return Array.isArray(parsedSchedule) ? parsedSchedule : [];
  } catch (error) {
    return [];
  }
};

const removeBookedSlot = (schedule, date, time) =>
  schedule.filter((slot) => !(slot.date === date && slot.time === time));

AppointmentRouter.post("/book-appointment", async (req, res) => {
  try {
    const { doctorName, date, time, doctorId, patientName, patientEmail } =
      req.body;

    if (
      !doctorName ||
      !date ||
      !time ||
      !doctorId ||
      !patientName ||
      !patientEmail
    ) {
      res.status(400).json({
        msg: "doctorName, date, time, doctorId, patientName and patientEmail are required",
      });
      return;
    }

    const doctor = await Doctors.findOne({
      where: {
        id: doctorId,
      },
    });

    if (!doctor) {
      res.status(400).json({ msg: "Doctor does not exist" });
      return;
    }

    if (doctor.dataValues.availability <= 0) {
      res.status(400).json({ msg: "No availability left for this doctor" });
      return;
    }

    const slotBooked = await Slots.findOne({
      where: {
        date,
        time,
        doctorId,
        isBooked: true,
      },
    });

    if (slotBooked) {
      res.status(400).json({ msg: "Already Booked" });
      return;
    }

    let patient = await User.findOne({
      where: {
        email: patientEmail,
      },
    });

    if (!patient) {
      patient = await User.create({
        name: patientName,
        email: patientEmail,
        password: bcrypt.hashSync(uuidv4(), 5),
        mobile: "0000000000",
        role: "user",
      });
    }

    const appointment = await Appointments.create({
      patientName,
      doctorName,
      date,
      time,
      patientId: patient.dataValues.id,
      doctorId,
    });

    await Slots.create({
      date,
      time,
      doctorId,
      patientId: patient.dataValues.id,
      isBooked: true,
    });

    await Doctors.update(
      {
        availability: doctor.dataValues.availability - 1,
      },
      {
        where: {
          id: doctorId,
        },
      },
    );

    // Remove the booked slot from the doctor's schedule
    try {
      const doctorSchedule = parseSchedule(doctor.dataValues.schedule);
      const updatedSchedule = removeBookedSlot(doctorSchedule, date, time);

      await Doctors.update(
        {
          schedule: JSON.stringify(updatedSchedule),
        },
        {
          where: {
            id: doctorId,
          },
        },
      );
    } catch (error) {
      // Don't fail the appointment booking if schedule update fails
      console.error("Error updating doctor schedule:", error);
    }

    if (appointment) {
      res.status(201).json({
        msg: "Appointment booked successfully",
        appointment,
      });
    } else {
      res.status(500).json({ msg: "Something went wrong" });
    }
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

// check slot availability

AppointmentRouter.post("/check-slot-availability", async (req, res) => {
  try {
    const { date, time, doctorId } = req.body;

    const slot = await Slots.findOne({
      where: {
        date,
        time,
        doctorId,
        isBooked: true,
      },
    });

    if (!slot) {
      res.status(200).json({ msg: "Available" });
    } else {
      res.status(200).json({ msg: "Booked" });
    }
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

AppointmentRouter.get("/my-appointments", authentication, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ msg: "Unauthenticated user" });
      return;
    }

    const appointments = await Appointments.findAll({
      where: {
        patientId: req.user.dataValues.id,
      },
    });
    res.status(200).json({
      appointments,
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

AppointmentRouter.delete(
  "/delete-appointment/:id",
  authentication,
  async (req, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ msg: "Unauthenticated user" });
        return;
      }

      const { id } = req.params;
      const appointment = await Appointments.findOne({
        where: {
          id,
        },
      });

      if (!appointment) {
        res.status(400).json({ msg: "Appointment does not exist" });
        return;
      }

      await Appointments.destroy({
        where: {
          id,
        },
      });

      await Slots.destroy({
        where: {
          doctorId: appointment.dataValues.doctorId,
          patientId: appointment.dataValues.patientId,
          date: appointment.dataValues.date,
          time: appointment.dataValues.time,
        },
      });

      const doctor = await Doctors.findOne({
        where: {
          id: appointment.dataValues.doctorId,
        },
      });

      if (doctor && appointment.dataValues.status !== "cancelled") {
        await Doctors.update(
          {
            availability: doctor.dataValues.availability + 1,
          },
          {
            where: {
              id: doctor.dataValues.id,
            },
          },
        );
      }

      res.status(200).json({ msg: "Appointment deleted" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

AppointmentRouter.patch(
  "/approve-appointment/:id",
  authentication,
  auth(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const appointment = await Appointments.findOne({
        where: {
          id,
        },
      });

      if (!appointment) {
        res.status(400).json({ msg: "Appointment does not exist" });
        return;
      }

      await Appointments.update(
        {
          status: "approved",
        },
        {
          where: {
            id,
          },
        },
      );

      res.status(200).json({ msg: "Appointment approved" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

AppointmentRouter.patch(
  "/cancel-appointment/:id",
  authentication,
  auth(["admin", "user"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const appointment = await Appointments.findOne({
        where: {
          id,
        },
      });

      if (!appointment) {
        res.status(400).json({ msg: "Appointment does not exist" });
        return;
      }

      if (
        req.user.dataValues.role === "user" &&
        appointment.dataValues.patientId !== req.user.dataValues.id
      ) {
        res
          .status(403)
          .json({ msg: "You can only cancel your own appointment" });
        return;
      }

      await Appointments.update(
        {
          status: "cancelled",
        },
        {
          where: {
            id,
          },
        },
      );

      if (appointment.dataValues.status !== "cancelled") {
        const doctor = await Doctors.findOne({
          where: {
            id: appointment.dataValues.doctorId,
          },
        });

        if (doctor) {
          await Doctors.update(
            {
              availability: doctor.dataValues.availability + 1,
            },
            {
              where: {
                id: doctor.dataValues.id,
              },
            },
          );
        }
      }

      await Slots.destroy({
        where: {
          doctorId: appointment.dataValues.doctorId,
          patientId: appointment.dataValues.patientId,
          date: appointment.dataValues.date,
          time: appointment.dataValues.time,
        },
      });

      res.status(200).json({ msg: "Appointment cancelled" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

AppointmentRouter.get(
  "/user-all-appointments",
  authentication,
  auth(["user"]),
  async (req, res) => {
    const id = req.user.dataValues.id;
    try {
      const appointments = await Appointments.findAll({
        where: {
          patientId: id,
        },
      });
      res.status(200).json({
        appointments,
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

AppointmentRouter.get(
  "/all-appointments",
  authentication,
  auth(["admin"]),
  async (req, res) => {
    try {
      const appointments = await Appointments.findAll({});
      res.status(200).json({
        appointments,
      });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

// notifications to the user

AppointmentRouter.get("/notifications", authentication, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ msg: "Unauthenticated user" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const notifications1 = await Appointments.findAll({
      where: {
        patientId: req.user.dataValues.id,
        date: {
          [Op.gte]: today,
        },

        isNotified: false,
      },
    });

    const notifications2 = await Appointments.findAll({
      where: {
        patientId: req.user.dataValues.id,
        status: {
          [Op.or]: ["approved", "cancelled"],
        },

        isNotified: false,
      },
    });

    const notifications = [...notifications1, ...notifications2];

    res.status(200).json({
      notifications,
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong", error });
  }
});
// clear notifications

AppointmentRouter.patch(
  "/clear-notifications",
  authentication,
  async (req, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ msg: "Unauthenticated user" });
        return;
      }

      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        res.status(400).json({ msg: "ids must be an array" });
        return;
      }

      await Promise.all(
        ids.map((id) => {
          return Appointments.update(
            {
              isNotified: true,
            },
            {
              where: {
                id,
                patientId: req.user.dataValues.id,
              },
            },
          );
        }),
      );

      res.status(200).json({ msg: "Notifications cleared" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

AppointmentRouter.get(
  "/slots",
  authentication,
  auth(["admin"]),
  async (req, res) => {
    try {
      const slots = await Slots.findAll({
        order: [
          ["date", "ASC"],
          ["time", "ASC"],
        ],
      });

      res.status(200).json({ slots });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

AppointmentRouter.delete(
  "/clear-slot/:id",
  authentication,
  auth(["admin"]),
  async (req, res) => {
    try {
      await Slots.destroy({
        where: {
          id: req.params.id,
        },
      });

      res.status(200).json({ msg: "Slot removed" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  },
);

module.exports = { AppointmentRouter };
