module.exports = app=>{
    const user = require("../controller/user.controller.js")
    var router = require("express").Router();  
    router.post("/", user.create);  
    router.get("/:id", user.findOne); 
    router.put("/:id", user.update);   
    app.use("/v2/user", router);
};
