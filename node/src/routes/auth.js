const express = require('express');
const request = require("request");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');

const EMAIL_SECRET = process.env.EMAIL_SECRET;

const nodemailer = require("../nodemailer")
const couchdb = require("../couchdb");

router.post('/login/', async (req, res) => {

    if(!(req.body.username && req.body.password)){
        res.status(400).send('Bad Request - register');
    }
    const username = req.body.username.trim().toLowerCase();
    const password = req.body.password;

    couchdb.get_document_from_database(username, "user_db", async function(error, response){
        json_response = JSON.parse(response.body);  //requested user object from database
        if(error) {
            res.status(500).send('Internal Server Error');
        } else {
            if(response.statusCode === 200){
                try{
                    if(await bcrypt.compare(password, json_response.password)){
                        if(json_response.verified == false){
                            res.json({status:'error', 
                                username:'Verify your email',
                                password: ""}); //email not verified;
                        }
                        else{
                            console.log(json_response.api_key);
                            req.session.isAuth = true;
                            req.session.username = username;
                            req.session.email = json_response.email;
                            req.session.api_key = json_response.api_key;
                            res.json({status:"ok"}); //username and password are correct, login
                        }  
                    }else{
                        //res.send('failed, wrong password'); //username exists but wrong password
                        res.json({status:'error', 
                                username:'',
                                password: "Wrong password"}); //username is not registered yet );
                    }
                }catch{
                    res.status(500).send('Internal Server Error');
                }
            }
            else{
                res.json({status:"error",
                        username:'This username is not registered',
                        password: ""}); //username is not registered yet 
            }
        }
    });
});

router.post('/logout/', (req, res) => {
    if(req.session.isAuth){
        req.session.destroy((err) => {
            if(err) throw err;
            res.clearCookie("connect.sid", { path: "/" });
            res.send("logged out");   //destroy the existing session
        })
    }
    else{
        res.send("You aren't logged in");  //no session to destroy
    }
});

router.post('/register/', async (req, res) => {

    if(!(req.body.username && req.body.email && req.body.password)){
        res.status(400).send('Bad Request - register');
    }

    const username = req.body.username.trim().toLowerCase();
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    if(username.trim() == ""){
        res.json({status:"error",
                        username:"username can't be empty",
                        email:"",
                        password: ""});;  //empty username
                        return;
    }
    if(validate_email(email) == false){
        res.json({status:"error",
                        username:"",
                        email:"enter a valid email",
                        password: ""});;  //invalid email
                        return;
    }
    if(password == ""){
        res.json({status:"error",
                        username:"",
                        email:"",
                        password: "password can't be empty"});;  //empty password
                        return;
    }

    try{
        const hashedPassword = await bcrypt.hash(password, 10);  //password hashing
        const user = {username: username, email: email, password: hashedPassword, verified: false, api_key: uuidv4()}; //user model
        //Store user in database. If a user with the same username exists, don't overwrite
        request({
            url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/user_db/_design/user_ddoc/_view/user_view',  
            method: 'GET',
        }, function(error, response, body){
            if(error) {
                res.status(500).send('Internal Server Error');
                //console.log(error); //database error
            } else {
                view_data = JSON.parse(response.body);
                //console.log(view_data);
                for(const view_data_row of view_data.rows){
                    if(view_data_row.key == username){
                        res.json({status:"error",
                        username:'This username already exists',
                        email:"",
                        password: ""});;  //user with same username already exists
                        return;
                    }
                    if(view_data_row.value.email == email){
                        res.json({status:"error",
                        username:'',
                        email:"This email is already used",
                        password: ""});;  //user with same email already exists
                        return;
                    }
                }
                request({
                    url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/user_db/' + username, 
                    method: 'PUT',
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify(user)
                }, function(error, response, body){
                    if(error) {
                        console.log(error);
                        res.status(500).send('Internal Server Error');  //internal request error
                    }
                    else{
                        const email_token = jwt.sign(
                            {
                                user: username,
                            },
                            EMAIL_SECRET,
                            {
                                expiresIn: "1d",
                            },
                        );
                        if(nodemailer.USE_NODEMAILER == true){
                            nodemailer.send_test_email(email_token, email);
                            res.json({status:"ok"});  //username is valid, the user was successfully registered
                        }else{
                            res.redirect("/verify/"+email_token)
                        }
                    }
                });
            }
        });
    }
    catch{
        res.status(500).send('Internal Server Error');  //internal bcrypt error
    }
});

router.get('/verify/:token', (req,res) => {
    let data = null;
    try{
        data = jwt.verify(req.params.token, EMAIL_SECRET);
        console.log(data.user);
    }catch (e) {
        res.send('error');
        console.log('error');
    }
    couchdb.get_document_from_database(data.user, "user_db", (error, response)=>{
        if(error){
            res.status(500).send('Internal Server Error');
        }
        else{
            json_response = JSON.parse(response.body);
            const rev = json_response._rev;
            const input = {username: json_response.username, password: json_response.password, email: json_response.email, api_key: json_response.api_key, verified: true, _rev : rev };
            couchdb.put_document_in_database(data.user, "user_db", input, (error, response)=>{
                if(error){
                    res.status(500).send('Internal Server Error');
                }
                else{
                    req.session.isAuth = true;
                    req.session.username = json_response.username;
                    req.session.email = json_response.email;
                    req.session.api_key = json_response.api_key;
                    if(nodemailer.USE_NODEMAILER == false){
                        res.json({status: "ok"});
                    }
                    else{
                        res.redirect("/");
                    }
                }
            });
        }
    });
});

function validate_email(email)
{
    console.log(email)
  let regex_email = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regex_email)) {
    return true; 
  } else {
    return false; 
  }
}

module.exports = router;