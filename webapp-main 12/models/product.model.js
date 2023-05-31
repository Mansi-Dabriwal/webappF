module.exports = (sequelize, Sequelize) => {
  const Product = sequelize.define("product", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey:true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING,
      allowNull: false
    },
    sku: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    manufacturer: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    owner_user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    
  
  },
  {
    sequelize,
    modelName: 'Product',
    timestamps: true,
    updatedAt: 'date_last_updated',  
    createdAt: 'date_added',
    logging:false
  });
  Product.associate = (models) => {
    Product.belongsTo(models.users, {
        foreignKey: 'owner_user_id',
        targetKey: 'differentUniqueAttribute'
    })

}

  return Product;
};