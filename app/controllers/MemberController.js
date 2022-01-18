const Member = require("../models/Member");
const Group = require("../models/Group");
const User = require("../models/User");
var csrf = require("csurf");
var csrfProtection = csrf();
const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input"); // npm i input
require("dotenv").config();
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const csv = require("csvtojson");

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

async function initGramJs(user) {
  try {
    client = new TelegramClient(
      user.session_string,
      user.app_id,
      user.app_hash,
      {
        connectionRetries: 5,
      }
    );
    return { status: "success", error: false, client: client };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, response: false };
  }
}

async function getClient() {
  let get_user = await getConnctedUser();
  if (get_user.user == null)
    return { status: "error", error: err, response: get_user.user };
  if (client == null) {
    let init_client = await initGramJs(get_user.user);
    client = init_client.client;
    await client.connect();
    return { status: "success", error: false, response: client };
  }
  if (client.apiId != get_user.app_id) {
    let init_client = await initGramJs(get_user.user);
    client = init_client.client;
    await client.connect();
    return { status: "success", error: false, response: client };
  }
  console.log("client: ", init_client.client);
}

async function getParticipants(username, offset) {
  let getclient = await getClient();
  if (getclient.status === "error") {
    return { status: "error", error: getclient.error, response: false };
  }
  client = getclient.response;
  console.log("client: ", client);
  try {
    const result = await client.invoke(
      new Api.channels.GetParticipants({
        channel: username.toString(),
        filter: new Api.ChannelParticipantsRecent({}),
        offset: offset,
        limit: 100,
        hash: 0,
      })
    );
    console.log("result get getParticipants: ", result);
    return result;
  } catch (err) {
    console.log(err);
    return err;
  }
}

// async function getSupergroupMembers(supergroupId) {
//   let i = 0;
//   members = [];
//   let offset = 0;
//   while (true) {
//     let reponse = await airgram.api.getSupergroupMembers({
//       supergroupId: supergroupId,
//       offset: offset,
//       limit: 200,
//     });

//     console.log(
//       "[response_get_getSupergroupMembers] ",
//       reponse.response.members
//     );
//     console.log("offset: ", offset);

//     if (
//       reponse.response.members == undefined ||
//       reponse.response.members.length == 0
//     ) {
//       break;
//     }
//     members.push(reponse.response.members);
//     offset += 200;
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     i++;
//   }
//   return members;
// }

async function searchPublicChat(username) {
  let getclient = await getClient();
  if (getclient.status === "error") {
    return { status: "error", error: getclient.error, response: false };
  }
  client = getclient.response;
  let reponse = await airgram.api.searchPublicChat({
    username: username,
  });
  console.log("[response_get_searchPublicChat] ", reponse.response);
  return reponse.response;
}

async function addMembers(memmbers_arr, group_id) {
  console.log("memmbers_arr", memmbers_arr);
  let group_db = await Group.findOne({
    raw: true,
    where: { group_id: group_id },
  });
  console.log("group_db: ", group_db);

  let members = memmbers_arr.map((el) => addMemberToDb(el, group_db));
  return Promise.all(members);
}

async function addMemberToDb(member_iteration, group_db) {
  try {
    console.log(member_iteration.id);
    let member = await Member.findOne({
      where: { member_id: member_iteration.id },
    });
    if (member == null) {
      // member not found, create a new one
      const member = new Member({
        member_id: member_iteration.id,
        username: member_iteration.username,
        name: member_iteration.name,
        group_id: group_db.id,
      });
      return member.save();
    } else {
      console.log("member existe déja : ", member);
      member.member_id = member_iteration.id;
      member.username = member_iteration.username;
      member.name = member_iteration.name;
      member.group_id = group_db.id;
      return member.save();
    }
  } catch (err) {
    console.log(err);
  }
}

exports.scrapMembersPage = async (req, res) => {
  res.render("scrap_members", {
    csrfToken: req.csrfToken(),
  });
};

async function getEntity(username) {
  let getclient = await getClient();
  if (getclient.status === "error") {
    return { status: "error", error: getclient.error, response: false };
  }
  client = getclient.response;
  const result = await client.getEntity(username);
  return result;
}

async function addGroup(group_id, group_username, group_title) {
  try {
    let group = await Group.findOne({ where: { group_id: group_id } });
    if (group == null) {
      const group = new Group({
        group_id: group_id,
        username: group_username,
        name: group_title,
        mon_groupe: false,
      });
      return group.save();
    } else {
      group.group_id = group_id;
      group.username = group_username;
      group.name = group_title;
      mon_groupe = false;
      return group.save();
    }
  } catch (err) {
    console.log(err);
  }
}

