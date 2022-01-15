const Member = require("../models/Member");
const Group = require("../models/Group");
const User = require("../models/User");
var csrf = require("csurf");
var csrfProtection = csrf();
//const { Airgram, Auth, prompt, toObject } = require("airgram");
const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
require("dotenv").config();
const fs = require("fs");

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
  if (get_user == null)
    return { status: "error", error: err, response: get_user };
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

// let airgram
// (async () =>  {
//   console.log("user: ", user)

//   let app_id = parseInt(user.app_id)
//   let app_hash = user.app_hash.toString()
//   console.log("app_id : ", app_id)
//   console.log("app_hash: ", app_hash )

//   airgram = new Airgram({
//     apiId: user.app_id,
//     apiHash: user.app_hash,
//     command: process.env.TDLIB_COMMAND,
//     logVerbosityLevel: 1,
//   });
//   airgram.use(
//     new Auth({
//       phoneNumber: prompt("Veuillez entrer votre numero de télephone:\n"),
//       code: () => prompt("Veuillez entrer le code secret:\n"),
//     })
//   );

//
// })()

async function createGroup(name, a_propos, latitude, longitude, adresse) {
  let response = await initGramJs();
  if (response.status === "error") {
    return { status: "error", error: err, response: false };
  }
  let client = response.client;
  try {
    await client.connect();
    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title: name,
        about: a_propos,
        megagroup: true,
        forImport: false,
        geoPoint: new Api.InputGeoPoint({
          lat: latitude,
          long: longitude,
          accuracyRadius: 43,
        }),
        address: adresse,
      })
    );
    console.log("response_createGroup: ", result);
    return { status: "success", error: false, response: result };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, response: false };
  }
}

async function CheckAvaibleUsername(username) {
  let response = await initGramJs();
  if (response.status === "error") {
    return { status: "error", error: err, response: false };
  }
  let client = response.client;
  try {
    await client.connect();
    console.log("client_in_chechusername : ", client);
    let result = await client.invoke(
      new Api.account.CheckUsername({
        username: username,
      })
    );
    return { status: "success", error: false, response: result };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, repsonse: false };
  }
}

async function updateUsername(username, channel_id, access_hash) {
  let response = await initGramJs();
  if (response.status === "error") {
    return { status: "error", error: err, response: false };
  }
  let client = response.client;
  try {
    // let reponse = await api.setSupergroupUsername({
    //   supergroupId: channel_id,
    //   username: username
    // });
    // console.log("[response_get_updateUsername] ", reponse.response);
    //return reponse.response
    await client.connect();
    const result = await client.invoke(
      new Api.channels.UpdateUsername({
        channel: new Api.InputPeerChannel({
          channel_id: channel_id,
          access_hash: access_hash,
        }),
        username: username,
      })
    );
    console.log(result); // prints the result
    return result;
    // console.log(
    //   "input peer channel",
    //   new Api.InputPeerChannel({
    //     channel_id: channel_id,
    //     access_hash: access_hash,
    //   })
    // );

    // await client.connect();
    // let result = await client.invoke(
    //   new Api.account.UpdateUsername({
    //     channel: new Api.InputPeerChannel({
    //       channel_id: channel_id,
    //       access_hash: access_hash,
    //     }),
    //     username: username,
    //   })
    // );
    // console.log("response_updateUsername : ", result)
    // return {status: "success" , error : false , response : result };
    return { status: "error", error: "err", repsonse: false };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, repsonse: false };
  }
}

async function saveMyGroupInDB(id, username, name) {
  try {
    let group = Group.findOne({ where: { group_id: id } }).then((group) => {
      console.log("group: ", group);
      if (group == null) {
        const group = new Group({
          group_id: id,
          username: "@" + username,
          name: name,
          mon_groupe: true,
        });
        return group.save();
      } else {
        group.group_id = id;
        group.username = "@" + username;
        group.name = name;
        mon_groupe = true;
        return group.save();
      }
    });
    return { status: "success", error: false, response: group };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, repsonse: false };
  }
}
async function sendResponse(res, status, message, data) {
  if (status == "success") {
    res.status(200).send({
      status: "success",
      message: message,
      data: data,
    });
  } else {
    res.status(400).send({
      status: "error",
      message: message,
      data: data,
    });
  }
}

async function getGroupInfo(username) {
  let response = await initGramJs();
  if (response.status === "error") {
    return { status: "error", error: err, response: false };
  }
  let client = response.client;
  await client.connect();
  try {
    const response = await client.invoke(
      new Api.channels.GetChannels({
        id: [username],
      })
    );
    return { status: "success", error: false, response: response };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, repsonse: false };
  }
}

exports.getCreateGroupePage = async (req, res) => {
  res.render("ajoutGroup", { csrfToken: req.csrfToken() });
};

exports.checkUsername = async (req, res) => {
  let { username } = req.body;
  console.log("username : ", username);
  let response = await CheckAvaibleUsername(username);
  if (response.status == "error") {
    return await sendResponse(res, "error", "Username invalide", response);
  } else {
    return await sendResponse(res, "success", "Username valide", response);
  }
};

exports.getGroup = async (req, res) => {
  let { username } = req.body;
  let get_group = await getGroupInfo(username);
  console.log("get_group", get_group);
  if (get_group.status == "error") {
    return await sendResponse(
      res,
      "error",
      "ce group n'existe pas ou vous n'etes pas admin",
      get_group
    );
  } else {
    return await sendResponse(res, "success", "Group recupéré", get_group);
  }
};

async function writeJsonFile(path, json_data) {
  fs.writeFileSync(path, JSON.stringify(json_data), function (err, result) {
    if (err) {
      logger.error(
        `Erreur d'ecritutre du fichier script.json, l'erreur : ${err}`
      );
    }
  });
}

exports.createGroupe = async (req, res) => {
  let { name, username, a_propos, latitude, longitude, adresse } = req.body;

  let repsonse_createGroup = await createGroup(
    name,
    a_propos,
    parseFloat(latitude),
    parseFloat(longitude),
    adresse
  );
  if (repsonse_createGroup.status == "error") {
    return await sendResponse(
      res,
      "error",
      "Probléme lors de la création du Groupe",
      repsonse_createGroup
    );
  }
  console.log("repsonse_createGroup :", repsonse_createGroup);
  // await writeJsonFile(
  //   __dirname + "/../../public/groupe_response.json",
  //   repsonse_createGroup
  // );
  let channel_id = repsonse_createGroup.response.chats[0].id.value;
  let access_hash = repsonse_createGroup.response.chats[0].accessHash.value;

  let response_updateUsername = await updateUsername(
    username,
    channel_id,
    access_hash
  );
  console.log("response_updateUsername: ", response_updateUsername);
  // if (response_updateUsername.status == "error") {
  //   return await sendResponse(
  //     res,
  //     "error",
  //     "Probléme lors de la création/mise a jour du Username",
  //     response_updateUsername
  //   );
  // }

  // let response_saveMyGroupInDB = await saveMyGroupInDB(channel_id, username, name);
  // if (response_saveMyGroupInDB.status == "ferror") {
  //   return await sendResponse(res, "error", "Probléme d'enrigestrement dans la BD", response_saveMyGroupInDB)
  // }

  //return await sendResponse(res, "success", "Groupe crée avec succés", repsonse_createGroup)
};
