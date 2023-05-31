#!/bin/bash
echo "Running shell script"
sudo yum -y update
# sudo yum -y upgrade

echo "Running nodejs commands"
curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

#Commenting cause using RDS
# echo "Installing postgres"
# sudo yum -y install postgresql postgresql-server postgresql-devel
# sudo postgresql-setup initdb
# sudo systemctl enable postgresql
# sudo systemctl start postgresql
# sudo sed -i 's/ident/md5/' /var/lib/pgsql/data/pg_hba.conf
# sudo systemctl restart postgresql
# sudo -i -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'M@nsi2875';"

sudo amazon-linux-extras install postgresql10
echo "Installing unzip"
sudo yum install unzip -y
mkdir webApp
cd webApp || exit
sudo cp /tmp/webApp.zip /home/ec2-user/webApp/webApp.zip
pwd
unzip /home/ec2-user/webApp/webApp.zip -d /home/ec2-user/webApp
cd webapp-main 

npm install
sudo npm install pm2 -g
sudo pm2 start server.js
sudo pm2 startup
sudo pm2 save

