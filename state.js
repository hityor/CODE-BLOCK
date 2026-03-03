export const program = { children: [] };
let nextId = 1;

function makeOperandModel() {
  return { value: "", variable: "" };
}

function makeVarDeclModel() {
  return { id: nextId++, type: "varDecl", raw: "", children: [], errors: [] };
}

function makeAssignModel() {
  return {
    id: nextId++,
    type: "assign",
    variable: "",
    expression: makeOperandModel(),
    children: [],
    errors: [],
  };
}

export function makeArithmeticModel() {
  return {
    id: nextId++,
    type: "arith",
    variable: "",
    operator: "+",
    left: makeOperandModel(),
    right: makeOperandModel(),
    children: [],
    errors: [],
  };
}

export function putBlock(place, blockType, addIndex) {
  switch (blockType) {
    case "varDecl":
      place.children.splice(addIndex, 0, makeVarDeclModel());
      break;
    case "assign":
      place.children.splice(addIndex, 0, makeAssignModel());
      break;
    case "arith":
      place.children.splice(addIndex, 0, makeArithmeticModel());
      break;
  }
}

export function moveBlockById(blockId, newIndex) {
  const oldIndex = program.children.findIndex((b) => b.id === blockId);
  if (oldIndex === -1) return;

  newIndex = Math.max(0, Math.min(newIndex, program.children.length));

  if (newIndex === oldIndex) return;

  const [blockObj] = program.children.splice(oldIndex, 1);
  if (newIndex > oldIndex) newIndex--;
  program.children.splice(newIndex, 0, blockObj);
}

export function insertChildIntoParent(parentBlock, newBlock, operandType) {
  const children = parentBlock.children;
  if (operandType === "expression" || operandType === "left") {
    if (children.length > 0) children[0] = newBlock;
    else children.push(newBlock);
  } else if (operandType === "right") {
    if (children.length > 1) children[2] = newBlock;
    else if (children.length === 1) children.push(newBlock);
    else {
      children[1] = newBlock;
    }
  }
}

export function moveBlockToParent(blockId, newParent, operandType) {
  const { block, parent } = findBlockById(blockId, program);
  if (!block) return;

  if (parent) {
    const idx = parent.children.indexOf(block);
    if (idx !== -1) parent.children.splice(idx, 1);
  } else {
    const idx = program.children.indexOf(block);
    if (idx !== -1) program.children.splice(idx, 1);
  }

  insertChildIntoParent(newParent, block, operandType);
}

function findBlockById(id, node, parent = null) {
  if (node.id === id) return { block: node, parent };
  for (const child of node.children || []) {
    const result = findBlockById(id, child, node);
    if (result) return result;
  }
  return null;
}
