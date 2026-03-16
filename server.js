/*
IT Support Ticket System
Autor: Luciana Bezerra
2026
*/

import express from "express";
import cors from "cors";
import fs from "fs";
import multer from "multer";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("."));
app.use("/uploads",express.static("uploads"));

const PORT = 3000;
const FILE = "tickets.json";

/* Upload Ordner */

if(!fs.existsSync("uploads")){
fs.mkdirSync("uploads");
}

/* Screenshot Upload */

const storage = multer.diskStorage({

destination:function(req,file,cb){
cb(null,"uploads/");
},

filename:function(req,file,cb){
const name=Date.now()+"-"+file.originalname;
cb(null,name);
}

});

const upload = multer({storage:storage});

/* Ticket Datei */

if(!fs.existsSync(FILE)){
fs.writeFileSync(FILE,JSON.stringify([]));
}

function loadTickets(){
try{
return JSON.parse(fs.readFileSync(FILE));
}catch{
return [];
}
}

function saveTickets(tickets){
fs.writeFileSync(FILE,JSON.stringify(tickets,null,2));
}

function generateTicketNumber(tickets){
const base=1000;
const next=tickets.length+base+1;
return `T-${next}`;
}

/* Ticket erstellen */

app.post("/api/tickets",upload.single("screenshot"),(req,res)=>{

const tickets=loadTickets();
const now=new Date().toLocaleString();

const ticket={

id:Date.now(),
number:generateTicketNumber(tickets),

participant:req.body.participant || "",
subject:req.body.subject || "",
description:req.body.description || "",

screenshot:req.file ? "/uploads/"+req.file.filename : "",

status:"open",

notes:[
{
text:req.body.description || "Ticket erstellt",
name:req.body.participant || "User",
role:"User",
time:now
}
],

created:now

};

tickets.push(ticket);

saveTickets(tickets);

res.json(ticket);

});

/* Tickets laden */

app.get("/api/tickets",(req,res)=>{
res.json(loadTickets());
});

/* Ticket bearbeiten */

app.post("/api/update/:id",(req,res)=>{

const tickets=loadTickets();
const ticket=tickets.find(t=>t.id==req.params.id);

if(!ticket){
return res.status(404).json({success:false});
}

const allowedStatus=["open","in_progress","closed"];

if(allowedStatus.includes(req.body.status)){
ticket.status=req.body.status;
}

if(req.body.note && req.body.note.trim()!==""){

ticket.notes.push({

text:req.body.note,
name:req.body.name || "Unbekannt",
role:req.body.role || "Support",
time:new Date().toLocaleString()

});

}

saveTickets(tickets);

res.json({success:true});

});

app.listen(PORT,()=>{
console.log("Server läuft auf http://localhost:"+PORT);
});