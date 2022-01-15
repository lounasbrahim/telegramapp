const User = require("../models/User");
var csrf = require("csurf");
var csrfProtection = csrf();
const { Api, TelegramClient } = require("telegram");
const { StringSession, StoreSession } = require("telegram/sessions");
const input = require("input");
require("dotenv").config();
const appId = parseInt(process.env.APP_ID);
const apiHash = process.env.APP_HASH;

var client;

async function getConnctedUser() {
  try {
    let user = await User.findOne({ raw: true, where: { connected: 1 } });
    return { status: "success", error: false, user: user };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, user: false };
  }
}

async function initGramJs() {
  let get_user = await getConnctedUser();
  if (get_user.user == null)
    return { status: "error", error: get_user.user, response: false };
  console.log("getConnctedUser: ", get_user);
  try {
    client = new TelegramClient(
      get_user.user.session_string,
      get_user.user.app_id,
      get_user.user.app_hash,
      {
        connectionRetries: 5,
      }
    );
    console.log("refresh client lou: ", client);
    return { status: "success", error: false, client: client };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, response: false };
  }
}

async function sendResponse(res, status, message, data) {
  if (status == "success") {
    return res.status(200).send({
      status: "success",
      message: message,
      data: data,
    });
  } else {
    return res.status(400).send({
      status: "error",
      message: message,
      data: data,
    });
  }
}

async function logOut() {
  let response = await initGramJs();
  if (response.status === "error") {
    return { status: "error", error: err, response: false };
  }
  let client = response.client;
  try {
    await client.connect();
    const result = await client.invoke(new Api.auth.LogOut({}));
    return { status: "success", error: false, response: result };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, response: false };
  }
}

async function sendCode(tel, apiId, apiHash) {
  let response = await initGramJs();
  if (response.status === "error") {
    return { status: "error", error: response.error, response: false };
  }
  let client = response.client;
  try {
    await client.connect();
    // await logOut();
    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: tel,
        apiId: apiId,
        apiHash: apiHash,
        settings: new Api.CodeSettings({
          allowFlashcall: true,
          currentNumber: true,
          allowAppHash: true,
        }),
      })
    );
    return { status: "success", error: false, response: result };
  } catch (err) {
    return { status: "error", error: err, response: false };
  }
}

async function connectToClient(tel, session_string, app_id, app_hash) {
  try {
    const storeSession = new StoreSession(session_string);
    let client = new TelegramClient(
      storeSession,
      parseInt(app_id),
      app_hash.toString(),
      {
        connectionRetries: 5,
      }
    );
    await client.start({
      phoneNumber: tel,
      password: async () => await input.text("password?"),
      phoneCode: async () => await input.text("Code ?"),
      onError: (err) => console.log(err),
    });
    return { status: "success", error: false, client: client };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, client: false };
  }
}

async function getAuthorizations() {
  const result = await client.invoke(new Api.account.GetAuthorizations({}));
  console.log(result);
  return result;
}

async function signInRequest(tel, app_id, app_hash) {
  let session_string = `session_${app_id}`;
  let response_connect = await connectToClient(
    tel,
    session_string,
    app_id,
    app_hash
  );
  console.log("response_connect : ", response_connect);
  if (response_connect.status === "error") {
    return { status: "error" };
  } else {
    User.update(
      { connected: 1, session_string: session_string },
      { where: { tel: tel } }
    );
    return { status: "success" };
  }
}

async function logOut() {
  let response = await initGramJs();
  if (response.status === "error") {
    return { status: "error", error: err, response: false };
  }
  let client = response.client;
  console.log("response_connect: ", response_gramInit);
  try {
    await client.connect();
    const result = await client.invoke(new Api.auth.LogOut({}));
    return { status: "success", error: false, response: result };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, repsonse: false };
  }
}

async function sendMe() {
  let response = await initGramJs();
  if (response.status === "error") {
    return { status: "error", error: err, response: false };
  }
  let client = response.client;
  try {
    await client.connect();
    let me = await client.sendMessage("me", { message: "Connected !" });
    return me;
  } catch (err) {
    console.log(err);
  }
}

exports.getUser = async (req, res) => {
  console.log(req.body);
  let { user_tel } = req.body;
  let user = await User.findOne({
    raw: true,
    where: {
      tel: user_tel,
    },
  });
  if (!user) return res.status(400).send({ message: "user non trouvé" });
  return res.status(200).send({ message: "success", user: user });
};

exports.deleteUser = async (req, res) => {
  let id = parseInt(req.params.id);
  let tel = req.params.tel;

  let user = await User.findOne({ where: { id: id, tel: tel } });
  try {
    await user.destroy();
  } catch (err) {
    console.log(err);
    next(err);
  }
  res
    .status(200)
    .send({ status: "success", message: "Utilisateur supprimé avec succés" });
};

