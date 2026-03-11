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

function makeArrayDeclModel() {
  return {
    id: nextId++,
    type: "arrayDecl",
    name: "",
    size: "",
    errors: [],
  };
}

export function makeArrayGetModel() {
  return {
    id: nextId++,
    type: "arrayGet",
    arrayName: "",
    index: makeOperandModel(),
    children: [],
    errors: [],
  };
}

export function makeArraySetModel() {
  return {
    id: nextId++,
    type: "arraySet",
    arrayName: "",
    index: makeOperandModel(),
    value: makeOperandModel(),
    children: [],
    errors: [],
  };
}

export function makeCompareModel() {
  return {
    id: nextId++,
    type: "compare",
    operator: ">",
    left: makeOperandModel(),
    right: makeOperandModel(),
    children: [],
    errors: [],
  };
}

function makeIfModel() {
  return {
    id: nextId++,
    type: "if",
    comparator: ">",
    conditionChild: null,
    children: [],
    elseChildren: [],
    errors: [],
  };
}

function makeWhileModel() {
  return {
    id: nextId++,
    type: "while",
    comparator: ">",
    conditionChild: null,
    children: [],
    errors: [],
  };
}

export function isStatementBlockType(blockType) {
  return (
    blockType === "varDecl" ||
    blockType === "assign" ||
    blockType === "arrayDecl" ||
    blockType === "arraySet" ||
    blockType === "if" ||
    blockType === "while"
  );
}

export function isExpressionBlockType(blockType) {
  return (
    blockType === "arith" || blockType === "varGet" || blockType === "arrayGet"
  );
}

export function isConditionBlockType(blockType) {
  return blockType === "compare";
}

