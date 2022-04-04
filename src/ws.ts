import EventEmitter from "events";
import fetch from "node-fetch";
import { PNG, PNGWithMetadata } from "pngjs";
import { client as WebSocketClient } from "websocket"
import { Token } from "./data";
import { userAgent } from "./reddit";
import { sleep } from "./util";

export async function connectWs(token: Token, canvasId: string): Promise<EventEmitter> {
    const client = new WebSocketClient();
    const emitter = new EventEmitter();
    client.on("connectFailed", function(error) {
        throw new Error(`ws connect failed: ${error}`)
    });

    client.on("connect", connection => {
        console.log("ws:connect");
        emitter.once("disconnect", () => connection.close())
        connection.on("error", function(error) {
            throw new Error(`ws connect error: ${error}`);
        });
        let got = 0;
        connection.on("message", async message => {
            try {
                if (message.type === "utf8") {
                    const json = JSON.parse(message.utf8Data);
                    const urlType = json.payload.data.subscribe.data.__typename;
                    const url = json.payload.data.subscribe.data.name;
                    if (url == null || url == undefined) {

                    } else {
                        emitter.emit(urlType, url);
                    }
                }
            } catch (err) {
                if (message.type == "utf8") console.log(message.utf8Data);
            }
        });

        [{ "type": "connection_init", "payload": { "Authorization": "Bearer " + token.bearer } },
        { "id": "1", "type": "start", "payload": { "variables": { "input": { "channel": { "teamOwner": "AFD2022", "category": "CONFIG" } } }, "extensions": {}, "operationName": "configuration", "query": "subscription configuration($input: SubscribeInput!) {\n  subscribe(input: $input) {\n    id\n    ... on BasicMessage {\n      data {\n        __typename\n        ... on ConfigurationMessageData {\n          colorPalette {\n            colors {\n              hex\n              index\n              __typename\n            }\n            __typename\n          }\n          canvasConfigurations {\n            index\n            dx\n            dy\n            __typename\n          }\n          canvasWidth\n          canvasHeight\n          __typename\n        }\n      }\n      __typename\n    }\n    __typename\n  }\n}\n" } },
        { "id": "2", "type": "start", "payload": { "variables": { "input": { "channel": { "teamOwner": "AFD2022", "category": "CANVAS", "tag": canvasId.toString() } } }, "extensions": {}, "operationName": "replace", "query": "subscription replace($input: SubscribeInput!) {\n  subscribe(input: $input) {\n    id\n    ... on BasicMessage {\n      data {\n        __typename\n        ... on FullFrameMessageData {\n          __typename\n          name\n          timestamp\n        }\n        ... on DiffFrameMessageData {\n          __typename\n          name\n          currentTimestamp\n          previousTimestamp\n        }\n      }\n      __typename\n    }\n    __typename\n  }\n}\n" } },
        ].forEach(payl => connection.sendUTF(JSON.stringify(payl)));
    });

    const tryConnect = () => {
        client.connect("wss://gql-realtime-2.reddit.com/query", "graphql-ws", "https://hot-potato.reddit.com",
            {
                "User-Agent": userAgent,
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Sec-WebSocket-Version": "13",
                "Sec-WebSocket-Protocol": "graphql-ws",
                "Sec-WebSocket-Extensions": "permessage-deflate",
                "Sec-WebSocket-Key": "OQpanv4P08gBJgKAFk1v9f039TM=",
                "Sec-Fetch-Dest": "websocket",
                "Sec-Fetch-Mode": "websocket",
                "Sec-Fetch-Site": "same-site",
                "Pragma": "no-cache",
                "Cache-Control": "no-cache"
            }
        );
    }
    tryConnect();


    return emitter;
}
