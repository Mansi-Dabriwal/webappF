const db = require("../models");
const bcrypt = require('bcrypt')
const Product = db.product;
const Users = db.user;
const Op = db.Sequelize.Op;
const dbconfig = require('../config/db.config.js');
const logger = require("../logger");
const Image = db.image;
const aws = require('aws-sdk');
const imageUpload = require('./imageUpload');
const singleUpload = imageUpload.single('image')

let regex= /^[A-Za-z]*$/
const s3 = new aws.S3();

// Create a new StatsD client
const SDC = require("statsd-client");
const client = new SDC({
    host: "localhost",
    port: 8125
});


exports.create = async (req, res) => {
    // Increment a metric
    client.increment('product.create');
    logger.info("Creating the product");
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
    let skuExists = await Product.findOne({ where: { sku: req.body.sku } });

    Users.findOne({ where: { username: username } })
        .then(val => {
            console.log(val.dataValues.password)
            console.log(val.dataValues.username)
            bcrypt.compare(password, val.dataValues.password, async (error, result) => {
                if (error) {
                    logger.info("Password not found");
                    return res.status(401).json({ message: "Password not found" })
                } else if (result) {
                    if (!skuExists) {
                        if (req.body.quantity >= 0 && req.body.quantity <= 100 && typeof req.body.quantity === 'number') {
                            const product = {
                                name: req.body.name,
                                description: req.body.description,
                                sku: req.body.sku,
                                manufacturer: req.body.manufacturer,
                                quantity: req.body.quantity,
                                owner_user_id: val.dataValues.id
                            }
                            if (req.body.date_added || req.body.date_last_updated){
                                res.status(400).json({ message: "Bad Request" })
                            }else{
                                Product.create(product)
                                .then(data => {
                                    res.status(201).send(data)
                                    logger.info("Created the product");
                                })
                                .catch(err => {
                                    res.status(401).json({ message: "Could not create" });
                                    logger.info("Could not create");
                                });
                            }
                            
                        } else {
                            res.status(400).json({ message: "The quantity should be between 0 and 100" })
                            logger.info("The quantity should be between 0 and 100");
                        }
                    } else {
                        res.status(400).json({ message: "Product with same SKU already exist" });
                        logger.info("Product with same SKU already exist");
                    }
                } else {
                    console.log("result: ", result)
                    res.status(401).json({ message: "Password is not a match" });
                    logger.info("Password is not a match");
                }
            })
        }).catch(err => {
            logger.info("Username not found");
            return res.status(401).json({ message: "Username not found" });
        })
}

exports.findOne = (req, res) => {
    // Increment a metric
    client.increment('product.findOne');
    logger.info("In product findOne");
    const id = req.params.id;
    Product.findByPk(id)
        .then(data => {
            if (data) {
                res.status(200).send(data);
                logger.info("Found the product");
            } else {
                res.status(401).json({
                    message: `Cannot find Product with id=${id}.`
                });
                logger.info("Cannot find the Product");
            }
        })
        .catch(err => {
            res.status(403).json({
                message: "Error retrieving product with id=" + id
            });
            logger.info("Error retrieving the product");
        });
};

