const { test } = require("node:test");
const assert = require("node:assert/strict");

test("recorrido automático con posiciones únicas y márgenes para distintos tamaños de tablero", async () => {
  const { createBoardPath } = await import("../shared/board-layout.js");
  for (const [size, columns] of [[1], [24], [36], [48], [60], [36, 9]]) {
    const positions = createBoardPath(size, columns);
    assert.equal(positions.length, size);
    assert.equal(new Set(positions.map((point) => point.join(","))).size, size);
    for (const [x, y] of positions)
      assert.ok(x >= 12 && x <= 92 && y >= 14 && y <= 84);
  }
  assert.throws(() => createBoardPath(0), RangeError);
  assert.throws(() => createBoardPath(36, 0), RangeError);
  assert.equal(new Set(createBoardPath(36, 9).map(([x]) => x)).size, 9);
});
