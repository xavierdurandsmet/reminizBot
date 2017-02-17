const request = require('request')
const Bing = require('node-bing-api')({ accKey: "00c98764dd9d440ba8d15bf161787d0e" })
const wikipedia = require("node-wikipedia")

const FACEBOOK_BASE_URL = "https://graph.facebook.com/v2.6/me/";
const THREAD_SETTINGS_URL = FACEBOOK_BASE_URL + "thread_settings";
const MESSAGES_URL = FACEBOOK_BASE_URL + "messages";

module.exports = {
	sendDefaultMessage: sendDefaultMessage,
    sendWhoIsLive: sendWhoIsLive
}

const token = process.env.PAGE_ACCESS_TOKEN

function sendDefaultMessage(sender) {

    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "list",
                "elements": [
                    {
                        "title": "CNN",
                        "image_url": "https://pbs.twimg.com/profile_images/508960761826131968/LnvhR8ED.png",
                        "subtitle": "See who's currently talking on CNN",
                        "default_action": {
                            "type": "web_url",
                            "url": "https://c65e40c2.ngrok.io",
                            "messenger_extensions": true,
                            "webview_height_ratio": "tall",
                            "fallback_url": "https://c65e40c2.ngrok.io"
                        },
                        "buttons": [
                            {
                                "title": "View Now!",
                                "type": "postback",
                                "payload": "Natalie Portman", // hardcoded to get an actress result. To be changed to a call to the Reminiz API
                                "webview_height_ratio": "tall"
                            }
                        ]
                    },
                    {
                        "title": "BBC",
                        "image_url": "https://pbs.twimg.com/profile_images/662708106/bbc.png",
                        "subtitle": "See who's currently talking on BBC",
                        "default_action": {
                            "type": "web_url",
                            "url": "https://c65e40c2.ngrok.io",
                            "messenger_extensions": true,
                            "webview_height_ratio": "tall",
                            "fallback_url": "https://c65e40c2.ngrok.io"
                        },
                        "buttons": [
                            {
                                "title": "View Now!",
                                "type": "web_url",
                                "url": "https://c65e40c2.ngrok.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://c65e40c2.ngrok.io"
                            }
                        ]
                    }
                ]
            }
        }
    }


    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}


function sendWhoIsLive(sender, text) {

    Bing.images(text, {
        top: 15,   // Number of results (max 50)
        skip: 3    // Skip first 3 result
    }, function (error, res, body) {

        console.log("body", body.value)

        let messageData = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: text,
                            image_url: body.value[0].contentUrl,
                            subtitle: "She's a super famous actress", // hardcoded, to replace with wikipedia info
                            default_action: {
                                type: "web_url",
                                url: "https://c65e40c2.ngrok.io", // link to specific wikipedia page
                                messenger_extensions: true,
                                webview_height_ratio: "tall",
                                fallback_url: "https://c65e40c2.ngrok.io"
                            },
                            buttons: [
                                {
                                    title: "View Now!",
                                    type: "postback",
                                    payload: "DEVELOPER_DEFINED_PAYLOAD",
                                    webview_height_ratio: "tall"
                                }
                            ]
                        }
                    ]
                }
            }
        }


        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: { access_token: token },
            method: 'POST',
            json: {
                recipient: { id: sender },
                message: messageData,
            }
        }, function (error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
        })
    });
}