exports.update = async (req, res) => {
    // Increment a metric
    client.increment('product.update');
    logger.info("In update product");
    let id = req.params.id;
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
    const product = {
        name: req.body.name,
        description: req.body.description,
        sku: req.body.sku,
        manufacturer: req.body.manufacturer,
        quantity: req.body.quantity,
        // owner_user_id: val.dataValues.id
    }
    let salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    let skuExists = await Product.findOne({ where: { sku: req.body.sku } });
    Users.findOne({ where: { username: username } })
        .then(val => {
            console.log("val", val.dataValues.id)
            bcrypt.compare(password, val.dataValues.password, async (error, result) => {
                if (error) {
                    logger.info("Password incorrect");
                    return res.status(401).json({ message: "Password incorrect" })

                } else if (result) {
                    Product.findOne({ where: { owner_user_id: val.dataValues.id, id: id } })
                        .then(val1 => {
                            console.log("val1: ", val1)
                            if (val.dataValues.id === val1.dataValues.owner_user_id) {
                                if (req.body.quantity >= 0 && req.body.quantity <= 100 && typeof req.body.quantity === 'number') {
                                    req.body.sku === val1.dataValues.sku ?
                                        Product.update(product, {
                                            where: { id: id }
                                        })
                                            .then(num => {
                                                if (num == 1) {
                                                    res.status(204).json({
                                                        message: "Product was updated successfully."
                                                    });
                                                    logger.info("Product was updated successfully.");

                                                } else {
                                                    res.status(403).json({
                                                        message: `Cannot update Product with id=${id}.`
                                                    });
                                                    logger.info("Cannot update the Product");
                                                }
                                            })
                                            .catch(err => {
                                                res.status(400).json({
                                                    message: "Error updating Product with id=" + id
                                                });
                                                logger.info("Cannot update the Product");
                                            }) : !skuExists ? Product.update(product, {
                                                where: { id: id }
                                            })
                                                .then(num => {
                                                    if (num == 1) {
                                                        res.status(204).json({
                                                            message: "Product was updated successfully."
                                                        });
                                                        logger.info("Product was updated successfully.");
                                                    } else {
                                                        res.status(403).json({
                                                            message: `Cannot update Product with id=${id}.`
                                                        });
                                                        logger.info("Cannot update the Product");
                                                    }
                                                })
                                                .catch(err => {
                                                    res.status(400).json({
                                                        message: "Error updating Product with id=" + id
                                                    });
                                                    logger.info("Cannot update the Product");
                                                }) : res.status(400).json({ message: "Sku already exists" })
                                } else {
                                    res.status(400).json({ message: "The quantity should be between 0 and 100" })
                                    logger.info("The quantity should be between 0 and 100");
                                }
                            } else {
                                res.status(403).json({ message: "Not authorized to update this product" })
                                logger.info("Not authorized to update this product");
                            }
                        }).catch(err => {
                            res.status(403).json({ message: "Not authorized to update this product" })
                            logger.info("Not authorized to update this product");
                        })
                } else {
                    res.status(401).json({ message: "Password is not correct" });
                    logger.info("Password is not correct");
                }
            });

        }).catch(err => {
            logger.info("Username not found");
            res.status(401).json({ message: "Username not found" })
        })


}

exports.delete = async (req, res) => {
    // Increment a metric
    client.increment('product.delete');
    logger.info("In product delete");
    let id = req.params.id;
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
    let salt = await bcrypt.genSalt(10);
    let regex= /^[A-Za-z]*$/
    const encryptedPassword = await bcrypt.hash(password, salt);
    Users.findOne({ where: { username: username } })
        .then(val => {
            console.log("val", val.dataValues.id)
            bcrypt.compare(password, val.dataValues.password, async (error, result) => {
                if (error) {
                    logger.info("Password incorrect");
                    return res.status(401).json({ message: "Password incorrect" })
                } else if (result) {
                    Product.findOne({ where: { owner_user_id: val.dataValues.id, id: id } })
                    .then(val1 => {
                        console.log("val1: ", val1)
                        if (val.dataValues.id === val1.dataValues.owner_user_id) {
                            if(regex.test(id)){
                                logger.info("Bad Request");
                                res.status(400).send({ message: "Bad Request" })
                            } else {
                            Product.destroy({
                                where: { id: id }
                            })
                                .then(num => {
                                    logger.info("Product was deleted successfully!");
                                    res.status(204).json({
                                        message: "Product was deleted successfully!"
                                    });
                                })
                                .catch(err => {
                                    logger.info("Could not delete the Product");
                                    res.status(403).json({
                                        message: "Could not delete Product with id=" + id
                                    });
                                })};
                        } else {
                            logger.info("Not authorized to delete this product");
                            res.status(403).json({ message: "Not authorized to delete this product" })
                        }
                    }).catch(err => {
                        res.status(403).json({ message: "No product exists for this owner Id" })
                        logger.info("No product exists for this owner Id");
                })
            } else {
                logger.info("Password incorrect");
                return res.status(401).json({ message: "Password incorrect" })
            }
        })
    }).catch(err => {
        logger.info("Username not found");
        res.status(401).json({ message: "Username not found" })
    })
};

