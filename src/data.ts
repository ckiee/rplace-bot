import { writeFile, readFile, stat } from "fs/promises";
import fetch from "node-fetch";
import { userAgent } from "./reddit";

export interface Login {
    username: string
    password: string
};

export interface Token {
    bearer: string;
    login: Login;
    ratelimitedUntil: number;
    expiresAt: number;
}

export interface Pixel {
    x: number,
    y: number,
    canvas: number
    color: string;
}

export type Rgb = [number, number, number];

async function fileExists(path: string) {
    try {
        await stat(path);
        return true;
    } catch (err) {
        return false;
    }
}

export function parseLoginsTxt(file: string): Login[] {
    return file.split("\n")
        .map(line => line.split(":"))
        .filter(array => array.length == 2)
        .map(([username, password]) => ({ username, password } as Login));
}

export async function setupTokensFile(path: string): Promise<Token[]> {
    if (await fileExists(path)) {
        const parsed = JSON.parse((await readFile(path)).toString("utf-8"));
        if (!Array.isArray(parsed)) throw new TypeError(`tokens.json was malformed`);
        return parsed as Token[];
    } else {
        await writeFile(path, "[]", "utf-8");
        return await setupTokensFile(path);
    }
}

export function getObjectPath(obj: any, path: string): any {
    const stack = path.split(".");
    let ele;
    while (ele = stack.shift()) {
        if (typeof obj == "object" && obj !== null && obj !== undefined) {
            const asInt = parseInt(ele);
            obj = obj[isNaN(asInt) ? ele : asInt];
        } else {
            return null;
        }
    }
    return obj;
}