async function inviteMembers(channel_username, user_username) {
  let getclient = await getClient();
  if (getclient.status === "error") {
    return { status: "error", error: getclient.error, response: false };
  }
  console.log("getclient : ", getclient);
  client = getclient.response;
  console.log("client: ", client);
  try {
    //let response = new client.getEntity(user_username);
    const result = await client.invoke(
      new Api.channels.InviteToChannel({
        channel: channel_username,
        users: user_username,
      })
    );
    return { status: "success", error: false, response: result };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, repsonse: false };
  }
}

async function writeJsonFile(path, json_data) {
  fs.writeFileSync(path, JSON.stringify(json_data), function (err, result) {
    if (err) {
      logger.error(
        `Erreur d'ecritutre du fichier script.json, l'erreur : ${err}`
      );
    }
  });
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

function compareOnlineTimeStamp(el) {
  let status = "N/A";
  if (el.status == null) return;
  if (el.status.length === 0) return;
  if (el.status.wasOnline != null) {
    let online_timestamp = el.status.wasOnline;
    let date = new Date();
    let date_week_ago = date.setDate(date.getDate() - 7).valueOf();
    online_timestamp = new Date(online_timestamp * 1000).valueOf();
    return online_timestamp > date_week_ago;
  }
}

exports.membersPage = async (req, res, next) => {
  let members = await Member.findOne();
  res.render("members"); //{ members: members });
};

exports.scrapMembers = async (req, res, nex) => {
  let username = req.body.username;
  console.log("username: ", username);
  let offset = parseInt(req.body.offset);
  let response = await getParticipants(username, offset);
  let members = response.users;

  let final_results = members.map((el) => {
    let name = el.lastName != null ? el.firstName + el.lastName : el.firstName;
    let check_timestamp = compareOnlineTimeStamp(el);
    if (check_timestamp) return null;
    return {
      id: el.id,
      username: el.username,
      name: name,
      phone: el.phone,
    };
  });
  final_results = final_results.filter((el) => el != null);

  console.log("final_results: ", final_results);
  console.log("final_results length: ", final_results.length);

  res.status(200).send({
    members: final_results,
    members_length: final_results.length,
  });
};

async function convertCsvtoJson(path) {
  let converted_json = await csv().fromFile(path);
  return converted_json;
}

async function getGroupFromApi(username) {
  let getclient = await getClient();
  if (getclient.status === "error") {
    return { status: "error", error: getclient.error, response: false };
  }
  client = await getclient.response;
  try {
    const result = await client.invoke(
      new Api.channels.GetChannels({
        id: [username],
      })
    );
    return result.chats[0];
  } catch (err) {
    console.log("err : ", err);
    return { status: "error", error: err, response: false };
  }
}
async function getGroupFromDb(group_username) {
  let group = await Group.findOne({
    where: { username: `@${group_username}` },
  });
  return group;
}

async function createOrUpdateGroup(group_username) {
  var reposne_getGroup = await getGroupFromApi(group_username);
  if (reposne_getGroup.status == "error") {
    return { status: "error", error: reposne_getGroup, response: false };
  } else if (reposne_getGroup.length == 0) {
    return { status: "error", error: reposne_getGroup, response: false };
  } else {
    let group = await getGroupFromDb(group_username);
    console.log("group: ", group);
    if (group == null) {
      let group = new Group({
        group_id: reposne_getGroup.id.value,
        username: "@" + reposne_getGroup.username,
        name: reposne_getGroup.title,
        mon_groupe: false,
      });
      return group.save();
    } else {
      group.group_id = reposne_getGroup.id.value;
      group.username = "@" + reposne_getGroup.username;
      group.name = reposne_getGroup.title;
      group.mon_groupe = false;
      return group.save();
    }
  }
}

async function getMemberFromDb(member_id) {
  let member = await Member.findOne({
    raw: true,
    where: { member_id: member_id },
  });
  return member;
}

async function createOrUpdateMemebers(
  member_id,
  member_username,
  member_name,
  group_id
) {
  let member = await getMemberFromDb(member_id);
  if (member == null) {
    let member = new Member({
      member_id: member_id,
      username: member_username,
      name: member_name,
      group_id: group_id,
    });
    member.save();
  }
  return member;
}

exports.importMemebersFromCsv = async (req, res) => {
  let csvFile = req.files.csvFile;
  let file_name = "members";
  let upload_path = `${__dirname}/../../public/upload/${file_name}.csv`;

  if (!req.files || Object.keys(req.files).length == 0) {
    return res
      .status(400)
      .send({ status: "failure", message: "le fichier n'est pas uploadé" });
  }

  await csvFile.mv(upload_path, function (err) {
    if (err) return res.status(500).send(err);
  });

  let converted_json = await convertCsvtoJson(upload_path);

  for (i = 0; i < converted_json.length; i++) {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    let {
      Id: member_id,
      username: member_username,
      name: member_name,
      group: group_username,
      phone: memeber_phone,
    } = converted_json[i];
    group_username = group_username.replace("@", "");
    let response_createOrUpdateGroup = await createOrUpdateGroup(
      group_username
    );
    if (response_createOrUpdateGroup.status == "error") {
      return await sendResponse(
        res,
        "error",
        "il y'a une erreur dans le fichier csv",
        ""
      );
    }
    let group_db = await getGroupFromDb(group_username);
    let group_id = group_db.dataValues.id;
    console.log("group_id: ", group_id);
    let response_createOrUpdateMembers = await createOrUpdateMemebers(
      member_id,
      member_username,
      member_name,
      group_id
    );
    console.log(
      "response_createOrUpdateMembers: ",
      response_createOrUpdateMembers
    );
  }
  return await sendResponse(res, "success", "Membres importés avec succés", "");
};

exports.importScrapedMembers = async (req, res, next) => {
  let members = JSON.parse(req.body.all_members.toString());
  let memmbers_arr = members.filter((el) => el.username != null);
  let group_username = req.body.group_username;
  let group_api = await getEntity(group_username);
  console.log("group_api", group_api);
  let group_id = group_api.id.value;
  group_id = parseInt(group_id.toString().replace("n", ""));
  let group_title = group_api.title;
  console.log(group_id, group_username, group_title);

  await addGroup(group_id, group_username, group_title);

  await addMembers(memmbers_arr, group_id);

  res.status(200).send({ message: "success" });
};

exports.getMembersByGroup = async (req, res, next) => {
  let group_selected = req.body.group_selected;
  let group;
  let members;

  if (group_selected == "tous") {
    group = await Group.findAll();
    let all_members = [];

    for (let i = 0; i < group.length; i++) {
      members = await Member.findAll({ where: { group_id: group[i].id } });
      members = members.map((el) => {
        el.dataValues.group_name = group[i].name;
        el.dataValues.group_username = group[i].username;
        return el;
      });
      console.log(
        `members du group ${group[i].name} avec l'id ${group[i].name}  : `,
        members
      );
      all_members = [...all_members, ...members];
    }
    members = all_members;
  } else {
    group = await Group.findAll({ where: { username: group_selected } });
    members = await Member.findAll({
      where: { group_id: group[0].dataValues.id },
    });
  }
  console.log("members: ", members);
  console.log("group: ", group);

  res.status(200).send({
    groupe: group,
    members: members,
  });
};

exports.ajoutMembersPage = async (req, res, next) => {
  let mes_groupes = await Group.findAll({
    raw: true,
    where: { mon_groupe: 1 },
  });
  let members = await Member.findAll({ raw: true });
  for (let i = 0; i < members.length; i++) {
    let group = await Group.findOne({
      raw: true,
      where: {
        id: members[i].group_id,
      },
    });
    let group_name = group.name;
    members[i].group_name = group_name;
  }
  res.render("ajout_members", {
    csrfToken: req.csrfToken(),
    mes_groupes: mes_groupes,
    members: members,
  });
};

exports.ajoutMembers = async (req, res, next) => {
  let channel_username = req.body.channel_username.toString().replace("@", "");
  let user_username = [req.body.user_username];

  console.log("channel_username: ", channel_username);
  console.log("user_username: ", user_username);

  let invite_members = await inviteMembers(channel_username, user_username); //["@Yanis9494"]
  console.log("invite_members: ", invite_members);
  if (invite_members.status == "error") {
    await sendResponse(res, "error", "invitation non envoyé", invite_members);
  } else {
    await sendResponse(res, "success", "invitation envoyé", invite_members);
  }
};

exports.getCsvData = async (req, res) => {
  let all_members = JSON.parse(req.body.all_members.toString());
  let group_username = req.body.group_username;

  console.log("all_members: ", all_members);

  let result = all_members.map((el) => {
    return {
      id: el.id,
      username: el.username,
      name: el.name,
      group: group_username,
      phone: el.phone,
    };
  });

  let csvPath = `${__dirname}/../../public/files-csv/members.csv`;
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: "id", title: "Id" },
      { id: "username", title: "username" },
      { id: "name", title: "name" },
      { id: "group", title: "group" },
      { id: "phone", title: "phone" },
    ],
  });

  csvWriter
    .writeRecords(result)
    .then(() => console.log("The CSV file was written successfully"));

  let path_arr = csvPath.split("/");
  let file = path_arr.pop();
  let link = `/files-csv/${file}`;

  res.status(200).send({
    status: "success",
    link: link,
  });
};
