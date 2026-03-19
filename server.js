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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function loadTickets() {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Tickets:", error);
    throw error;
  }

  return data || [];
}

function generateTicketNumber(tickets) {
  const maxNumber = tickets.reduce((max, t) => {
    const match = String(t.number || "").match(/^T-(\d+)$/);
    if (!match) return max;
    const num = Number(match[1]);
    return num > max ? num : max;
  }, 1000);

  return `T-${maxNumber + 1}`;
}

app.get("/api/tickets", async (req, res) => {
  try {
    const tickets = await loadTickets();
    return res.json(tickets);
  } catch (err) {
    console.error("GET /api/tickets FEHLER:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Serverfehler"
    });
  }
});

app.post("/api/tickets", async (req, res) => {
  try {
    console.log("POST /api/tickets BODY:", req.body);

    const tickets = await loadTickets();
    const now = new Date().toLocaleString();

    const ticket = {
      id: Date.now(),
      number: generateTicketNumber(tickets),
      participant: req.body.participant || "",
      subject: req.body.subject || "",
      description: req.body.description || "",
      screenshot: "",
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
      console.error("Insert-Fehler:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Ticket konnte nicht gespeichert werden."
      });
    }

    console.log("Ticket gespeichert:", ticket.number);
    return res.json(ticket);
  } catch (err) {
    console.error("POST /api/tickets FEHLER:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Serverfehler"
    });
  }
});

app.post("/api/update/:id", async (req, res) => {
  try {
    const tickets = await loadTickets();
    const ticket = tickets.find((t) => String(t.id) === String(req.params.id));

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: "Ticket nicht gefunden"
      });
    }

    const allowedStatus = ["open", "in_progress", "closed"];

    if (allowedStatus.includes(req.body.status)) {
      ticket.status = req.body.status;
    }

    if (req.body.note && req.body.note.trim() !== "") {
      ticket.notes = Array.isArray(ticket.notes) ? ticket.notes : [];
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
      console.error("Update-Fehler:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Update fehlgeschlagen"
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("POST /api/update/:id FEHLER:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Serverfehler"
    });
  }
});

app.listen(PORT, () => {
  console.log("Server läuft auf Port " + PORT);
});