exports.patch = async (req, res) => {
    // Increment a metric
    client.increment('product.patch');
    logger.info("In product patch");
    const id = req.params.id;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        logger.info("Unauthorized");
        return res.status(401).json({ message: "Unauthorized" })
    }

    const [type, credentials] = authHeader.split(" ");
    if (type !== "Basic") {
        logger.info("Unauthorized");
        return res.status(401).json({ message: "unauthorized" });
    }

    const [username, password] = Buffer.from(credentials, "base64")
        .toString()
        .split(":");
    let salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    Users.findOne({ where: { username: username } })
        .then(val => {
            bcrypt.compare(password, val.dataValues.password, async (error, result) => {
                if (error) {
                    logger.info("password incorrect");
                    return res.status(401).json({ message: "password incorrect" })
                } else if (result) {
                    Product.findOne({ where: { owner_user_id: val.dataValues.id, id: id } })
                        .then(value => {

                            if (val.dataValues.id === value.dataValues.owner_user_id) {
                                if (req.body.quantity) {
                                    if (req.body.quantity >= 0 && req.body.quantity <= 100 && typeof req.body.quantity === 'number') {

                                        console.log("req.body 1: ", req.body)
                                        Product.update(req.body, { where: { id }, individualHooks: true })
                                            .then((rowsAffected) => {

                                                if (Object.entries(rowsAffected[1]).length === 0) {
                                                    logger.info("Product not found.  Update failed");
                                                    res.status(403).json({ message: `Product not found.  Update failed.` });
                                                    return;
                                                }
                                                console.log("req.body", req.body)
                                                if (rowsAffected[0] === 1) {
                                                    res.status(204).json({
                                                        message: `Product updated.`,
                                                        id: id,
                                                        payload: req.body,
                                                    });
                                                    logger.info("Product updated.");
                                                } else {
                                                    res.status(400).json({ message: "No fields have changed. Product not updated." });
                                                    logger.info("No fields have changed. Product not updated.");
                                                }

                                            })
                                            .catch((err) => {
                                                res.status(400).json({ message: "Something went wrong while updating the product." });
                                                logger.info("Something went wrong while updating the product.");
                                            });
                                    } else {
                                        res.status(400).json({ message: "The quantity should be between 0 and 100" })
                                        logger.info("The quantity should be between 0 and 100");
                                    }
                                } else {
                                    Product.update(req.body, { where: { id }, individualHooks: true })
                                        .then((rowsAffected) => {

                                            if (Object.entries(rowsAffected[1]).length === 0) {
                                                res.status(403).json({ message: `Product not found.  Update failed.` });
                                                logger.info("Product not found.  Update failed.");
                                                return;
                                            }
                                            console.log("req.body", req.body)
                                            if (rowsAffected[0] === 1) {
                                                res.status(204).json({
                                                    message: `Product updated.`,
                                                    id: id,
                                                    payload: req.body,
                                                });
                                                logger.info("Product updated.");
                                            } else {
                                                res.status(400).json({ message: "No fields have changed. Product not updated." });
                                                logger.info("No fields have changed. Product not updated.");
                                            }

                                        })
                                        .catch((err) => {
                                            res.status(403).json({ message: "Something went wrong while updating the product." });
                                            logger.info("Something went wrong while updating the product.");
                                        });
                                }

                            } else {
                                logger.info("product with owner id not found");
                                return res.status(403).json({ message: "product with owner id not found" })
                            }
                        })
                        .catch(err => {
                            logger.info("product not found");
                            return res.status(403).json({ message: "product not found" })
                        })
                } else {
                    logger.info("Password is not a match");
                    res.status(401).json({ message: "Password is not a match" });
                }
            })
            // return res.status(200).json({ message: "Username found" })
        })
        .catch(err => {
            logger.info("Username not found");
            return res.status(401).json({ message: "Username not found" })
        })
}

