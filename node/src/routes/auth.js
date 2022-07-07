const express = require('express');
const request = require("request");
const bcrypt = require("bcrypt");

const router = express.Router();

router.post('/login/', async (req, res) => {
    request({
        url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/user_db/' + req.body.username, 
        method: 'GET'
    }, async function(error, response, body){

        json_response = JSON.parse(response.body);  //requested user object from database
        if(error) {
            res.status(500).send('error, database request');
        } else {
        
            if(response.statusCode === 200){
                try{
                    if(await bcrypt.compare(req.body.password, json_response.password)){
                        if(req.body.token){
                            req.session.token = req.body.token
                        }
                        req.session.isAuth = true;
                        req.session.username = req.body.username;
                        req.session.email = json_response.email;
                        res.json({status:"ok"});  //username and password are correct, login
                    }else{
                        //res.send('failed, wrong password'); //username exists but wrong password
                        res.json({status:'error', 
                                username:'',
                                password: "Wrong password"}); //username is not registered yet );
                    }
                }catch{
                    res.status(500).send('error, bcrypt');
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
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10);  //password hashing
        const user = {username: req.body.username, email: req.body.email, password: hashedPassword}; //user model
        //Store user in database. If a user with the same username exists, don't overwrite
        request({
            url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/user_db/' + user.username, 
            method: 'PUT',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(user)
        }, function(error, response, body){
            if(error) {
                console.log(error);
                res.status(500).send('error, database request');  //internal request error
            } else {
                if(response.statusCode === 201){
                    if(req.body.token){
                        req.session.token = req.body.token
                    }
                    req.session.isAuth = true;
                    req.session.username = req.body.username;
                    req.session.email = req.body.email;
                    res.json({status:"ok"});  //username is valid, the user was successfully registered
                }
                else{
                    res.json({status:"error",
                        username:'This username already exists',
                        email:"",
                        password: ""});;  //user with same username already exists
                }
            }
        });
    }
    catch{
        res.status(500).send('error, bcrypt');  //internal bcrypt error
    }
});

module.exports = router;