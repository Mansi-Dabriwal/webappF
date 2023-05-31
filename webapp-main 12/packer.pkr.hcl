variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "source_ami" {
  type    = string
  default = "ami-006dcf34c09e50022"//"ami-006dcf34c09e50022" # Amazon Linux 2
}

variable "ssh_username" {
  type    = string
  default = "ec2-user"
}

variable "subnet_id" {
  type    = string
  default = "subnet-04e931d6dfe65f4eb"
}


# https://www.packer.io/plugins/builders/amazon/ebs
source "amazon-ebs" "my-ami" {
  region     = "${var.aws_region}"
  ami_name        = "csye6225-${formatdate("YYYY_MM_DD_hh_mm_ss", timestamp())}"
  ami_description = "AMI for CSYE 6225"
  ami_users = ["226539955784","083968887191"]
  ami_regions = [
    "us-east-1",
  ]


  aws_polling {
    delay_seconds = 120
    max_attempts  = 50
  }


  instance_type = "t2.micro"
  source_ami    = "${var.source_ami}"
  ssh_username  = "${var.ssh_username}"
  // subnet_id     = "${var.subnet_id}"




  ami_block_device_mappings {
    delete_on_termination = true
    device_name           = "/dev/xvda"
    volume_size           = 8
    volume_type           = "gp2"
  }


}

build {
  sources = ["source.amazon-ebs.my-ami"]

  provisioner "file" {
    source      = "./webApp.zip" //zip LOCATION (pwd) in your github actipon
    destination = "/tmp/webApp.zip" //ec2
  }


  provisioner "file" {
    source      = "./project.service"
    destination = "/tmp/project.service"
  }

  
  provisioner "shell" {
    script = "./app.sh"
  }

  provisioner "file" {
    source = "./cloud-watch.json"
    destination = "/home/ec2-user/webApp/cloud-watch.json"
  }
  
  provisioner "shell" {
    inline = [
      "curl https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm -O",
      "sudo rpm -U ./amazon-cloudwatch-agent.rpm",
      "sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/home/ec2-user/webApp/cloud-watch.json -s"
    ]
  }

   post-processor "manifest"{
    output = "manifest.json"
    strip_path = true
  }
  
}