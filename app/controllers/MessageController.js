const Member = require("../models/Member");
const Group = require("../models/Group");
const User = require("../models/User");
var csrf = require("csurf");
var csrfProtection = csrf();
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();
const { Airgram, Auth, prompt, toObject } = require("airgram");
const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { _getEntityPair } = require("telegram/Utils");
const { convertToObject } = require("typescript");
const { getGroup } = require("./GroupController");

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
    return { status: "error", error: get_user, response: get_user.user };
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

async function initAirgramJs() {
  let get_user = await getConnctedUser();
  if (get_user == null)
    return { status: "error", error: err, response: get_user };
  let airgram = new Airgram({
    apiId: get_user.user.app_id,
    apiHash: get_user.user.app_hash,
    command: process.env.TDLIB_COMMAND,
    logVerbosityLevel: 1,
  });
  airgram.use(
    new Auth({
      phoneNumber: get_user.tel,
      code: () => prompt("Veuillez entrer le code secret:\n"),
    })
  );
  return airgram;
}

async function searchPublicChat(username) {
  let airgram = await initAirgramJs();
  if (airgram == null) {
    return { status: "error", error: err, response: false };
  }
  let reponse = await airgram.api.searchPublicChat({
    username: username,
  });
  console.log("[response_get_searchPublicChat] ", reponse.response);
  return reponse.response;
}

async function getChats() {
  let airgram = await initAirgramJs();
  if (airgram == null) {
    return { status: "error", error: err, response: false };
  }
  const me = toObject(await airgram.api.getMe());
  console.log("[Me] ", me);

  const { response: chats } = await airgram.api.getChats({
    limit: 100,
    offsetChatId: 0,
    offsetOrder: "9223372036854775807",
  });
  console.log("[My chats] ", chats);
}

async function sendMessage(username, message) {
  let getclient = await getClient();
  if (getclient.status === "error") {
    return { status: "error", error: getclient.error, response: false };
  }
  client = getclient.response;
  try {
    const response = await client.invoke(
      new Api.messages.SendMessage({
        peer: username,
        message: message,
        noWebpage: false,
      })
    );
    return { status: "success", error: false, response: response };
  } catch (err) {
    console.log(err);
    return { status: "error", error: err, response: false };
  }
  // let airgram = await initAirgramJs();
  // if (airgram == null) {
  //   return { status: "error", error: err, response: false };
  // }
  // const response = await airgram.api.sendMessage({
  //   chatId: user_id,
  //   replyToMessageId: 0,
  //   disableNotification: false,
  //   fromBackground: false,
  //   inputMessageContent: {
  //     _: "inputMessageText",
  //     text: {
  //       text: message,
  //     },
  //   },
  // });
}

async function getChatHistoryLastMessage(chat_id) {
  let airgram = await initAirgramJs();
  if (airgram == null) {
    return { status: "error", error: err, response: false };
  }
  let get_last_messsage = await airgram.api.getChatHistory({
    chatId: chat_id,
    fromMessageId: 0,
    offset: 0,
    limit: 100,
    onlyLocal: false,
  });
  console.log("[response_get_last_messsage] ", get_last_messsage);
  return get_last_messsage;
}

async function getChatHistory(chat_id) {
  response_all = [];
  console.log("recupérer le message_id du dernier message: ");
  let last_message = await getChatHistoryLastMessage(chat_id);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // premiere loop
  let fromMessageId = last_message.response.messages[0].id;
  let get_message_offset = await airgram.api.getChatHistory({
    chatId: chat_id,
    fromMessageId: fromMessageId,
    offset: -1,
    limit: 100,
    onlyLocal: false,
  });

  let messages = get_message_offset.response.messages;
  console.log("[response_get_last_messsage1] ", messages);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  //deuxiemme loop
  let index_dernier_msg = messages.length - 1;
  console.log("index_dernier_msg", index_dernier_msg);
  fromMessageId = messages[index_dernier_msg].id;
  get_message_offset = await airgram.api.getChatHistory({
    chatId: chat_id,
    fromMessageId: fromMessageId,
    offset: -1,
    limit: 100,
    onlyLocal: false,
  });
  messages = get_message_offset.response.messages;
  console.log("[response_get_message_offset] ", messages);
  await writeJsonFile("chat_history.json", messages);
}

