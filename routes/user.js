var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var async = require('async');

var crypto = require('crypto');
var User = require('../models/user');
var secret = require('../secret/secret');

module.exports = (app, passport) => {
    app.get("/", function(req, res, next) {

    if(req.session.cookie.originalMaxAge!==null){
        res.redirect('/home');
    }else{
        res.render("index", { title: "Rate Me" });
    }
  });

    app.get("/signup", function(req, res) {
      var errors = req.flash('error');
      console.log(errors);
    res.render("user/signup", { title: "Sign Up || Rate Me" ,messages:errors,hasErrors:errors.length>0});
  });

    app.post( "/signup",validate,passport.authenticate("local.signup", {
      successRedirect: "/",
      failureRedirect: "/signup",
      failureFlash: true
    })
  );

    app.get("/login", function(req, res) {
    var errors = req.flash('error');
    console.log(errors);
    res.render("user/login", { title: "Login || Rate Me" ,messages:errors,hasErrors:errors.length>0});
  });

    app.post( "/login",validLogin,passport.authenticate("local.login", {
   // successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: true
  }),(req,res) =>{
      if(req.body.rememberme){
          req.session.cookie.maxAge = 30*24*60*60*1000;
      }
      else{
          req.session.cookie.expires = null;
      }
      res.redirect('/home');
  }
);

app.get('/auth/facebook',passport.authenticate('facebook',{scope:'email'}));

app.get('/auth/facebook/callback',passport.authenticate('facebook',{
    successRedirect:'/home',
    failureRedirect:'/login',
    failureFlash:true
}))

    app.get('/home',isLoggedIn,(req,res)=>{
    res.render('home',{title:"Home || Rate Me", user:req.user});
});

    app.get('/forgot',(req,res)=>{
    var errors = req.flash('error');

    var info = req.flash('info');
    res.render('user/forgot',{title:"Forget || Rate Me",messages:errors,hasErrors:errors.length>0,info:info,noErrors:info.length>0});
});

    app.post('/forgot',(req,res,next)=>{
    async.waterfall([
           function(callback){
               crypto.randomBytes(20 , (err,buf)=>{
                   var rand = buf.toString('hex');
                   callback(err,rand);
               })
           } ,
           function(rand,callback){
                User.findOne({'email':req.body.email},(err,user)=>{
                    if(!user){
                        req.flash('error','No Account With That Email Exists or Email is Invalid ');
                        return res.redirect('/forgot');
                    }

                    user.passwordResetToken = rand;
                    user.passwordResetExpires = Date.now() + 120*60*1000;
                    
                    user.save((err)=>{
                        callback(err,rand,user);
                    });
                })
           },

           function(rand,user,callback){
               var smtpTransport = nodemailer.createTransport({
                   service:'Gmail',
                   auth:{
                       user:secret.auth.user,
                       pass:secret.auth.password,
                   }
               });
               var mailOption = {
                   to:user.email,
                   from:'RateMe '+'<'+secret.auth.user+'>',
                   subject: 'RateMe Application Password Reset Token',
                   text:'You have requested for password reset Token. \n\n'+
                                'Please click on the link to complete the process: \n\n'+
                                'http://localhost:3000/reset/'+rand+'\n\n'
               };
               smtpTransport.sendMail(mailOption,(err,response)=>{
                   req.flash('info','A password reset token has been sent to '+user.email);
                   return callback(err,user);
               })
           }
    ],
            (err)=>{
                if(err){
                    return next(err);
                }
                res.redirect('/forgot');
            }
    )
});

    app.get('/reset/:token',(req,res)=>{
        User.findOne({passwordResetToken:req.params.token,passwordResetExpires:{$gt:Date.now()}},
        (err,user)=>{
            if(!user){
                req.flash('error','Password reset token has expired or is invalid. Enter your Email to get a new token');
                return res.redirect('/forgot');
            }
            var errors = req.flash('error');
            var success = req.flash('success');
            res.render('user/reset',{title:'Reset Your Password',messages:errors,hasErrors:errors.length>0,success:success,noErrors:success.length>0});
        })
    });

    app.post('/reset/:token',(req,res)=>{
        async.waterfall([
            function(callback){
                User.findOne({passwordResetToken:req.params.token,passwordResetExpires:{$gt:Date.now()}},
                (err,user)=>{
                    if(!user){
                        req.flash('error','Password reset token has expired or is invalid. Enter your Email to get a new token');
                        return res.redirect('/forgot');
                    }
                    req.checkBody('password','password is required').notEmpty();
                    req.checkBody('password','Password Must Not Be Less Than 5').isLength({min:5});
                    req.check('password','Password Must Contain Numbers and letter').matches(/^(?=.*\d)(?=.*[a-z])[0-9a-zA-Z]{5,}$/,"i");

                    var errors = req.validationErrors();
                    if(req.body.password == req.body.cpassword){
                        if(errors){
                            var messages = [];
                            errors.forEach((error)=>{
                                    messages.push(error.msg);
                            })
 
                            var errors = req.flash('error');
                            res.redirect('/reset/'+req.params.token);
                        }
                        else{
                            user.password = user.encryptPassword(req.body.password);;
                            user.passwordResetToken = undefined;
                            user.passwordResetExpires = undefined;

                            user.save((err)=>{
                                req.flash('success' , 'Your Password has been successfully updated.');
                                callback(err,user);
                            })
                        }
                    }else{
                        req.flash('error', 'Password and confirm Password do not match.');
                        res.redirect('/reset/'+req.params.token);
                    }
                });
               
            },
            function(user,callback){
                var smtpTransport = nodemailer.createTransport({
                    service:'Gmail',
                    auth:{
                        user:secret.auth.user,
                        pass:secret.auth.password,
                    }
                });
                var mailOption = {
                    to:user.email,
                    from:'RateMe '+'<'+secret.auth.user+'>',
                    subject: 'Your Password has been updated',
                    text:'This is a confirmation that you updated the password for '+user.email
                };
                smtpTransport.sendMail(mailOption,(err,response)=>{
                    callback(err,user);

                    var error = req.flash('error');
                    var success = req.flash('success');

                    res.render('user/reset',{title:'Reset Your Password',messages:error,hasErrors:error.length>0,success:success,noErrors:success.length>0});
                })
            }
        ]);
    });

    app.get('/logout',(req,res)=>{
        req.logout();
        req.session.destroy((err)=>{
            res.redirect('/')
        })
    })

};

