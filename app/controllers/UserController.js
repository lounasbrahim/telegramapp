const User = require("../models/User");
var csrf = require("csurf");
var csrfProtection = csrf();

exports.userPage = (req, res, next) => {
    User.findOne({ where: { id: 1 } })
        .then((user) => {
            res.render("user", {
                csrfToken: req.csrfToken(),
                user: user.dataValues,
            });
        })
        .catch((err) => console.log(err));
};

exports.user = (req, res, next) => {
    User.findOne({ where: { tel: req.body.numTel } })
        .then((user) => {
            console.log("user: ", user);
            if (!user) {
                // Item not found, create a new one
                const user = new User({
                    tel: req.body.numTel,
                    app_id: req.body.appId,
                    app_hash: req.body.appHash,
                });
                return user.save();
            } else {
                user.tel = req.body.numTel;
                user.app_id = req.body.appId;
                user.app_hash = req.body.appHash;
                return user.save();
            }
        })
        .catch((err) => console.log(err));
};