exports.imagePost = (req, res) => {
    // Increment a metric
    client.increment('product.imagePost');
    logger.info("In image post");
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
    const id = req.params.id
    Users.findOne({ where: { username: username } })
        .then(val => {
            console.log("val: ", val.dataValues);
            bcrypt.compare(password, val.dataValues.password, async (error, result) => {
                if (error) {
                    logger.info("Password Incorrect");
                    return res.status(401).json({ message: "Password Incorrect" })
                } else if (result) {
                    console.log("id: ", id)
                    console.log("val.dataValues.id: ", val.dataValues.id)
                    Product.findOne({ where: { owner_user_id: val.dataValues.id, id: id } })
                        .then(val1 => {
                            console.log("val1: ", val1)
                            if (val.dataValues.id === val1.dataValues.owner_user_id) {
                                singleUpload(req, res, function (err) {
                                    if (err) {
                                        logger.info("Image Upload Error");
                                        return res.status(422).send({ errors: [{ title: 'Image Upload Error', detail: err.message }] });
                                    }
                                    else {
                                        const image = {
                                            product_id: req.params.id,
                                            file_name: req.file.key,
                                            s3_bucket_path: req.file.location,
                                        }

                                        Image.create(image)
                                            .then(data => {
                                                res.status(201).send(data)
                                            })
                                            .catch(err => {
                                                logger.info("Could not create");
                                                res.status(401).json({ message: "Could not create" });
                                            });
                                    }
                                    console.log(req.file)

                                    // return res.json({'imageUrl': req.file.location});
                                });
                            } else {
                                logger.info("Password incorrect");
                                return res.status(401).json({ message: "Password incorrect" })
                            }
                        })
                        .catch(err => {
                            console.log('err: ',err)
                            logger.info("Product not found");
                            res.status(400).json({ message: "Product not found." })
                        })
                } else {
                    logger.info("Password incorrect");
                    return res.status(401).json({ message: "Password incorrect" })
                }
            })
        }).catch(err => {
            logger.info("Username not found");
            res.status(401).json({ message: "Username not found" })
        })
}

exports.imageGet = async (req, res) => {
    // Increment a metric
    client.increment('product.imageGet');
    logger.info("In image get");
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

    const id = req.params.id;
    Users.findOne({ where: { username: username } })
        .then(val => {
            bcrypt.compare(password, val.dataValues.password, async (error, result) => {
                if (error) {
                    logger.info("Password Incorrect");
                    return res.status(401).json({ message: "Password Incorrect" })
                } else if (result) {
                    Product.findOne({ where: { owner_user_id: val.dataValues.id, id: id } })
                        .then(val1 => {
                            console.log("val1: ", val1)
                            if (val.dataValues.id === val1.dataValues.owner_user_id) {
                                Image.findAll({ where: { product_id: id } })
                                    .then(data => {
                                        if (data) {
                                            res.status(200).send(data);
                                        } else {
                                            logger.info("Cannot find Image");
                                            res.status(403).json({
                                                message: `Cannot find Image with id=${id}.`
                                            });
                                        }
                                    })
                                    .catch(err => {
                                        logger.info("Error retrieving Image");
                                        res.status(403).json({
                                            message: "Error retrieving Image with id=" + id
                                        });
                                    });
                            } else {
                                logger.info("Password incorrect");
                                return res.status(401).json({ message: "Password incorrect" })
                            }
                        })
                        .catch(err => {
                            logger.info("Product not found");
                            res.status(403).json({ message: "Product not found." })
                        })
                } else {
                    logger.info("Password incorrect");
                    return res.status(401).json({ message: "Password incorrect" })
                }
            })
        }).catch(err => {
            logger.info("Username not found");
            res.status(403).json({ message: "Username not found" })
        })

}