function validate(req,res,next){
        req.checkBody('fullname','FullName is required').notEmpty();
        req.checkBody('fullname','FullName Must Not Be Less Than 5').isLength({min:5});
        req.checkBody('email','Email is required').notEmpty();
        req.checkBody('email','Email is Invalid').isEmail();
        req.checkBody('password','password is required').notEmpty();
        req.checkBody('password','Password Must Not Be Less Than 5').isLength({min:5});
        req.check('password','Password Must Contain Numbers and letter').matches(/^(?=.*\d)(?=.*[a-z])[0-9a-zA-Z]{5,}$/,"i");

        var errors = req.validationErrors();
        
        if(errors){
            var messages = [];
            errors.forEach((error) => {
                messages.push(error.msg);
            });

            req.flash('error',messages);
            res.redirect('/signup');
        }else{
            return next();
        }
}

function validLogin(req,res,next){
    req.checkBody('email','Email is required').notEmpty();
    req.checkBody('email','Email is Invalid').isEmail();
    req.checkBody('password','password is required').notEmpty();
    req.checkBody('password','Password Must Not Be Less Than 5').isLength({min:5});
    req.check('password','Password Must Contain Numbers and letters').matches(/^(?=.*\d)(?=.*[a-z])[0-9a-zA-Z]{5,}$/,"i");

    var errors = req.validationErrors();
    
    if(errors){
        var messages = [];
        errors.forEach((error) => {
            messages.push(error.msg);
        });

        req.flash('error',messages);
        res.redirect('/login');
    }else{
        return next();
    }
}

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        next()
    }else{
        res.redirect("/");
    }
}