async function searchMessages(dateMin, dateMax) {
  let i = 0;
  let index_dernier_msg = 0;
  let offsetDate = 0;
  let previousDate = 0;
  let results = [];
  while (true) {
    let response = await airgram.api.searchMessages({
      chatList: await airgram.api.chatListMain(),
      query: " ",
      offsetDate: offsetDate,
      offsetChatId: 0,
      offsetMessageId: 0,
      limit: 100,
      filter: await airgram.api.searchMessagesFilterEmpty(),
      minDate: dateMin,
      maxDate: dateMax,
    });
    let messages = response.response.messages;
    console.log("messages: ", messages);
    if (messages.length != 0) {
      index_dernier_msg = messages.length - 1;
      console.log("index_dernier_msg: ", index_dernier_msg);
      console.log("dernier message: ", messages[index_dernier_msg]);
      offsetDate = messages[index_dernier_msg].date;
      if (offsetDate == previousDate) {
        break;
      }
      results = [...results, ...messages];
      previousDate = messages[index_dernier_msg].date;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      i++;
    } else {
      break;
    }
  }
  //await writeJsonFile("chat_history.json", results);
  return results;
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

function addDays(date, days) {
  ta;
  date.setDate(date.getDate() + days);
  return date;
}

exports.messagesPage = async (req, res, next) => {
  let groups = await Group.findAll();
  groups = groups.map((el) => el.dataValues);

  let all_members = [];
  if (groups.length == null) {
    return res.render("messages", {
      csrfToken: req.csrfToken(),
      members: all_members,
      groups: groups,
    });
  }
  for (let i = 0; i < groups.length; i++) {
    console.log("groups[i].id : ", groups[i].id);
    members = await Member.findAll({ where: { group_id: groups[i].id } });
    members = members.map((el) => {
      el.dataValues.group_name = groups[i].name;
      el.dataValues.group_username = groups[i].username;
      return el;
    });
    console.log(
      `members du group ${groups[i].name} avec l'id ${groups[i].name}  : `,
      members
    );
    all_members = [...all_members, ...members];
  }
  all_members = all_members.map((el) => el.dataValues);
  console.log("groups: ", groups);

  return res.render("messages", {
    csrfToken: req.csrfToken(),
    members: all_members,
    groups: groups,
  });
};

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

exports.envoieMessage = async (req, res, next) => {
  let username = req.body.username;
  let message = req.body.message;
  //await getChats();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  //let user = await searchPublicChat(username);
  //await new Promise((resolve) => setTimeout(resolve, 1000));
  let response = await sendMessage(username, message);
  console.log("response_sendMessage: ", response);
  if (response.status == "error") {
    let msg = `message envoyé a ${username}`;
    if (response.error.user == null) {
      msg = `message non envoyé a ${username}, veuilliez verifier que vous étes bien connecté`;
    }
    await sendResponse(res, "error", msg, response);
  } else {
    await sendResponse(
      res,
      "success",
      `message envoyé a ${username}`,
      response
    );
  }
  return response;
};

async function getCryptoId(symbol_crypto) {
  let crypto_list_response = await axios.get(
    "https://api.coingecko.com/api/v3/coins/list?include_platform=false"
  );
  let crypto = crypto_list_response.data.filter(
    (el) => el.symbol == symbol_crypto.trim()
  );
  if (crypto.length == 0) {
    console.log("crypto non trouvé");
  }
  let crypto_id = crypto[0].id;
  return crypto_id;
}
async function getCurrrentPrice(cryptoId, date) {
  let jour = date.getDate();
  let mois = date.getMonth();
  let annee = date.getFullYear();
  let date_api = `${jour}-${mois}-${annee}`;
  try {
    let crypto_currentprice_response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${cryptoId}/history?date=${date_api}`
    );
    return crypto_currentprice_response.data.market_data.current_price.usd;
  } catch (err) {
    console.log(err);
  }
}

async function getNombrestokens() {
  try {
    let response = await axios.get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest`,
      {
        params: {
          start: "1",
          limit: "5000",
          convert: "USD",
        },
        headers: {
          "X-CMC_PRO_API_KEY": "ccfe48c0-92ab-4e88-87de-d298e989b3c4",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (err) {
    console.log(err);
  }
}

async function getEntity(entity) {
  let getclient = await getClient();
  if (getclient.status === "error") {
    return { status: "error", error: getclient.error, response: false };
  }
  client = getclient.response; // let response = await client.getEntity(
  //   await client.InputPeerChannel({
  //     channelId: entity,
  //     accessHash: 0,
  //   })
  // );
  let response = await client.getEntity(
    await client.getEntity(
      new Api.InputPeerChannel({
        channelId: entity,
        access_hash: 0,
      })
    )
  );
  console.log("response: ", response);
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

async function getMessageLinkAirgram(
  chat_id,
  message_id,
  for_album = false,
  forComment = false
) {
  let reponse = await airgram.api.getMessageLink({
    chatId: chat_id,
    messageId: message_id,
    forAlbum: for_album,
    forComment: forComment,
  });
  console.log("[response_getMessageLinkAirgram] ", reponse.response);
  return reponse.response.link;
}

async function getMessageLinkRequest(username, msg_id) {
  try {
    const response = await client.invoke(
      new Api.channels.ExportMessageLink({
        channel: username,
        id: msg_id,
        thread: true,
      })
    );
    console.log(response);
    return response;
  } catch (err) {
    console.log(err);
  }
}

exports.scrapMessagePage = async (req, res, next) => {
  res.render("scrap_messages", {
    csrfToken: req.csrfToken(),
  });
};

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
    return { status: "success", error: false, response: result.chats[0] };
  } catch (err) {
    console.log("err : ", err);
    return { status: "error", error: err, response: false };
  }
}

exports.getGroup = async (req, res) => {
  let username = req.body.username;
  let response = await getGroupFromApi(username);
  console.log("response: ", response);
  if (response.status == "success") {
    await sendResponse(res, "success", "Username du groupe Valide", response);
  } else {
    await sendResponse(res, "error", "Group non trouvé", response);
  }
};

async function getMessageHistoryRequest(username, offset_date) {
  try {
    const result = await client.invoke(
      new Api.messages.GetHistory({
        peer: username,
        offsetId: 0,
        offsetDate: offset_date,
        addOffset: 0,
        limit: 100,
        maxId: 0,
        minId: 0,
        hash: 0,
      })
    );
    console.log("messages: ", result.messages);
    return { status: "success", error: false, response: result };
  } catch (err) {
    console.log("err : ", err);
    return { status: "error", error: err, response: false };
  }
}

async function getMessageHistory(username, offset_date, date_min) {
  let index_dernier_msg = 0;
  let previousDate = offset_date;
  let results = [];
  while (true) {
    let response_getMessages = await getMessageHistoryRequest(
      username,
      offset_date
    );
    let messages = response_getMessages.response.messages;
    if (messages.length == 0) return results;
    index_dernier_msg = messages.length - 1;
    console.log("index_dernier_msg: ", index_dernier_msg);
    console.log("dernier message: ", messages[index_dernier_msg]);
    offset_date = messages[index_dernier_msg].date;
    date_min;
    results = [...results, ...messages];
    if (offset_date == previousDate || date_min >= previousDate) return results;
    previousDate = offset_date;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return results;
}

async function getMessagesLinks(messages, username) {
  let messages_arr = [];

  for (let i = 0; i < messages.length; i++) {
    let message_id = parseInt(messages[i].id);
    console.log("message: ", messages[i]);
    console.log("message_id: ", message_id);

    let message_link = await getMessageLinkRequest(username, message_id);
    //let message_link = await getMessageLinkAirgram(chat_id, message_id);
    console.log("message_link: ", message_link);
    messages[i].link = message_link;
    console.log("message: ", messages[i]);
    messages_arr.push(messages[i]);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return messages_arr;
}

exports.scrapMessages = async (req, res) => {
  let {
    username,
    symbol_crypto,
    date_debut,
    date_fin,
    pinned_checkbox,
    frowarded_checkbox,
  } = req.body;
  date_debut = new Date(req.body.date_debut);
  date_fin = new Date(req.body.date_fin);
  let dateMin_timestamp = Math.round(date_debut.getTime() / 1000);
  let dateMax_timestamp = Math.round(date_fin.getTime() / 1000);

  /*
  let chat = await searchPublicChat(username);
  let chat_id = chat.id;
  let chat_title = chat.title;
  */

  let nombres_tokens = await getNombrestokens();

  let crypto_id = await getCryptoId(symbol_crypto);
  let cours = await getCurrrentPrice(crypto_id, date_debut);

  // let Difference_In_Time = date_fin.getTime() - date_debut.getTime();
  // let Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
  // console.log("Difference_In_Days: ", Difference_In_Days);
  // if (Difference_In_Days > 2) {
  //   for (let i = 0; i < Difference_In_Days; i++) {
  //     var isSameDay =
  //       dateToCheck.getDate() === actualDate.getDate() &&
  //       dateToCheck.getMonth() === actualDate.getMonth() &&
  //       dateToCheck.getFullYear() === actualDate.getFullYear();
  //     console.log("Same day : ", isSameDay);
  //     await new Promise((resolve) => setTimeout(resolve, 1000));
  //   }
  // } else {
  //   console.log("no");
  // }

  // await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("getCryptoId");

  //let messages = await searchMessages(dateMin_timestamp, dateMax_timestamp);
  let get_messageHistory = await getMessageHistory(
    username,
    dateMax_timestamp,
    dateMin_timestamp
  );

  if (get_messageHistory.status === "error") {
    return await sendResponse(
      res,
      "success",
      "Erreur lors de la recupération des messages",
      get_messageHistory
    );
  }

  let messages = get_messageHistory;

  //await writeJsonFile(__dirname + "/../../public/messages.json", messages);

  console.log("messages: ", messages);

  // messages = [messages[0], messages[1], messages[2]];

  //messages = messages.response.filter((el) => el.peerId.channelId == chat_id);

  console.log("messages.response", messages);

  messages = messages.filter((el) => el.date >= dateMin_timestamp);

  console.log("pinned_checkbox: ", pinned_checkbox);

  if (pinned_checkbox) {
    console.log("pinned exectued");
    messages = messages.filter((el) => el.pinned == true);
  }

  if (frowarded_checkbox) {
    console.log("fwdFrom exectued");
    messages = messages.filter((el) => el.fwdFrom != null);
  }

  let messages_arr = await getMessagesLinks(messages, username);
  console.log("messages_arr: ", messages_arr);

  let csvPath = `${__dirname}/../../public/files-csv/messages.csv`;
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: "id", title: "id" },
      { id: "text", title: "text" },
      { id: "date", title: "date" },
      { id: "pinned", title: "pinned" },
      { id: "forwarded", title: "forwarded" },
      { id: "lien", title: "lien" },
    ],
  });

  let final_results = messages.map((el) => {
    let date = new Date(el.date * 1000);
    date = date.toLocaleDateString() + " " + date.toLocaleTimeString();
    return {
      id: el.id,
      text:
        el.message != null || el.message != ""
          ? el.message
          : "Pas de Text (Image ou autre format)",
      pinned: el.pinned != null ? el.pinned.toString() : "",
      forwarded: el.fwdFrom == null ? "false" : "true",
      date: date,
      cours: cours,
      lien: el.link.link,
    };
  });

  csvWriter
    .writeRecords(final_results)
    .then(() => console.log("The CSV file was written successfully"));

  let path_arr = csvPath.split("/");
  let file = path_arr.pop();
  let link = `/files-csv/${file}`;

  return await sendResponse(res, "success", "Messges recupérés", {
    messages: final_results,
    date: date_debut,
    link: link,
    cours: cours,
    nombres_tokens: nombres_tokens,
  });
};
