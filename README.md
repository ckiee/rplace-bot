# rplace-bot

This is my bot for the 2022 edition of [/r/place](https://reddit.com/r/place).

It's about 500 lines of TypeScript and mostly respects the reddit ratelimits after a warmup period.

## Usage

- Make a `logins.txt` and include `uname:pw` pairs separated by lines.
- Make a `target.png` with [colortype 2](https://github.com/imagemagick/ImageMagick/blob/7e36bce9e429604a633b921b01d26ebab00e5578/coders/png.c#L12067).
- `yarn ts-node src`

## License

    Copyright (C) 2022  ckie

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, using version 3 of the License.
    
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
