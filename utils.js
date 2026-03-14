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

function getChildBlocks(blockModel) {
  const children = [];

  if (blockModel.type === "assign") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
  }

  if (blockModel.type === "arith") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
    if (blockModel.children[1]) children.push(blockModel.children[1]);
  }

  if (blockModel.type === "arrayGet") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
  }

  if (blockModel.type === "arraySet") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
    if (blockModel.children[1]) children.push(blockModel.children[1]);
  }

  if (blockModel.type === "compare") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
    if (blockModel.children[1]) children.push(blockModel.children[1]);
  }

  if (blockModel.type === "if") {
    if (blockModel.conditionChild) children.push(blockModel.conditionChild);

    for (const child of blockModel.children) children.push(child);
    for (const child of blockModel.elseChildren) children.push(child);
  }

  if (blockModel.type === "while") {
    if (blockModel.conditionChild) children.push(blockModel.conditionChild);

    for (const child of blockModel.children) children.push(child);
  }

  if (blockModel.type === "for") {
    if (blockModel.conditionChild) children.push(blockModel.conditionChild);
    for (const child of blockModel.children) if (child) children.push(child);
  }

  if (blockModel.type === "logic") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
    if (blockModel.children[1]) children.push(blockModel.children[1]);
  }

  if (blockModel.type === "not") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
  }

  return children;
}

function walkBlockTree(blockModel, visit) {
  visit(blockModel);

  for (const child of getChildBlocks(blockModel)) {
    walkBlockTree(child, visit);
  }
}

export function walkProgramTree(program, visit) {
  for (const blockModel of program.children) walkBlockTree(blockModel, visit);
}
