/*
IT Support Ticket System
Autor: Luciana Bezerra
2026
*/

import express from "express";
import cors from "cors";
import multer from "multer";
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

/* Upload im Speicher statt lokal */
const upload = multer({
  storage: multer.memoryStorage()
});

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
  const maxNumber = tickets.reduce((max, t) => {
    const match = String(t.number || "").match(/^T-(\d+)$/);
    if (!match) return max;
    const num = Number(match[1]);
    return num > max ? num : max;
  }, 1000);

  return `T-${maxNumber + 1}`;
}

/* Ticket erstellen */
app.post("/api/tickets", upload.single("screenshot"), async (req, res) => {
  try {
    const tickets = await loadTickets();
    const now = new Date().toLocaleString();

    let screenshotUrl = "";

    if (req.file) {
      try {
        const originalName = req.file.originalname || "bild";
        const parts = originalName.split(".");
        const fileExt = parts.length > 1 ? parts.pop().toLowerCase() : "png";

        const safeExt = fileExt.replace(/[^a-z0-9]/g, "") || "png";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
        const filePath = `tickets/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("screenshots")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error("Fehler beim Screenshot-Upload:", uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("screenshots")
            .getPublicUrl(filePath);

          screenshotUrl = publicUrlData?.publicUrl || "";
        }
      } catch (uploadErr) {
        console.error("Unerwarteter Fehler beim Screenshot-Upload:", uploadErr);
      }
    }

    const ticket = {
      id: Date.now(),
      number: generateTicketNumber(tickets),
      participant: req.body.participant || "",
      subject: req.body.subject || "",
      description: req.body.description || "",
      screenshot: screenshotUrl,
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

    const { error: insertError } = await supabase
      .from("tickets")
      .insert(ticket);

    if (insertError) {
      console.error("Fehler beim Speichern des Tickets:", insertError);
      return res.status(500).json({
        success: false,
        error: "Ticket konnte nicht gespeichert werden."
      });
    }

    return res.json(ticket);
  } catch (err) {
    console.error("Serverfehler bei /api/tickets:", err);
    return res.status(500).json({
      success: false,
      error: "Serverfehler"
    });
  }
});

/* Tickets laden */
app.get("/api/tickets", async (req, res) => {
  try {
    const tickets = await loadTickets();
    return res.json(tickets);
  } catch (err) {
    console.error("Serverfehler bei /api/tickets GET:", err);
    return res.status(500).json([]);
  }
});

/* Ticket bearbeiten */
app.post("/api/update/:id", async (req, res) => {
  try {
    const tickets = await loadTickets();
    const ticket = tickets.find((t) => String(t.id) === String(req.params.id));

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket nicht gefunden" });
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

    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        status: ticket.status,
        notes: ticket.notes
      })
      .eq("id", ticket.id);

    if (updateError) {
      console.error("Fehler beim Aktualisieren:", updateError);
      return res.status(500).json({ success: false });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Serverfehler bei /api/update/:id:", err);
    return res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log("Server läuft auf Port " + PORT);
});
