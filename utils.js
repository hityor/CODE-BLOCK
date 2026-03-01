export function isValidVarName(name) {
  const regex = /^[A-Za-z_][A-Za-z0-9_]*$/;
  return regex.test(name);
}

export function parseNames(text) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}
