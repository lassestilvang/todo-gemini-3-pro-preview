import { AVAILABLE_ICONS } from "./src/lib/icons";

const oldLabelsArray = ["tag", "hash", "flag", "bookmark", "alert-triangle", "check-square", "clock-3", "zap", "heart", "star", "flame", "rocket", "gem"];

function oldFilter() {
    return AVAILABLE_ICONS.filter(i => oldLabelsArray.includes(i.name));
}

const newLabelsSet = new Set(["tag", "hash", "flag", "bookmark", "alert-triangle", "check-square", "clock-3", "zap", "heart", "star", "flame", "rocket", "gem"]);

function newFilter() {
    return AVAILABLE_ICONS.filter(i => newLabelsSet.has(i.name));
}

const iterations = 1000000;

console.log("Benchmarking filter...");
const startOld = performance.now();
for (let i = 0; i < iterations; i++) {
    oldFilter();
}
const endOld = performance.now();
console.log(`Old filter (Array.includes): ${endOld - startOld}ms`);

const startNew = performance.now();
for (let i = 0; i < iterations; i++) {
    newFilter();
}
const endNew = performance.now();
console.log(`New filter (Set.has): ${endNew - startNew}ms`);
