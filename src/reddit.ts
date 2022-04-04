import puppeteer from "puppeteer";
import { getObjectPath, Login, Pixel, Rgb, Token } from "./data";
import fetch from "node-fetch";

export const userAgent = "Rplacebot/1.0 (by /u/ckiee)";
const loginExpiry = 3600 * 1000;
const maxRatelimit = 1680465897316;

export const palette = [
    {
        "hex": "#6d001a",
        "index": 0,

    },
    {
        "hex": "#be0039",
        "index": 1,

    },
    {
        "hex": "#ff4500",
        "index": 2,

    },
    {
        "hex": "#ffa800",
        "index": 3,

    },
    {
        "hex": "#ffd635",
        "index": 4,

    },
    {
        "hex": "#fff8b8",
        "index": 5,

    },
    {
        "hex": "#00a368",
        "index": 6,

    },
    {
        "hex": "#00cc78",
        "index": 7,

    },
    {
        "hex": "#7eed56",
        "index": 8,

    },
    {
        "hex": "#00756f",
        "index": 9,

    },
    {
        "hex": "#009eaa",
        "index": 10,

    },
    {
        "hex": "#00ccc0",
        "index": 11,

    },
    {
        "hex": "#2450a4",
        "index": 12,

    },
    {
        "hex": "#3690ea",
        "index": 13,

    },
    {
        "hex": "#51e9f4",
        "index": 14,

    },
    {
        "hex": "#493ac1",
        "index": 15,

    },
    {
        "hex": "#6a5cff",
        "index": 16,

    },
    {
        "hex": "#94b3ff",
        "index": 17,

    },
    {
        "hex": "#811e9f",
        "index": 18,

    },
    {
        "hex": "#b44ac0",
        "index": 19,

    },
    {
        "hex": "#e4abff",
        "index": 20,

    },
    {
        "hex": "#de107f",
        "index": 21,

    },
    {
        "hex": "#ff3881",
        "index": 22,

    },
    {
        "hex": "#ff99aa",
        "index": 23,

    },
    {
        "hex": "#6d482f",
        "index": 24,

    },
    {
        "hex": "#9c6926",
        "index": 25,

    },
    {
        "hex": "#ffb470",
        "index": 26,

    },
    {
        "hex": "#000000",
        "index": 27,

    },
    {
        "hex": "#515252",
        "index": 28,

    },
    {
        "hex": "#898d90",
        "index": 29,

    },
    {
        "hex": "#d4d7d9",
        "index": 30,

    },
    {
        "hex": "#ffffff",
        "index": 31,

    }
];

const launchBrowser = () =>
    puppeteer.launch({
        headless: true,
        executablePath:
            "/nix/store/f9qnwqpd0mj8qvsxdj0nrwmwrc66dhrf-chromium-99.0.4844.74/bin/chromium",
        devtools: false,
    });

export async function logInto(login: Login): Promise<Token> {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto("https://old.reddit.com/login");
    await page.waitForSelector("#user_login");
    await page.waitForSelector("#passwd_login");
    await page.type("#user_login", login.username);
    await page.type("#passwd_login", login.password);
    await Promise.all([
        page.click("#login-form .c-btn-primary"),
        page.waitForNavigation(),
    ]);
    const cookies = await page.cookies();
    const jwtCookie = cookies.filter((c) => c.name == "token_v2")[0].value;
    const accessToken = JSON.parse(
        Buffer.from(
            jwtCookie.split(".")[1],
            "base64"
        ).toString("utf-8")
    ).sub as string;
    if (typeof accessToken !== "string") throw new TypeError(`bad JWT from reddit cookie: ${JSON.stringify(jwtCookie)}`);
    await browser.close();

    return {
        bearer: accessToken,
        login,
        ratelimitedUntil: 0,
        expiresAt: loginExpiry + Date.now()
    };
}

async function getNearestPaletteColor(color: string) {
    // const rgb = hexToRgb(color);
    // const distanceFromTarget = (c: Rgb) => Math.pow(rgb[0] - c[0], 2) +
    //     Math.pow(rgb[1] - c[1], 2) +
    //     Math.pow(rgb[2] - c[2], 2);

    const pick = palette.filter(p => p.hex == color)[0];
    // console.log({pick,color});
    return pick;
}

export async function placePixel(token: Token, pixel: Pixel): Promise<boolean> {
    const res = await fetch("https://gql-realtime-2.reddit.com/query", {
        "headers": {
            "User-Agent": userAgent,
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "content-type": "application/json",
            "authorization": `Bearer ${token.bearer}`,
            "apollographql-client-name": "mona-lisa",
            "apollographql-client-version": "0.0.1",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site"
        },
        "body": JSON.stringify({
            "operationName": "setPixel",
            "variables": {
                "input": {
                    "actionName": "r/replace:set_pixel",
                    "PixelMessageData": {
                        "coordinate": {
                            "x": pixel.x,
                            "y": pixel.y
                        },
                        "colorIndex": (await getNearestPaletteColor(pixel.color)).index,
                        "canvasIndex": pixel.canvas
                    }
                }
            },
            "query": "mutation setPixel($input: ActInput!) {\n  act(input: $input) {\n    data {\n      ... on BasicMessage {\n        id\n        data {\n          ... on GetUserCooldownResponseMessageData {\n            nextAvailablePixelTimestamp\n            __typename\n          }\n          ... on SetPixelResponseMessageData {\n            timestamp\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
        }),
        "method": "POST",
    });
    const data = await res.json();

    let ratelimit;
    if ((ratelimit = getObjectPath(data, "act.data.0.data.nextAvailablePixelTimestamp"))
        || (ratelimit = getObjectPath(data, "errors.0.extensions.nextAvailablePixelTs"))) {
        token.ratelimitedUntil = ratelimit;
    }
    if (getObjectPath(data, "data.act.__typename") == "ActResponse") {
        return true;
    } else if (getObjectPath(data, "errors") || getObjectPath(data, "error")) {
        // token.ratelimitedUntil = maxRatelimit; // invalidate
        console.error(`Reddit error: ${JSON.stringify(data)}`);
        if (getObjectPath(data, "error.reason") == "UNAUTHORIZED") {
            token.ratelimitedUntil = maxRatelimit;
        }
    }
    else
        console.error(`Reddit unexpected response: ${JSON.stringify(data)}`);
    return false;
}
