module.exports = {
  HOST: "localhost",
  USER: "postgres",
  PASSWORD: "M@nsi2875",
  DB: "postgres",
  dialect: "postgres",
  s3_bucket_name:"my-s3-bucket-3beb24c7-be10-0b55-4dd0-699f0b7336fb",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

