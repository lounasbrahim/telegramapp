const Member = require("../models/Member");
var csrf = require("csurf");
var csrfProtection = csrf();
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const { Airgram, Auth, prompt, toObject } = require("airgram");
const axios = require("axios");
require("dotenv").config();

const airgram = new Airgram({
  apiId: process.env.APP_ID,
  apiHash: process.env.APP_HASH,
  command: process.env.TDLIB_COMMAND,
  logVerbosityLevel: 1,
});
airgram.use(
  new Auth({
    phoneNumber: prompt("Veuillez entrer votre numero de télephone:\n"),
    code: () => prompt("Veuillez entrer le code secret:\n"),
  })
);

async function searchPublicChat(username) {
  let reponse = await airgram.api.searchPublicChat({
    username: username,
  });
  console.log("[response_get_searchPublicChat] ", reponse.response);
  return reponse.response;
}

async function getChats() {
  const me = toObject(await airgram.api.getMe());
  console.log("[Me] ", me);

  const { response: chats } = await airgram.api.getChats({
    limit: 100,
    offsetChatId: 0,
    offsetOrder: "9223372036854775807",
  });
  console.log("[My chats] ", chats);
}

async function sendMessage(user_id, message) {
  const response = await airgram.api.sendMessage({
    chatId: user_id,
    replyToMessageId: 0,
    disableNotification: false,
    fromBackground: false,
    inputMessageContent: {
      _: "inputMessageText",
      text: {
        text: message,
      },
    },
  });
  console.log("[response_msg] ", response);
  return response.response;
}

async function getChatHistoryLastMessage(chat_id) {
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
      i++;
    } else {
      break;
    }
  }
  //await writeJsonFile("chat_history.json", results);
  return results;
}

function addDays(date, days) {
  date.setDate(date.getDate() + days);
  return date;
}

exports.messagesPage = async (req, res, next) => {
  let members = await Member.findAll();
  members = members.map((el) => el.dataValues);
  res.render("messages", { csrfToken: req.csrfToken(), members: members });
};

exports.envoieMessage = async (req, res, next) => {
  let username = req.body.username;
  let message = req.body.message;
  await getChats();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  let user = await searchPublicChat(username);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  let response = await sendMessage(user.id, message);
  if (response["_"].trim() == "error") {
    res.send(400, { error: true, response: response });
  } else {
    res.send(200, { error: false, response: response });
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

exports.scrapMessagePage = async (req, res, next) => {
  res.render("scrap_messages", {
    csrfToken: req.csrfToken(),
  });
};

exports.scrapMessages = async (req, res, next) => {
  let username = req.body.username;
  let symbol_crypto = req.body.symbol_crypto;
  let date_debut = new Date(req.body.date_debut);
  let date_fin = new Date(req.body.date_fin);
  let dateMin_timestamp = Math.round(date_debut.getTime() / 1000);
  let dateMax_timestamp = Math.round(date_fin.getTime() / 1000);
  let pinned_checkbox = req.body.pinned_checkbox;
  let frowarded_checkbox = req.body.frowarded_checkbox;
  let chat = await searchPublicChat(username);
  let chat_id = chat.id;
  let chat_title = chat.title;
  console.log("pinned_checkbox: ", pinned_checkbox);

  let crypto_id = await getCryptoId(symbol_crypto);
  let cours = await getCurrrentPrice(crypto_id, date_debut);
  console.log(cours);
  console.log(date_debut.getFullYear());

  console.log("symbol_crypto: ", symbol_crypto);
  console.log("crypto_id: ", crypto_id);
  console.log("cours: ", cours);

  console.log("scrapper les messages du groupe: ", chat_title);

  console.log("date debut: ", date_debut);
  console.log("date fin: ", date_fin);

  //let Difference_In_Time = date_fin.getTime() - date_debut.getTime();
  //let Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
  //console.log("Difference_In_Days: ", Difference_In_Days);
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

  await new Promise((resolve) => setTimeout(resolve, 1000));

  let messages = await searchMessages(dateMin_timestamp, dateMax_timestamp);

  console.log(messages);

  messages = messages.filter((el) => el.chatId == chat_id);

  if (pinned_checkbox == "true") {
    messages = messages.filter((el) => el.isPinned == true);
  }

  if (frowarded_checkbox == "true") {
    messages = messages.filter((el) => el.forwardInfo);
  }

  let csvPath = `${__dirname}/../../public/files-csv/messages.csv`;
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: "id", title: "Id" },
      { id: "text", title: "Text" },
      { id: "date", title: "date" },
      { id: "pinned", title: "pinned" },
      { id: "forwarded", title: "forwarded" },
    ],
  });

  let final_results = messages.map((el) => {
    let date = new Date(el.date * 1000);
    date = date.toLocaleDateString() + " " + date.toLocaleTimeString();
    return {
      id: el.id,
      text: el.content.text ? el.content.text.text : "Pas de Text (Image)",
      pinned: el.isPinned.toString(),
      forwarded: el.forwardInfo == undefined ? "false" : "true",
      date: date,
      cours: cours,
    };
  });

  // console.log(
  //   "message: ",
  //   messages.map((el) => {
  //     return {
  //       text: {
  //         text: el.content.text.text,
  //         entities: JSON.stringify(el.content.text.entities),
  //       },
  //       webPage: {
  //         text: JSON.stringify(el.content.webPage),
  //       },
  //     };
  //   })
  // );

  //console.log("final_results: ", final_results);

  csvWriter
    .writeRecords(final_results)
    .then(() => console.log("The CSV file was written successfully"));

  let path_arr = csvPath.split("/");
  let file = path_arr.pop();
  let link = `/files-csv/${file}`;

  res.status(200).send({
    messages: final_results,
    date: date_debut,
    link: link,
    cours: cours,
  });
};

/*
let request_post = $.post("scrap_messages", {
  _csrf: csrf,
  username: username,
  date_debut: date_debut,
  date_fin: date_fin,
  pinned_checkbox: pinned_checkbox,
});
request_post.done(function (res) {
  console.log("link: ", res.link);
  console.log("reponse: ", res);
  location.replace(res.link);
});
request_post.fail(function (xhr, status, error) {
  console.log("erreur: ", error);
});
*/
