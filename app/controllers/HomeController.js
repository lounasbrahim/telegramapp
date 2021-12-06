//if (res.locals.isAuthenticated) {
//} else {
//    res.redirect("/login");
//}

exports.homePage = (req, res, next) => {
    res.render("home", { layout: "home_layout.hbs" });
};

exports.messagesPage = (req, res, next) => {
    res.render("messages");
};