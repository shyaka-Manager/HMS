const express = require("express");
const cors = require("cors");
const db = require("./config/db.js");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// create a record

app.post("/users", (req, res) => {
    console.log(req.body);
    const {full_name, email, password, role, phone_number} = req.body;

    // insert into database
    db.query('INSERT INTO users (full_name, email, password, role, phone_number) VALUES (?, ?, ?, ?, ?)',
        [full_name, email, password, role, phone_number],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: result.insertId, full_name, email, role, phone_number });
        });
});


// get all records

app.get("/users", (req, res) => {
    db.query('SELECT * FROM users', (err, result) => {
        if (err) throw err;
            return res.status(200).json(result);
        });
});


// delete a record

app.delete("/users/:id", (req, res) => {
    db.query('DELETE FROM users WHERE user_id = ?', [req.params.id], (err,result) => {
        if (err) throw err;
        res.status(200).json(result);
    });
});

// update a record

// update a record

app.put("/users/:id", (req, res) => {
    const { full_name, email, password, role, phone_number } = req.body;
    const userId = req.params.id;

    db.query(
        'UPDATE users SET full_name = ?, email = ?, password = ?, role = ?, phone_number = ? WHERE user_id = ?',
        [full_name, email, password, role, phone_number, userId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "User not found" });
            }

            res.status(200).json({
                message: "User updated successfully",
                user_id: userId,
                full_name,
                email,
                role,
                phone_number
            });
        }
    );
});


app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});