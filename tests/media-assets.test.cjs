const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const questions = require("../server/media-questions.json");

test("12 retos visuales con archivos locales y un presupuesto total menor a 50 KB", () => {
  assert.equal(questions.length, 12);
  assert.equal(questions.filter((q) => q.media.type === "image").length, 10);
  assert.equal(questions.filter((q) => q.media.type === "video").length, 2);
  assert.equal(new Set(questions.map((q) => q.id)).size, 12);
  let total = 0;
  for (const question of questions) {
    assert.match(question.media.src, /^\/quiz-media\/[vc]\d{2}\.(svg|mp4)$/);
    assert.equal(question.options.length, 4);
    assert.ok(question.answer >= 0 && question.answer < 4);
    assert.ok(question.media.alt);
    const bytes = fs.readFileSync(
      path.join(__dirname, "../public", question.media.src),
    );
    assert.ok(bytes.length < 20_000, question.id);
    total += bytes.length;
    if (question.media.type === "video") {
      assert.equal(question.media.durationSeconds, 6);
      assert.equal(bytes.toString("ascii", 4, 8), "ftyp");
    }
  }
  assert.ok(total < 50_000, `El catálogo pesa ${total} bytes`);
});
