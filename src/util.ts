import { Rgb } from "./data";

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    })
}

// https://github.com/mpotra/find-color/blob/master/src/find-color.js
export function findNearestRgb(find: Rgb, colors: Rgb[]) {

  // For each color in the list, compute the distance to the color
  // that needs matching.
  // Formula: sqrt((x1 - x2)^2 + (y1 - y2)^2 + (z1 - z2)^2)
  const nearest = colors.map((color) => Math.sqrt(
          Math.pow(find[0] - color[0], 2) +
          Math.pow(find[1] - color[1], 2) +
          Math.pow(find[2] - color[2], 2)
        ))
        // Find the smallest distance.
        .reduce((prev, curr, index) => {
          if ((prev && prev.distance > curr) || !prev) {
            return {'distance': curr, 'index': index}
          } else {
            return prev
          }
        }, {'distance': Infinity, 'index': -1})

  return (nearest.index >= 0 ? colors[nearest.index] : undefined)
};

export function hexToRgb(hex: string): Rgb {
    const int = parseInt(hex.slice(1), 16);
    return [
        ((int >> 16) & 0xff),
        ((int >> 8) & 0xff),
        (int & 0xff)
    ];
}

export function rgbToHex(r: number, g: number, b: number) {
    let hex = (r << 16 | g << 8 | b).toString(16);
    while (hex.length < 6) hex = "0" + hex;
    hex = "#" + hex;
    return hex;
}