exports.userPage = async (req, res) => {
  let users = await User.findAll({ raw: true });
  //let me = await sendMe();
  //console.log("me: ", me);
  res.render("user", {
    csrfToken: req.csrfToken(),
    users: users,
  });
};

async function saveUserInDB(data) {
  try {
    let user = await User.findOne({
      raw: true,
      where: { tel: data.numTel },
    });
    console.log("user: ", user);
    if (!user) {
      const user = new User({
        tel: data.numTel,
        app_id: data.appId,
        app_hash: data.appHash,
        nom: data.nom,
      });
      user.save();
    } else {
      user.tel = data.numTel;
      user.app_id = data.appId;
      user.app_hash = data.appHash;
      user.nom = data.nom;
      return user.save();
    }
  } catch (err) {
    console.log(err);
    return false;
  }
}

exports.userSave = async (req, res) => {
  let response = await saveUserInDB(req.body);
  if (response != false) {
    return await sendResponse(
      res,
      "success",
      "Utilisateur ajouté avec succés",
      response
    );
  }
  return await sendResponse(
    res,
    "error",
    "Erreur lors de l'ajout de cet utilisateur",
    response
  );
};

exports.userDisconnect = async (req, res) => {
  //let response = await logOut();
  //console.log("response_logOot", response);
  // if (response.status == "error") {
  //   console.log("response_singIn: ", response);
  //   return await sendResponse(
  //     res,
  //     "error",
  //     "La Déconnection a echoué",
  //     response
  //   );
  // } else {
  //   console.log("response_singIn: ", response);
  //   User.update({ connected: 0 }, { where: { connected: 1 } });
  //   return await sendResponse(res, "success", "Déconnecté", response);
  // }
  User.update({ connected: 0 }, { where: { connected: 1 } });
  return await sendResponse(res, "success", "Déconnecté", "");
};

exports.sendCode = async (req, res) => {
  console.log("connect : ", req.body);
  let tel = req.body.tel;
  let appId = parseInt(req.body.app_id);
  let appHash = req.body.app_hash;

  let response_sendCode = await sendCode(tel, appId, appHash);
  if (response_sendCode.status == "success") {
    return await sendResponse(
      res,
      "success",
      "Code Envoyé",
      response_sendCode.response.phoneCodeHash
    );
  } else {
    return await sendResponse(
      res,
      "error",
      "Erreur lors d'envoie du code",
      response_sendCode.error
    );
  }
  // res.status(200).send({
  //   text: "code envoyé",
  //   phoneCodeHash: response_sendCode.phoneCodeHash,
  // });
};

exports.singIn = async (req, res) => {
  let { numTel, app_id, app_hash } = req.body;
  let response_signIn = await signInRequest(numTel, app_id, app_hash);
  console.log("response_signIn : ", response_signIn);
  if (response_signIn.status == "error") {
    return await sendResponse(res, "error", "La Connection a echoué", "");
  } else {
    return await sendResponse(res, "success", "Connecté", "");
  }
};

exports.singInWithCode = async (req, res) => {
  let { tel, phone_hash, code } = req.body;
  let response_signIn = await signInWithCodeRequest(tel, phone_hash, code);
  console.log("response_signIn : ", response_signIn);
  if (response_signIn.status == "error") {
    return await sendResponse(res, "error", "La Connection a echoué", "");
  } else {
    return await sendResponse(res, "success", "Connecté", "");
  }
};

async function signInWithCodeRequest(tel, phone_hash, code) {
  try {
    const result = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: tel,
        phoneCodeHash: phone_hash,
        phoneCode: code,
      })
    );
    return { status: "success", error: false, response: result };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, repsonse: false };
  }
}

async function updateUser(tel) {
  let user = await User.findOne({ raw: true, where: { tel: tel } });
  let session_string = `session_${user.app_id}`;
  return User.update(
    { connected: 1, session_string: session_string },
    { where: { tel: tel, app_id: user.app_id } }
  );
}

exports.singInWithCode = async (req, res) => {
  let { tel, phone_hash, code } = req.body;
  let response_signIn = await signInWithCodeRequest(tel, phone_hash, code);
  if (response_signIn.status === "error") {
    return await sendResponse(res, "error", "La Connection a echoué", "");
  } else {
    await updateUser(tel);
    return await sendResponse(res, "success", "Connecté", "");
  }
};

// yanis
// tel : +213540679412
// appId : 13524919
// apphash: 66aac88d7b3e7deaffbb63b4dca45c9c

// braloun
// tel : +213698591913
// appId : 11415067
// apphash: e877b8dfd8a5312748a9d176cbe4c5f4
