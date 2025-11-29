require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const agendamentoRoutes = require("./routes/agendamentos");
const espacoRoutes = require("./routes/espacos");

const app = express();
app.use(cors());
app.use(express.json());

// mover para CIMA (antes das rotas)
app.use(express.static("public"));

app.use("/auth", authRoutes);
app.use("/agendamentos", agendamentoRoutes);
app.use("/espacos", espacoRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
