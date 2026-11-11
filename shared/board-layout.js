// Reparte cualquier cantidad de casillas en un recorrido serpenteante.
// Los márgenes reservan sitio para los números y las fichas en celulares bajos.
export function createBoardPath(total, preferredColumns) {
  if (!Number.isInteger(total) || total < 1)
    throw new RangeError("Cantidad de casillas no válida.");
  if (
    preferredColumns !== undefined &&
    (!Number.isInteger(preferredColumns) || preferredColumns < 1)
  )
    throw new RangeError("Cantidad de columnas no válida.");
  const columns = Math.min(
    total,
    preferredColumns ?? Math.ceil(Math.sqrt(total * 4)),
  );
  const rows = Math.ceil(total / columns);
  return Array.from({ length: total }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const direction = row % 2 === 0 ? column : columns - 1 - column;
    // Una ondulación suave deja espacio para los paisajes entre tramos.
    const wave =
      columns === 1
        ? 0
        : Math.sin((direction / (columns - 1)) * Math.PI * 2) * 3;
    return [
      columns === 1 ? 50 : 12 + (direction * 80) / (columns - 1),
      rows === 1 ? 50 : 81 - (row * 64) / (rows - 1) + wave,
    ];
  });
}
