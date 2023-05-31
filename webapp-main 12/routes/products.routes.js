module.exports = app=>{
    const product = require("../controller/product.controller.js")
    var router = require("express").Router();  
    router.post("/", product.create);  
    router.get("/:id", product.findOne); 
    router.put("/:id", product.update); 
    router.delete("/:id", product.delete); 
    router.patch("/:id", product.patch);  
    app.use("/v2/product", router);
    router.get("/:id/image", product.imageGet);
    router.post("/:id/image", product.imagePost)
    router.get("/:id/image/:imageid", product.imageDetails);
    router.delete("/:id/image/:imageid", product.imageDelete);
};




