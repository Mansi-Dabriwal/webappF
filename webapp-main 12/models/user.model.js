module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("user", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey:true,
    },
    first_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    last_name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    username: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  //   account_created: {
  //     type: Sequelize.DATE,
  //     defaultValue: Sequelize.NOW,
  //   },
  //   account_updated: {
  //     type: Sequelize.DATE,
  //     defaultValue: Sequelize.NOW,
  //   },
    
  },{
      sequelize,
      modelName: 'User',
      timestamps: true,
      updatedAt: 'account_updated',  
      createdAt: 'account_created',
      logging:false
    });
  User.associate = models => {
      User.hasMany(models.products, {
          foreignKey: 'owner_user_id',
          sourceKey: 'differentUniqueAttribute'
      })
  }
  return User;
};