var Company = require('../models/company')
var async = require('async')

module.exports = (app)=>{
    app.get('/review/:id',isLoggedIn,(req,res)=>{
        var message = req.flash('success'); 
        Company.findOne({'_id':req.params.id},(err,data)=>{
            res.render('company/review',{title:'Company Review',user:req.user,data:data,msg:message,hasMsg:message.length>0});
    })
    });

    app.post('/review/:id',(req,res)=>{
        async.waterfall([
            //just in case
          /*  function(callback){
                Company.findOne({'_id':req.params.id},(err,result)=>{
                    callback(err,result);
                });
            },*/
                function(callback){
                    Company.update({
                        $push:{companyRating:{
                            _id:req.user._id,
                            companyName:req.body.sender,
                            userFullName:req.user.fullName,
                            userRole:req.user.role,
                            companyImage:req.user.company.image,
                            userRating:req.body.clickedValue,
                            userReview:req.body.review,
                        },
                            ratingNumber:req.body.clickedValue,
                        },
                        $inc:{ratingSum:req.body.clickedValue}
                    },(err)=>{
                        req.flash('success','Your review has been added');
                        res.redirect('/review/'+req.params.id);
                    }
                    )
                }
        ])
    })
  
}
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        next()
    }else{
        res.redirect("/");
    }
  }