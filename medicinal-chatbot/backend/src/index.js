import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import chatRoutes from "./routes/chat.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5174",
    credentials: true,
  })
);

app.use("/api", chatRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Medicinal Chatbot API is running" });
});

app.listen(PORT, () => {
  console.log(`Medicinal Chatbot server running on port ${PORT}`);
});
