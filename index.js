const path = require("path");
const env = require("dotenv");
const csrf = require("csurf");
const express = require("express");
const fileUpload = require("express-fileupload");
const flash = require("express-flash");
const bodyParser = require("body-parser");
const session = require("express-session");
const expressHbs = require("express-handlebars");
const SequelizeStore = require("connect-session-sequelize")(session.Store); // initalize sequelize with session store
const Group = require("./app/models/Group");

const app = express();
const csrfProtection = csrf();
const router = express.Router();

const webRoutes = require("./routes/web");
const sequelize = require("./config/database");
const errorController = require("./app/controllers/ErrorController");

env.config();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: { maxAge: 1209600000 },
    store: new SequelizeStore({
      db: sequelize,
      table: "sessions",
    }),
  })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.engine(
  "hbs",
  expressHbs({
    layoutsDir: "views/layouts/",
    defaultLayout: "home_layout",
    extname: "hbs",
  })
);
app.set("view engine", "hbs");
app.set("views", "views");

app.use(webRoutes);
app.use(errorController.pageNotFound);

app.use(function (req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

sequelize
  .sync()
  .then(() => {
    app.listen(process.env.PORT);
  })
  .catch((err) => {
    console.log(err);
  });
