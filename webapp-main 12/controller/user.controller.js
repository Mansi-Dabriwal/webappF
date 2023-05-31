const db = require("../models");
const Product = db.product;
const Users = db.user;
const Op = db.Sequelize.Op;
const bcrypt = require('bcrypt');
const logger = require("../logger");
const toSqlDatetime = (inputDate) => {
  const date = new Date(inputDate)
  const dateWithOffest = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return dateWithOffest
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
}
const SDC = require("statsd-client");
const client = new SDC({
    host: "localhost",
    port: 8125
});

exports.create = async (req, res) => {
  // Increment a metric
  client.increment('user.create');
  logger.info("In create user");
  let salt = await bcrypt.genSalt(10);
  let password = req.body.password
  const encryptedPassword = await bcrypt.hash(password, salt);
  const user = {
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    username: req.body.username,
    password: encryptedPassword,
    account_created: toSqlDatetime(new Date()),
    account_updated: toSqlDatetime(new Date())
  }
  let usernameExists = await Users.findOne({ where: { username: req.body.username } });
  if (usernameExists) {
    logger.info("Username already exists");
    return res.status(400).json({
      message: "Username already exists."
    });
  } else {
  Users.create(user)
    .then(data => {
      let createdData = {
        "id": data.id,
        "first_name": data.first_name,
        "last_name": data.last_name,
        "username": data.username,
        "account_created": data.account_created,
        "account_updated": data.account_updated
      }
      res.status(201).send(createdData)
      logger.info("User created");
    })
    .catch(err => {
      res.status(400).json({
        message:
          err.message || "User not created"
      });
      logger.info("User not created");
    })};
}

exports.findOne = (req, res) => {
  // Increment a metric
  client.increment('user.findOne');
  logger.info("In user findOne");
  const id = req.params.id;
  Users.findByPk(id)
    .then(data => {
      if (data) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          logger.info("Unauthorized");
          return res.status(401).json({ message: "Unauthorized" })
        }

        const [type, credentials] = authHeader.split(" ");
        if (type !== "Basic") {
          logger.info("Unauthorized");
          return res.status(401).json({ message: "Unauthorized" });
        }

        const [username, password] = Buffer.from(credentials, "base64")
          .toString()
          .split(":");
        let output1;
        let output2;
        Users.findOne({ where: { id: id, username: username } }).then(val => {
          console.log("val: ", val);
          output1 = val
        }).catch(error => {
          logger.info("User Not Authorized");
          res.status(401).send({ message: "User Not Authorized"})
        })
        Users.findOne({ where: { id: id, username: username } }).then(val1 => {
          console.log("val1: ", val1)
          output2 = val1
          if (output1 === 0) {
            logger.info("Forbidden");
            return res.status(403).json({ message: "Forbidden" });
          } else {
            bcrypt.compare(password, output1.dataValues.password, (err, result) => {
              if (err) {
                console.log(err)
              } else if (result) {
                console.log('Password matches', output1.dataValues.password);
                let getData = {
                  "id": output2.id,
                  "first_name": output2.first_name,
                  "last_name": output2.last_name,
                  "username": output2.username,
                  "account_created": output2.account_created,
                  "account_updated": output2.account_updated
                }
                logger.info("User Found");
                return res.status(200).json(getData)
              } else {
                console.log('Password does not match');
                logger.info("Password does not match");
                return res.status(401).json({ message: 'Unauthorized' });
              }
            })
          }
        }).catch(error => {
          logger.info("User Not Authorized");
          res.status(401).send({ message: "User Not Authorized"})
        })
      } else {
        logger.info("Cannot find User");
        res.status(403).send({
          message: `Cannot find User with id=${id}.`
        });
      }
    })
    .catch(err => {
      logger.info("Error retrieving User");
      res.status(403).send({
        message: "Error retrieving User with id=" + id
      });
    });
};

exports.update = (req, res) => {
  // Increment a metric
  client.increment('user.update');
  logger.info("In user update");
  const id = req.params.id;
  const authHeader = req.headers.authorization;
  console.log("authHeader: ", authHeader);
  if (!authHeader) {
    logger.info("Unauthorized");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [type, credentials] = authHeader.split(" ");
  if (type !== "Basic") {
    logger.info("Unauthorized");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [username, password] = Buffer.from(credentials, "base64")
    .toString()
    .split(":");

  console.log("username: ", username)
  console.log("id: ", id);

  Users.findOne({
    where: { username: username }
  })
    .then(num => {
      // if (num == 1) {  
      // console.log("nums: ", num);
      console.log(password)
      console.log(num.dataValues.password)
      console.log("email: ", num.dataValues.username)
      let userEmail = num.dataValues.username;
      bcrypt.compare(password, num.dataValues.password, async (err, result) => {
        if (err) {
          res.status(401).json({message: "Password is incorrect"})
        } else if (result) {
          logger.info("Password matches");
          console.log("Password matches");
          const updateData = req.body;
          const salt = await bcrypt.genSalt(10);
          let newPassword = updateData.password;
          console.log(newPassword);
          const encryptedPassword = await bcrypt.hash(newPassword, salt);
          if (userEmail === req.body.username && !req.body.account_updated && !req.body.account_created){
            let newData = {
              first_name: req.body.first_name,
              last_name: req.body.last_name,
              // username: req.body.username,
              password: encryptedPassword,
              account_updated: toSqlDatetime(new Date())
            }
            Users.update(newData, {
              where: { id: id }
            }).then(val => {
              if(val==1){
                logger.info("User information updated successfully");
                return res.status(204).json({ message: "User information updated successfully" });
              }else{
                logger.info("Error updating user");
                return res.status(403).json({ message: "Error updating user" });
              }
              
            }).catch(err => {
              logger.info("Error updating user");
              res.status(403).json({
                message: "Error updating user with id:"+id
              })
            })
          } else {
            logger.info("Error updating user info");
            res.status(400).json({ message: "Error updating user info" });
          }
        } else {
          logger.info("Password is not a match");
          console.log("result: ", result)
          res.status(401).json({ message: "Password is not a match" });
        }
      })
      // res.status(200).json({
      //   message: "User was updated successfully."
      // });
    })
    .catch(err => {
      logger.info("Username not found");
      res.status(401).json({
        message: "Username not found"
      });
    });
}

exports.delete = (req, res) => {
  // Increment a metric
  client.increment('user.delete');
  logger.info("In user delete");
  let id = req.params.id;
  Users.destroy({
    where: { id: id }
  })
    .then(num => {
      if (num == 1) {
        res.status(200).json({
          message: "User was deleted successfully!"
        });
      } else {
        res.status(400).json({
          message: `Cannot delete User with id=${id}.`
        });
      }
    })
    .catch(err => {
      res.status(500).json({
        message: "Could not delete User with id=" + id
      });
    });
};