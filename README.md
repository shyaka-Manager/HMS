# 🏥 Hospital Appointment System

## 📌 Overview

The **Hospital Appointment System** is a full-stack web application designed to streamline the process of booking, managing, and tracking medical appointments. It enables patients to schedule appointments with doctors, while providing administrators and doctors with tools to manage schedules, approvals, and patient interactions efficiently.

This project goes beyond basic CRUD by implementing real-world healthcare workflows such as appointment validation, role-based access control, and status tracking.

---

## 🚀 Features

### 🔐 Authentication & Authorization

* User registration and login
* JWT-based authentication
* Role-Based Access Control (RBAC):

  * **Admin**
  * **Doctor**
  * **Patient**

---

### 📅 Appointment Management

* Book appointments with doctors
* Prevent double-booking
* Time-slot based booking system
* Appointment status tracking:

  * Pending
  * Approved
  * Cancelled
  * Completed

---

### 👨‍⚕️ Doctor Management

* Add, update, and delete doctors
* Assign specialization and availability
* Doctors can view their schedules

---

### 👤 Patient Management

* Register and manage patient profiles
* View appointment history
* Track upcoming visits

---

### 📊 Dashboard

* **Admin Dashboard**

  * Total doctors
  * Total patients
  * Daily appointments
* **Doctor Dashboard**

  * Today's schedule
  * Upcoming appointments
* **Patient Dashboard**

  * Personal bookings
  * Appointment status updates

---

### 🔍 Search & Filtering

* Search doctors by name or specialization
* Filter appointments by:

  * Date
  * Status
  * Doctor

---

### 🔔 Notifications

* In-app notifications for:

  * App
