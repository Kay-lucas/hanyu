// 단어 데이터 검증: 글자 수와 병음 음절 수가 맞는지, 중복이 없는지 확인
const fs = require("fs");
const path = require("path");
const window = {};
eval(fs.readFileSync(path.join(__dirname, "../public/words.js"), "utf8"));
const words = window.WORDS;
let errors = 0;
const seen = new Set();
words.forEach((w, i) => {
  const chars = [...w.h];
  const sylls = w.p.split(" ");
  if (chars.length !== sylls.length) {
    console.error(`#${i + 1} ${w.h}: 글자 ${chars.length}개, 음절 ${sylls.length}개`);
    errors++;
  }
  if (seen.has(w.h)) { console.error(`#${i + 1} ${w.h}: 중복`); errors++; }
  seen.add(w.h);
  if (!w.m || !w.ex || w.ex.length !== 3 || !w.tip) {
    console.error(`#${i + 1} ${w.h}: 필드 누락`); errors++;
  }
});
console.log(`${words.length}개 단어, 오류 ${errors}개`);
process.exit(errors ? 1 : 0);
