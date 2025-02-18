// ngrok http localhost:3001



const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Load orders from JSON file
const loadOrders = () => {
  const data = fs.readFileSync("orders.json");
  return JSON.parse(data);
};

// Test endpoint
app.get("/api/test", (req, res) => {
  res.send("Test request");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

// Feedback schema (for support messages)
const FeedbackSchema = new mongoose.Schema({
  phoneNumber: String,
  feedbackType: String,
  details: String,
  createdAt: { type: Date, default: Date.now },
});

const Feedback = mongoose.model("Feedback", FeedbackSchema);

// USSD logic
app.post("/ussd", async (req, res) => {
  const { phoneNumber, text } = req.body;
  let response = "";
  const input = text.split("*");

  // Load orders from JSON
  const orders = loadOrders();

  // Main menu
  if (text === "") {
    response = `CON Welcome to YourStore!
      1. Check Order Status
      2. Contact Support`;
  }

  // Check Order Status
  else if (text === "1") {
    response = `CON Enter your Order ID:`;
  } else if (input[0] === "1" && input.length === 2) {
    const orderId = parseInt(input[1]);
    const order = orders.find((o) => o.id === orderId);

    if (order) {
      response = `END Order Details:
      Customer: ${order.customer}
      Status: ${order.status}`;
    } else {
      response = `END Order not found. Please check your Order ID.`;
    }
  }

  // Contact Support
  else if (text === "2") {
    response = `CON Enter your message (max 160 chars):`;
  } else if (input[0] === "2" && input.length > 1) {
    const message = input.slice(1).join(" ");

    if (message.length > 160) {
      response = `END Message too long. Please limit to 160 characters.`;
    } else {
      await Feedback.create({
        phoneNumber,
        feedbackType: "Support",
        details: message,
      });

      response = `END Thank you! Our team will contact you soon.`;
    }
  }

  // Invalid Input
  else {
    response = `END Invalid option. Please try again.`;
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

// Start the server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`USSD server listening on http://localhost:${PORT}`);
});




// ngrok http localhost:3001