let express = require("express");
const cors = require("cors");
require("dotenv").config();
const { Pool } = require("pg");
const { DATABASE_URL } = process.env;

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    require: true,
  },
});

async function getPostgresVersion() {
  const client = await pool.connect();

  try {
    const response = await client.query("SELECT version()");
    console.log(response.rows[0]);
  } finally {
    client.release();
  }
}

getPostgresVersion();

app.post("/bookings2", async (req, res) => {
  const { user_id, date, time, duration } = req.body;
  const client = await pool.connect();

  try {
    // insert new like row with active as true
    const newLike = await client.query(
      `
      INSERT INTO bookings2 (user_id, created_at, date, time, duration) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4) RETURNING *`,
      [user_id, date, time, duration],
    );
    res.json(newLike.rows[0]);
  } catch (error) {
    console.error("Error", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get("/bookings2/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const client = await pool.connect();

  try {
    const bookings = await client.query(
      "SELECT * FROM bookings2 WHERE user_id =$1",
      [user_id],
    );
    if (bookings.rowCount > 0) {
      res.json(bookings.rows);
    } else {
      res.status(404).json({ error: "No bookings found for this user" });
    }
  } catch (error) {
    console.error("Error", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.delete("/bookings2/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("DELETE FROM bookings2 WHERE id = $1", [user_id]);
    res.json({ message: "Booking Deleted Successfully" });
  } catch (err) {
    console.log(err.stack);
    res.status(500).send("An error occurred, please try again.");
  } finally {
    client.release();
  }
});

app.put("/bookings2/:user_id", async (req, res) => {
  const { id, date, time, duration } = req.body;
  const { user_id } = req.params;
  const client = await pool.connect();

  try {
    // Check if an existing booking for this user and post exists
    const prevBooking = await client.query(
      `SELECT * FROM bookings2 WHERE user_id = $1 AND id = $2`, // id = bookings_id (primary key)
      [user_id, id]
    );
    console.log(user_id, id)


    if (prevBooking.rows.length > 0) {
      // If booking exists, update its date, time, and duration
      const updatedBooking = await client.query(
        `UPDATE bookings2 SET date = $1, time = $2, duration = $3 WHERE user_id = $4 AND id = $5 RETURNING *`,
        [date, time, duration, user_id, id]
      );
      res.json(updatedBooking.rows[0]);
    } else {
      // If booking does not exist, return an error or handle as needed
      res.status(301).json({ error: "Booking not found" });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});


app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
