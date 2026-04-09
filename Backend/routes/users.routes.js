const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { auth } = require("../middlewares/auth");
require("dotenv").config();
const { User } = require("../models/user");
const { authentication } = require("../middlewares/authentication");
const UserRouter = express.Router();

/* --- User Registration (Signup) --- */
UserRouter.post("/signup", async (req, res) => {
  const { name, email, password, mobile, role } = req.body;

  // Hashing the password 
  const hash = bcrypt.hashSync(password, 5);
  try {
    // Check if the email is already being used
    const user = await User.findOne({
      where: { email },
    });

    if (user) {
      res.status(400).json({ msg: "User already exists" });
      return;
    }

    // Save new user to the database
    const data = await User.create({
      name,
      email,
      mobile,
      password: hash,
      role,
    });

    if (data) {
      res.status(201).json({ msg: "User created" });
    } else {
      res.status(500).json({ msg: "Something went wrong" });
    }
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

/* --- User Login --- */
UserRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({
      where: { email },
    });
    
    if (!user) {
      res.status(400).json({ msg: "User does not exist" });
      return;
    }
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {

        const token = jwt.sign(
          { email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "7h" }
        );
        if (user.dataValues.role == "admin") {
          res.status(200).json({
            token,
            userName: user.name,
            role: user.dataValues.role,
            isAdmin: "admin",
            msg: "Login Successful",
          });
          return;
        } else {
          res.status(200).json({
            token,
            userName: user.name,
            role: user.dataValues.role,
            msg: "Login Successful",
          });
        }
      } else {
        res.status(400).json({ msg: "Invalid credentials" });
      }
    });
  } catch (err) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

/* --- Get profile details of the logged-in user --- */
UserRouter.get("/userDetails", authentication, async (req, res) => {
  try {
    if (!req.user) {
      res.status(400).json({ msg: "User not found" });
      return;
    }
    res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

/* --- Basic Logout --- */
UserRouter.get("/logout", authentication, (req, res) => {
  try {
    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
});

/* --- Admin Only: Manage Users --- */

// Get a list of every single person in the database
UserRouter.get("/all-users", authentication, auth(["admin"]), async (req, res) => {
    try {
      const users = await User.findAll();
      res.status(200).json({ users });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

// Delete a user account based off their IDs
UserRouter.delete("/delete-user/:id", authentication, auth(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ where: { id } });

      if (!user) {
        res.status(400).json({ msg: "User does not exist" });
        return;
      }

      await User.destroy({ where: { id } });
      res.status(200).json({ msg: "User deleted" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

// Edit user information (Admin tool)
UserRouter.put("/update-user/:id", authentication, auth(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updatedValues = req.body;

      const user = await User.findOne({ where: { id } });

      if (!user) {
        res.status(400).json({ msg: "User does not exist" });
        return;
      }

      await User.update(updatedValues, { where: { id } });
      res.status(200).json({ msg: "User updated" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

/* --- Admin Only: Specific Patient Management --- */

// View only users who are "patients" (role: user)
UserRouter.get("/admin/patients", authentication, auth(["admin"]), async (req, res) => {
    try {
      const patients = await User.findAll({
        where: { role: "user" },
        attributes: ["id", "name", "email", "mobile", "role", "createdAt"], // Hide passwords in this list
      });
      res.status(200).json({ patients });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

UserRouter.post("/admin/patients", authentication, auth(["admin"]), async (req, res) => {
    try {
      const { name, email, password, mobile } = req.body;

      if (!name || !email || !password || !mobile) {
        res.status(400).json({ msg: "name, email, password and mobile are required" });
        return;
      }

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        res.status(400).json({ msg: "Patient email already exists" });
        return;
      }

      const hash = bcrypt.hashSync(password, 5);
      await User.create({
        name,
        email,
        password: hash,
        mobile,
        role: "user",
      });

      res.status(201).json({ msg: "Patient created successfully" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

UserRouter.put("/admin/patients/:id", authentication, auth(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, mobile, password } = req.body;

      const patient = await User.findOne({
        where: { id, role: "user" },
      });

      if (!patient) {
        res.status(404).json({ msg: "Patient not found" });
        return;
      }

      const updatePayload = {
        name: name || patient.dataValues.name,
        mobile: mobile || patient.dataValues.mobile,
      };

      if (password) {
        updatePayload.password = bcrypt.hashSync(password, 5);
      }

      await User.update(updatePayload, {
        where: { id, role: "user" },
      });

      res.status(200).json({ msg: "Patient updated successfully" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

// Admin deleting a patient account
UserRouter.delete("/admin/patients/:id", authentication, auth(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await User.destroy({
        where: { id, role: "user" },
      });

      if (!deleted) {
        res.status(404).json({ msg: "Patient not found" });
        return;
      }

      res.status(200).json({ msg: "Patient deleted successfully" });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

// List of everyone with the "admin" role
UserRouter.get("/all-admins", authentication, auth(["admin"]), async (req, res) => {
    try {
      const admins = await User.findAll({
        where: { role: "admin" },
      });
      res.status(200).json({ admins });
    } catch (error) {
      res.status(500).json({ msg: "Something went wrong" });
    }
  }
);

module.exports = { UserRouter };
