module.exports = (sequelize, Sequelize) => {
    const image = sequelize.define("image", {
        image_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        product_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        file_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        date_created: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
        },
        s3_bucket_path: {
            type: Sequelize.STRING,
        }
    })
    return image;
}