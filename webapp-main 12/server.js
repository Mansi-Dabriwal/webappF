const express = require("express");
const db = require("./models/index");
const bodyParser = require("body-parser");
const cors = require("cors");
const logger = require("./logger");
const app = express();

var corsOptions = {
  origin: "http://localhost:8081"
};

const SDC = require("statsd-client");
const client = new SDC({
    host: "localhost",
    port: 8125
});

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded

// simple route
app.get("/healthz", (req, res) => {
  res.status(200).json({ message: "server responds with 200 OK if it is healthy." });
  logger.info("server responds with 200 OK if it is healthy.");
  client.increment('healthz');
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  logger.info("Server Listening On Port 8080");
});


db.sequelize.sync()
  .then(() => {
    console.log("Synced db.");
  })
  .catch((err) => {
    console.log("Failed to sync db: " + err.message);
  });

require("./routes/products.routes.js")(app);
require("./routes/user.routes.js")(app);