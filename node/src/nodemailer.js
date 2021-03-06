const nodemailer = require("nodemailer");
let transporter = null;
const USE_NODEMAILER = process.env.USE_EMAIL_APP;

const nodemailer_setup = (callback) => {
    if(USE_NODEMAILER == "true"){
        nodemailer.createTestAccount((err, account) => {
            transporter = nodemailer.createTransport(
                {
                    service: "Gmail",
                    auth: {
                        user: process.env.EMAIL_APP,
                        pass: process.env.EMAIL_APP_PASSWORD
                    }
                }
            );
            callback();
        });
    }
    else{
        callback();
    }
  }

  
const send_test_email = (message, to) => {
    let mailOptions = {
        from: '<tripplannerservice@gmail.com>',
        to: to,
        subject: "verify your account",
        text: "https://localhost:8083/verify/"+message,
        //html: "<h1>"+"https://localhost:8083/verify/"+message+"</h1>"
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if(error){
            return console.log(error);
        }
        console.log("message sent");
    })
}

module.exports = {
    "nodemailer_setup" : nodemailer_setup,
    "send_test_email" : send_test_email,
    "USE_NODEMAILER": USE_NODEMAILER
    };