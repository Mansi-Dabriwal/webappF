##Webapp Install node modules by running npm i node-modules

Models are created for both user and products

In User Controller - Create api is for creating the user if the username doesn't exist. FindOne api is for getting the users from the respective Id, when Basic Auth is verified Update api is for updating the user details after Basic Auth is verified.

Routes are for routing the api's to the respective api functions.

In Product Controller -

Create api is used to create products using authentication, and also checks if the sku already exists in the database and if the quantity listed is between the range from 0 to 100

findByPk is used to get the products by the primary key

update api is used to update all the data in the database except the username. The products are updated by authenticated users only.

delete api is used to delete any data by its id. Only the authenticated user who has created the product can delete the same product

patch api is used to update one or more fields in the data. this api can also be performed only by the user who has created the product
