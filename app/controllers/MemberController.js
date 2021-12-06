const Member = require("../models/Member");
var csrf = require("csurf");
var csrfProtection = csrf();

exports.membersPage = async(req, res, next) => {
    //<let members = await Member.findOne();
    //console.log("members: ", members);
    res.render("members"); //{ members: members });
};