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
    operator: "+",
    left: makeOperandModel(),
    right: makeOperandModel(),
    children: [],
    errors: [],
  };
}

export function makeVarGetModel() {
  return {
    id: nextId++,
    type: "varGet",
    variable: "",
    children: [],
    errors: [],
  };
}

function makeIfModel() {
  return {
    id: nextId++,
    type: "if",
    comparator: ">",
    left: makeOperandModel(),
    right: makeOperandModel(),
    conditionChildren: [null, null],
    children: [],
    errors: [],
  };
}

export function isStatementBlockType(blockType) {
  return blockType === "varDecl" || blockType === "assign" || blockType === "if";
}

export function isExpressionBlockType(blockType) {
  return blockType === "arith" || blockType === "varGet";
}

function createBlockByType(blockType) {
  switch (blockType) {
    case "varDecl":
      return makeVarDeclModel();
    case "assign":
      return makeAssignModel();
    case "arith":
      return makeArithmeticModel();
    case "varGet":
      return makeVarGetModel();
    case "if":
      return makeIfModel();
    default:
      return null;
  }
}

function normalizeIndex(index, length) {
  return Math.max(0, Math.min(index, length));
}

function getAllChildren(node) {
  const children = [];

  if (Array.isArray(node.children)) {
    for (const child of node.children) if (child) children.push(child);
  }

  if (Array.isArray(node.conditionChildren)) {
    for (const child of node.conditionChildren) if (child) children.push(child);
  }

  return children;
}

function hasDescendant(node, targetId) {
  for (const child of getAllChildren(node)) {
    if (child.id === targetId) return true;
    if (hasDescendant(child, targetId)) return true;
  }

  return false;
}

export function putBlock(place, blockType, addIndex) {
  if (!isStatementBlockType(blockType)) return;

  const block = createBlockByType(blockType);
  if (!block) return;

  const index = normalizeIndex(addIndex, place.children.length);
  place.children.splice(index, 0, block);
}

export function moveBlockById(blockId, newIndex) {
  const oldIndex = program.children.findIndex((b) => b.id === blockId);
  if (oldIndex === -1) return;

  newIndex = normalizeIndex(newIndex, program.children.length);

  if (newIndex === oldIndex) return;

  const [blockObj] = program.children.splice(oldIndex, 1);
  if (newIndex > oldIndex) newIndex--;
  program.children.splice(newIndex, 0, blockObj);
}

function canInsertExpressionIntoParent(parentBlock, operandType) {
  return (
    (operandType === "expression" && parentBlock.type === "assign") ||
    (operandType === "left" && parentBlock.type === "arith") ||
    (operandType === "right" && parentBlock.type === "arith") ||
    (operandType === "condLeft" && parentBlock.type === "if") ||
    (operandType === "condRight" && parentBlock.type === "if")
  );
}

export function insertChildIntoParent(parentBlock, newBlock, operandType) {
  if (!newBlock || !isExpressionBlockType(newBlock.type)) return false;
  if (!canInsertExpressionIntoParent(parentBlock, operandType)) return false;

  if (operandType === "expression") {
    parentBlock.children[0] = newBlock;
    return true;
  }

  if (operandType === "left") {
    parentBlock.children[0] = newBlock;
    return true;
  }

  if (operandType === "right") {
    parentBlock.children[1] = newBlock;
    return true;
  }

  if (operandType === "condLeft") {
    parentBlock.conditionChildren[0] = newBlock;
    return true;
  }

  if (operandType === "condRight") {
    parentBlock.conditionChildren[1] = newBlock;
    return true;
  }

  return false;
}

function removeFromParent(parent, block) {
  if (!parent || !block) return false;

  if (Array.isArray(parent.children)) {
    const idx = parent.children.indexOf(block);
    if (idx !== -1) {
      parent.children.splice(idx, 1);
      return true;
    }
  }

  if (Array.isArray(parent.conditionChildren)) {
    if (parent.conditionChildren[0] === block) {
      parent.conditionChildren[0] = null;
      return true;
    }

    if (parent.conditionChildren[1] === block) {
      parent.conditionChildren[1] = null;
      return true;
    }
  }

  return false;
}

export function moveStatementBlock(blockId, newParent, newIndex) {
  const location = findBlockById(blockId, program);
  if (!location) return;

  const { block, parent } = location;
  if (!isStatementBlockType(block.type)) return;
  if (!Array.isArray(newParent.children)) return;
  if (block.id === newParent.id) return;
  if (hasDescendant(block, newParent.id)) return;

  if (!Array.isArray(parent.children)) return;

  const oldIndex = parent.children.indexOf(block);
  if (oldIndex === -1) return;

  let targetIndex = normalizeIndex(newIndex, newParent.children.length);

  parent.children.splice(oldIndex, 1);
  if (parent === newParent && targetIndex > oldIndex) targetIndex--;
  newParent.children.splice(targetIndex, 0, block);
}

export function moveBlockToParent(blockId, newParent, operandType) {
  const location = findBlockById(blockId, program);
  if (!location) return;

  const { block, parent } = location;
  if (!isExpressionBlockType(block.type)) return;
  if (block.id === newParent.id) return;
  if (hasDescendant(block, newParent.id)) return;
  if (!canInsertExpressionIntoParent(newParent, operandType)) return;

  if (
    (operandType === "expression" && parent?.children?.[0] === block) ||
    (operandType === "left" && parent?.children?.[0] === block) ||
    (operandType === "right" && parent?.children?.[1] === block) ||
    (operandType === "condLeft" && parent?.conditionChildren?.[0] === block) ||
    (operandType === "condRight" && parent?.conditionChildren?.[1] === block)
  ) {
    return;
  }

  removeFromParent(parent, block);
  insertChildIntoParent(newParent, block, operandType);
}

function findBlockById(id, node, parent = null) {
  if (node.id === id) return { block: node, parent };

  for (const child of getAllChildren(node)) {
    const result = findBlockById(id, child, node);
    if (result) return result;
  }

  return null;
}