exports.imageDetails = (req, res) => {
    // Increment a metric
    client.increment('product.imageDetails');
    logger.info("In image details");
    let id = req.params.id
    let imageId = req.params.imageid
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

    Users.findOne({ where: { username: username } })
        .then(val => {
            bcrypt.compare(password, val.dataValues.password, async (error, result) => {
                if (error) {
                    logger.info("Password Incorrect");
                    return res.status(401).json({ message: "Password Incorrect" })
                } else if (result) {
                    Product.findOne({ where: { owner_user_id: val.dataValues.id, id: id } })
                        .then(val1 => {
                            console.log("val1: ", val1)
                            if (val.dataValues.id === val1.dataValues.owner_user_id) {
                                Image.findAll({ where: { image_id: imageId, product_id: id } })
                                    .then(data => {
                                        if (data) {
                                            res.status(200).send(data);
                                            logger.info("Successfully retrieved the image details");
                                        } else {
                                            res.status(403).json({
                                                message: `Cannot find Image with id=${imageId}.`
                                            });
                                            logger.info("Cannot find Image");
                                        }
                                    })
                                    .catch(err => {
                                        res.status(403).json({
                                            message: "Error retrieving Image with id=" + imageId
                                        });
                                        logger.info("Error retrieving Image");
                                    })
                            } else {
                                logger.info("Password incorrect");
                                return res.status(401).json({ message: "Password incorrect" })
                            }
                        })
                        .catch(err => {
                            logger.info("Product not found");
                            res.status(403).json({ message: "Product not found." })
                        })
                } else {
                    logger.info("Password incorrect");
                    return res.status(401).json({ message: "Password incorrect" })
                }
            })
        }).catch(err => {
            logger.info("Username not found");
            res.status(403).json({ message: "Username not found" })
        })
}

exports.imageDelete = (req, res) => {
    // Increment a metric
    client.increment('product.imageDelete');
    logger.info("In image delete");
    let id = req.params.id
    let imageId = req.params.imageid
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

    Users.findOne({ where: { username: username } })
        .then(val => {
            bcrypt.compare(password, val.dataValues.password, async (error, result) => {
                if (error) {
                    logger.info("Password Incorrect");
                    return res.status(401).json({ message: "Password Incorrect" })
                } else if (result) {
                    Product.findOne({ where: { owner_user_id: val.dataValues.id, id: id } })
                        .then(val1 => {
                            console.log("val1: ", val1)
                            if (val.dataValues.id === val1.dataValues.owner_user_id) {
                                Image.findOne({ where: { image_id: imageId } })
                                    .then(val => {
                                        console.log(val.dataValues.file_name)
                                        if(regex.test(id) || regex.test(imageId)){
                                            res.status(400).send({ message: "Bad Request" })
                                            logger.info("Bad Request");
                                        } else {
                                        Image.destroy({ where: { image_id: imageId, product_id: id } })
                                            .then(async data => {
                                                if (data) {
                                                    console.log(data)
                                                    const params = {
                                                        Bucket: dbconfig.s3_bucket_name,
                                                        Key: val.dataValues.file_name
                                                    }
                                                    try {
                                                        await s3.headObject(params).promise()
                                                        console.log("File Found in S3")
                                                        logger.info("File Found in S3");
                                                        try {
                                                            await s3.deleteObject(params).promise()
                                                            console.log("file deleted Successfully")
                                                            logger.info("file deleted Successfully");
                                                        }
                                                        catch (err) {
                                                            console.log("ERROR in file Deleting : " + JSON.stringify(err))
                                                            logger.info("ERROR in file Deleting");
                                                        }
                                                    } catch (err) {
                                                        console.log("File not Found ERROR : " + err.code)
                                                        logger.info("File not Found ERROR");
                                                    }
                                                    res.status(204).send({ message: "Image successfully deleted!" });
                                                    logger.info("Image successfully deleted!");
                                                } else {
                                                    res.status(403).json({
                                                        message: `Cannot find Image with id=${imageId}.`
                                                    });
                                                    logger.info("Cannot find Image");
                                                }
                                            })
                                            .catch(err => {
                                                res.status(403).json({
                                                    message: "Error retrieving Image with id=" + imageId
                                                });
                                                logger.info("Error retrieving Image");
                                            })}
                                    })
                                    .catch(err => {
                                        res.send(403).json({ message: "Image not found" })
                                        logger.info("Image not found");
                                    })
                            } else {
                                logger.info("Password incorrect");
                                return res.status(401).json({ message: "Password incorrect" })
                            }
                        })
                        .catch(err => {
                            logger.info("Product not found");
                            res.status(403).json({ message: "Product not found." })
                        })
                } else {
                    logger.info("Password incorrect");
                    return res.status(401).json({ message: "Password incorrect" })
                }
            })
        }).catch(err => {
            logger.info("Username not found");
            res.status(403).json({ message: "Username not found" })
        })


}