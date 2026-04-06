const express = require("express");
const { Op } = require("sequelize");
const { UserRouter } = require("./routes/users.routes");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");
const bcrypt = require("bcrypt");
const { sequelize } = require("./config/db");
const { User } = require("./models/user");
const { Doctors } = require("./models/doctors");
const { Appointments } = require("./models/appointments");
const { v4: uuidv4 } = require("uuid");
const { AppointmentRouter } = require("./routes/appointments.routes");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const jwt = require("jsonwebtoken");
const { DoctorRouter } = require("./routes/doctors.routes");

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "admin123";

const seedDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({
    where: {
      email: DEFAULT_ADMIN_EMAIL,
    },
  });

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 5);
    await User.create({
      name: "System Admin",
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      mobile: "9999999999",
      role: "admin",
    });
    console.log("Default admin user created: admin@gmail.com");
  }
};

app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.use("/user", UserRouter);
app.use("/appointments", AppointmentRouter);
app.use("/doctors", DoctorRouter);

app.get("/", (req, res) => {
  res.send("Hospital Booking API is running");
});
app.get("/auth/github", async (req, res) => {
  const { code } = req.query;

  try {
    const token = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    }).then((res) => res.json());
    let Atoken = token.access_token;

    const userDetails = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${Atoken}`,
      },
    }).then((res) => res.json());

    // send the token to the frontend (email is needed because we are using email to authenticate the user to the protected routes)

    const { login, name, id } = userDetails;
    const user = {
      name,
      email: `${login}@gmail.com`,
      password: uuidv4(),
      mobile: "0000000000",
    };

    const isUserpresent = await User.findOne({
      where: {
        email: user.email,
      },
    });

    if (!isUserpresent) {
      await User.create(user);
    }

    const tosendtoken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "7h",
      }
    );

    res.cookie("token", tosendtoken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("userName", user.name, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${FRONTEND_URL}?token=${tosendtoken}&userName=${name}`);
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

app.get("/get-cookies", async (req, res) => {
  try {
    res.json({
      userName: req.cookies.userName || "",
      token: req.cookies.token || "",
    });
  } catch (error) {
    res.json({ msg: "Something went wrong" });
  }
});

app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

app.get("/stats/at-a-glance", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const appointmentsScheduled = await Appointments.count({
      where: {
        date: today,
        status: {
          [Op.ne]: "cancelled",
        },
      },
    });

    const departments = await Doctors.aggregate("department", "count", {
      distinct: true,
    });

    const specialists = await Doctors.count();

    const avgRatingResult = await Doctors.findOne({
      attributes: [
        [
          sequelize.fn(
            "AVG",
            sequelize.cast(sequelize.col("rating"), "DECIMAL(5,2)")
          ),
          "avgRating",
        ],
      ],
      raw: true,
    });

    const [avgBookingRows] = await sequelize.query(
      `
        SELECT AVG(TIMESTAMPDIFF(MINUTE, createdAt, STR_TO_DATE(CONCAT(date, ' ', time), '%Y-%m-%d %H:%i'))) AS avgMinutes
        FROM appointments
        WHERE date IS NOT NULL AND time IS NOT NULL
      `
    );

    const avgBookingMinutes = Number(avgBookingRows?.[0]?.avgMinutes || 0);
    const patientScore = Number(avgRatingResult?.avgRating || 0);

    res.status(200).json({
      appointmentsScheduled,
      departments: Number(departments || 0),
      specialists,
      patientScore,
      avgBookingMinutes,
    });
  } catch (error) {
    res.status(500).json({ msg: "Unable to load real-time metrics" });
  }
});

app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    await seedDefaultAdmin();
    console.log(`Server is running on port ${PORT} and connected to MySQL`);
  } catch (error) {
    console.log(error);
  }
});
