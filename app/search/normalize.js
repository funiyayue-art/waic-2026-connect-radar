export function toHalfWidth(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\u3000/g, " ")
    .replace(/[\uFF01-\uFF5E]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0),
    );
}

export function normalizeText(value = "") {
  return toHalfWidth(value)
    .toLowerCase()
    .replace(/[‐‑‒–—―－_／\\|]+/g, " ")
    .replace(/[，、；;：:。！？!?'"“”‘’()[\]{}<>《》]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCompact(value = "") {
  return normalizeText(value).replace(/[^a-z0-9\u3400-\u9fff]+/g, "");
}

export function normalizeBoothNumber(value = "") {
  return toHalfWidth(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

export function tokenizeSearchQuery(value = "") {
  return Array.from(
    new Set(
      toHalfWidth(value)
        .split(/[\s,，、/|]+/u)
        .map((term) => normalizeCompact(term))
        .filter(Boolean),
    ),
  );
}

export function fuzzyThreshold(length) {
  if (length <= 2) return 0;
  if (length <= 5) return 1;
  return 2;
}

export function damerauLevenshtein(leftValue = "", rightValue = "") {
  const left = Array.from(leftValue);
  const right = Array.from(rightValue);
  const matrix = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0),
  );

  for (let index = 0; index <= left.length; index += 1) matrix[index][0] = index;
  for (let index = 0; index <= right.length; index += 1) matrix[0][index] = index;

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        matrix[row][column] = Math.min(
          matrix[row][column],
          matrix[row - 2][column - 2] + cost,
        );
      }
    }
  }

  return matrix[left.length][right.length];
}
