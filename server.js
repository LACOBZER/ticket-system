/*
IT Support Ticket System
Autor: Luciana Bezerra
2026
*/

import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server läuft" });
});

app.post("/api/tickets", async (req, res) => {
  try {
    const ticket = {
      number: "T-" + Date.now(),
      participant: req.body.participant || "",
      subject: req.body.subject || "",
      description: req.body.description || "",
      status: "open",
      created: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("tickets")
      .insert([ticket])
      .select();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json(data[0]);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.get("/api/tickets", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server läuft auf Port " + PORT);
});