export function createBlockByType(blockType) {
  switch (blockType) {
    case "varDecl":
      return makeVarDeclModel();
    case "assign":
      return makeAssignModel();
    case "arith":
      return makeArithmeticModel();
    case "varGet":
      return makeVarGetModel();
    case "arrayDecl":
      return makeArrayDeclModel();
    case "arrayGet":
      return makeArrayGetModel();
    case "arraySet":
      return makeArraySetModel();
    case "compare":
      return makeCompareModel();
    case "if":
      return makeIfModel();
    case "while":
      return makeWhileModel();
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

  if (node.conditionChild) {
    children.push(node.conditionChild);
  }

  if (Array.isArray(node.elseChildren)) {
    for (const child of node.elseChildren) if (child) children.push(child);
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

export function putBlock(parentBlock, blockType, addIndex) {
  if (!isStatementBlockType(blockType)) return;

  const block = createBlockByType(blockType);
  if (!block) return;

  const index = normalizeIndex(addIndex, parentBlock.children.length);
  parentBlock.children.splice(index, 0, block);
}

export function putElseBlock(parentBlock, blockType, addIndex) {
  if (!isStatementBlockType(blockType)) return;

  const block = createBlockByType(blockType);
  if (!block) return;

  const index = normalizeIndex(addIndex, parentBlock.elseChildren.length);
  parentBlock.elseChildren.splice(index, 0, block);
}

function canInsertExpressionIntoParent(parentBlock, operandType) {
  return (
    (operandType === "expression" && parentBlock.type === "assign") ||
    (operandType === "left" && parentBlock.type === "arith") ||
    (operandType === "right" && parentBlock.type === "arith") ||
    (operandType === "index" && parentBlock.type === "arrayGet") ||
    (operandType === "index" && parentBlock.type === "arraySet") ||
    (operandType === "value" && parentBlock.type === "arraySet") ||
    (operandType === "left" && parentBlock.type === "compare") ||
    (operandType === "right" && parentBlock.type === "compare")
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

  if (operandType === "index") {
    parentBlock.children[0] = newBlock;
    return true;
  }

  if (operandType === "value") {
    parentBlock.children[1] = newBlock;
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

  if (Array.isArray(parent.elseChildren)) {
    const idx = parent.elseChildren.indexOf(block);
    if (idx !== -1) {
      parent.elseChildren.splice(idx, 1);
      return true;
    }
  }

  return false;
}

export function moveStatementBlock(blockId, newParent, newIndex) {
  const location = findBlockWithParentById(blockId, program);
  if (!location) return;

  const { blockModel, parentBlockModel } = location;
  if (!isStatementBlockType(blockModel.type)) return;
  if (blockModel.id === newParent.id) return;
  if (hasDescendant(blockModel, newParent.id)) return;

  let oldIndex;
  if (
    Array.isArray(parentBlockModel.elseChildren) &&
    parentBlockModel.elseChildren.indexOf(blockModel) !== -1
  ) {
    oldIndex = parentBlockModel.elseChildren.indexOf(blockModel);
    parentBlockModel.elseChildren.splice(oldIndex, 1);
  } else if (parentBlockModel.children.indexOf(blockModel) !== -1) {
    oldIndex = parentBlockModel.children.indexOf(blockModel);
    parentBlockModel.children.splice(oldIndex, 1);
  } else {
    return;
  }

  let targetIndex = normalizeIndex(newIndex, newParent.children.length);

  if (parentBlockModel === newParent && targetIndex > oldIndex) targetIndex--;
  newParent.children.splice(targetIndex, 0, blockModel);
}

export function moveStatementBlockToElse(blockId, newParent, newIndex) {
  const location = findBlockWithParentById(blockId, program);
  if (!location) return;

  const { blockModel, parentBlockModel } = location;
  if (!isStatementBlockType(blockModel.type)) return;
  if (blockModel.id === newParent.id) return;
  if (hasDescendant(blockModel, newParent.id)) return;

  let oldIndex;
  if (
    Array.isArray(parentBlockModel.elseChildren) &&
    parentBlockModel.elseChildren.indexOf(blockModel) !== -1
  ) {
    oldIndex = parentBlockModel.elseChildren.indexOf(blockModel);
    parentBlockModel.elseChildren.splice(oldIndex, 1);
  } else if (parentBlockModel.children.indexOf(blockModel) !== -1) {
    oldIndex = parentBlockModel.children.indexOf(blockModel);
    parentBlockModel.children.splice(oldIndex, 1);
  } else {
    return;
  }

  let targetIndex = normalizeIndex(newIndex, newParent.elseChildren.length);

  if (parentBlockModel === newParent && targetIndex > oldIndex) targetIndex--;
  newParent.elseChildren.splice(targetIndex, 0, blockModel);
}

export function moveBlockToParent(blockId, newParent, operandType) {
  const location = findBlockWithParentById(blockId, program);
  if (!location) return;

  const { blockModel, parentBlockModel } = location;
  if (!isExpressionBlockType(blockModel.type)) return;
  if (blockModel.id === newParent.id) return;
  if (hasDescendant(blockModel, newParent.id)) return;
  if (!canInsertExpressionIntoParent(newParent, operandType)) return;

  if (
    (operandType === "expression" &&
      parentBlockModel?.children?.[0] === blockModel) ||
    (operandType === "left" &&
      parentBlockModel?.children?.[0] === blockModel) ||
    (operandType === "right" &&
      parentBlockModel?.children?.[1] === blockModel) ||
    (operandType === "index" && parentBlockModel?.children[0] === blockModel) ||
    (operandType === "value" && parentBlockModel?.children[1] === blockModel)
  ) {
    return;
  }

  removeFromParent(parentBlockModel, blockModel);
  insertChildIntoParent(newParent, blockModel, operandType);
}

function findBlockWithParentById(
  targetBlockId,
  currentBlockModel,
  parentBlockModel = null,
) {
  if (currentBlockModel.id === targetBlockId)
    return { blockModel: currentBlockModel, parentBlockModel };

  for (const childBlockModel of getAllChildren(currentBlockModel)) {
    const found = findBlockWithParentById(
      targetBlockId,
      childBlockModel,
      currentBlockModel,
    );
    if (found) return found;
  }

  return null;
}
