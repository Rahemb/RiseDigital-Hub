// Minimal test-only decoder for JSON action results and length-prefixed text chunks.
// Next uses text references for large signed company previews, without a newline
// between a text chunk and the following JSON record. Lengths are UTF-8 bytes.
export function decodeActionResult(body: string) {
  const bytes = Buffer.from(body);
  const texts = new Map<string, string>();
  let result: string | undefined;
  let offset = 0;
  while (offset < bytes.length) {
    if (bytes[offset] === 10) {
      offset++;
      continue;
    }
    const colon = bytes.indexOf(58, offset);
    if (colon < 0) break;
    const id = bytes.subarray(offset, colon).toString();
    offset = colon + 1;
    if (bytes[offset] === 84) {
      const comma = bytes.indexOf(44, offset);
      if (comma < 0) throw new Error("Invalid action text chunk");
      const length = Number.parseInt(
        bytes.subarray(offset + 1, comma).toString(),
        16,
      );
      if (!Number.isFinite(length) || comma + 1 + length > bytes.length)
        throw new Error("Incomplete action text chunk");
      texts.set(id, bytes.subarray(comma + 1, comma + 1 + length).toString());
      offset = comma + 1 + length;
    } else {
      let end = bytes.indexOf(10, offset);
      if (end < 0) end = bytes.length;
      if (id === "1") result = bytes.subarray(offset, end).toString();
      offset = end + 1;
    }
  }
  if (!result) throw new Error("Missing action result");
  return JSON.parse(result, (_key, value: unknown) =>
    typeof value === "string" && value.startsWith("$$")
      ? value.slice(1)
      : typeof value === "string" &&
          texts.has(value.slice(1)) &&
          value.startsWith("$")
        ? texts.get(value.slice(1))
        : value,
  );
}
