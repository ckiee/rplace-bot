import { join } from "path";
import { parseLoginsTxt, Pixel, setupTokensFile, Token } from "./data";
import { readFile, writeFile, mkdir } from "fs/promises";
import { logInto, palette, placePixel } from "./reddit";
import { createReadStream } from "fs";
import { PNG, PNGWithMetadata } from "pngjs";
import { findNearestRgb, hexToRgb, rgbToHex, sleep } from "./util";
import { connectWs } from "./ws";
import { execSync } from "child_process";

async function main() {
    const logins = parseLoginsTxt((await readFile(join(__dirname, "..", "logins.txt"))).toString("utf-8"));
    const tokens: Token[] = await setupTokensFile("tokens.json");
    const missingLogins = logins.filter(l =>
        !tokens.some(t => t.login.username == l.username && Date.now() < t.expiresAt));
    console.log(`Need to login to ${missingLogins.length}/${logins.length}`);

    const MAX_LOGINS = 5;
    for (let i = 0; i < missingLogins.length; i += MAX_LOGINS) {
        const results = await Promise.allSettled(missingLogins.slice(i, i + MAX_LOGINS).map(async (login, j) => {
            try {
                const token = await logInto(login);
                const idx = tokens.push(token);
                setTimeout(async () => {
                    console.log(`relogging into almost-expired token ${login.username}`);
                    tokens[idx] = await logInto(login);
                }, token.expiresAt - Date.now() - 30000)
            } catch (e) {
                console.error(`${j}:`, e);
            }
        }));
        console.log(`Login: ${i} → ${i + MAX_LOGINS}, ${results.filter(s => s.status == "fulfilled").length}/${results.length}`);
    }

    console.log(`Login: 0 → ${logins.length}, Got ${tokens.length}`);
    await writeFile("tokens.json", JSON.stringify(tokens), "utf-8");

    while (true) {

        const ws = await connectWs(tokens[tokens.length - 1], "3");

        const fullFrameUrl = (await (() => {
            return new Promise((resolve) => {
                ws.once("FullFrameMessageData", (url: string) => resolve(url));
            });
        })()) as string;
        execSync(`wget -O /tmp/ovw.png '${fullFrameUrl.replace(/'/g, "")}'`);
        execSync(`convert /tmp/ovw.png -define png:color-type=2 /tmp/ov.png`);
        ws.emit("disconnect");

        const png = await readParsePng("target.png");
        const actual = await readParsePng("/tmp/ov.png");
        const pixels = extractPixels(png, actual);

        if (pixels.length == 0) await sleep(2000);

        console.log(`We have ${pixels.length} to place (:`);

        let pixel;
        while (pixel = pixels.pop()) {
            let placed = false;
            inner:
            while (!placed) {
                const token = tokens.filter(t => Date.now() > t.ratelimitedUntil).sort((a, b) => a.ratelimitedUntil - b.ratelimitedUntil)[0];
                if (token == undefined) {
                    await sleep(100);
                    continue inner;
                }
                console.log(`${token.login.username} wants to set (${pixel.x},${pixel.y})`);
                try {
                    placed = await placePixel(token, pixel);
                } catch (error) {
                    console.error(`placePixel(..., (${pixel.x},${pixel.y})) errored:`, error);
                }
            }
            console.log(`Placed @ (${pixel.x},${pixel.y})`);
        }
    }
}

function readParsePng(path: string): Promise<PNGWithMetadata> {
    return new Promise((resolve, reject) => {
        createReadStream(path)
            .pipe(new PNG())
            .once("metadata", console.log)
            .once("parsed", function(this: PNGWithMetadata) { resolve(this) })
            .once("error", reject);
    });
}

function pngXyToIdx(png: PNG, x: number, y: number): number {
    // Bitshift 2 gives us the bits used for the indexes for R,G,B
    return (png.width * y + x) << 2;
}

function extractPixels(/*from*/png: PNGWithMetadata, actual: PNGWithMetadata) {
    const pixels = [];

    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            const idx = pngXyToIdx(png, x, y);
            const [r, g, b] = [0, 1, 2].map(i => png.data[idx + i]);
            const hex = rgbToHex(r, g, b);
            const [ar, ag, ab] = [0, 1, 2].map(i => actual.data[idx + i]);
            const actualHex = rgbToHex(ar, ag, ab);
            const nearest = findNearestRgb([ r, g, b ], palette.map(p => hexToRgb(p.hex)));
            if (!nearest) {
                throw new Error(`Failed to find nearest Rgb: ${hex}`);
            }

            if (hex !== "#ff4500" && actualHex !== hex) {
                pixels.push(<Pixel>{
                    canvas: 3,
                    color: rgbToHex(...nearest),
                    x,
                    y
                });
            }
        }
    }

    return pixels;
}

main().catch(e => { throw e; })
