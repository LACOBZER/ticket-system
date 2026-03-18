/*
IT Support Ticket System
Autor: Luciana Bezerra
2026
*/

import express from "express";
import cors from "cors";
import fs from "fs";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("."));
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/* Upload Ordner */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

/* Screenshot Upload */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  }
});

const upload = multer({ storage });

async function loadTickets() {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Tickets:", error);
    return [];
  }

  return data || [];
}

function generateTicketNumber(tickets) {
  const base = 1000;
  const next = tickets.length + base + 1;
  return `T-${next}`;
}

/* Ticket erstellen */
app.post("/api/tickets", upload.single("screenshot"), async (req, res) => {
  try {
    const tickets = await loadTickets();
    const now = new Date().toLocaleString();

    const ticket = {
      id: Date.now(),
      number: generateTicketNumber(tickets),
      participant: req.body.participant || "",
      subject: req.body.subject || "",
      description: req.body.description || "",
      screenshot: req.file ? "/uploads/" + req.file.filename : "",
      status: "open",
      notes: [
        {
          text: req.body.description || "Ticket erstellt",
          name: req.body.participant || "User",
          role: "User",
          time: now
        }
      ],
      created: now
    };

    const { error } = await supabase.from("tickets").insert(ticket);

    if (error) {
      console.error("Fehler beim Speichern:", error);
      return res.status(500).json({
        success: false,
        error: "Ticket konnte nicht gespeichert werden."
      });
    }

    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Serverfehler" });
  }
});

/* Tickets laden */
app.get("/api/tickets", async (req, res) => {
  try {
    const tickets = await loadTickets();
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

/* Ticket bearbeiten */
app.post("/api/update/:id", async (req, res) => {
  try {
    const tickets = await loadTickets();
    const ticket = tickets.find((t) => String(t.id) === String(req.params.id));

    if (!ticket) {
      return res.status(404).json({ success: false });
    }

    const allowedStatus = ["open", "in_progress", "closed"];

    if (allowedStatus.includes(req.body.status)) {
      ticket.status = req.body.status;
    }

    if (req.body.note && req.body.note.trim() !== "") {
      ticket.notes.push({
        text: req.body.note,
        name: req.body.name || "Unbekannt",
        role: req.body.role || "Support",
        time: new Date().toLocaleString()
      });
    }

    const { error } = await supabase
      .from("tickets")
      .update({
        status: ticket.status,
        notes: ticket.notes
      })
      .eq("id", ticket.id);

    if (error) {
      console.error("Fehler beim Aktualisieren:", error);
      return res.status(500).json({ success: false });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log("Server läuft auf Port " + PORT);
});
