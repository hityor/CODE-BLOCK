import { Views } from "./blocksView.js";

class OperandModel {
  constructor() {
    this.value = "";
  }
}

class BlockModel {
  constructor(type) {
    this.id = -1;
    this.type = type;
    this.children = [];
    this.errors = [];
    this.isStatement = false;
    this.isExpression = false;

    this.getView = Views[`${this.type}View`];
  }

  getAllChildren() {
    const children = [];

    if (Array.isArray(this.children)) {
      for (const child of this.children) if (child) children.push(child);
    }

    if (this.conditionChild) {
      children.push(this.conditionChild);
    }

    if (Array.isArray(this.elseChildren)) {
      for (const child of this.elseChildren) if (child) children.push(child);
    }

    return children;
  }

  hasDescendant(targetId) {
    for (const child of this.getAllChildren()) {
      if (child.id === targetId) return true;
      if (child.hasDescendant(targetId)) return true;
    }
    return false;
  }

  removeFromParent(parent) {
    if (!parent) return false;

    if (parent.conditionChild === this) {
      parent.conditionChild = null;
      return true;
    }

    if (Array.isArray(parent.children)) {
      const idx = parent.children.indexOf(this);
      if (idx !== -1) {
        parent.children.splice(idx, 1);
        return true;
      }
    }

    if (Array.isArray(parent.elseChildren)) {
      const idx = parent.elseChildren.indexOf(this);
      if (idx !== -1) {
        parent.elseChildren.splice(idx, 1);
        return true;
      }
    }

    return false;
  }
  serialize() {
    const obj = {
      id: this.id,
      type: this.type,
    };

    for (const key of Object.keys(this)) {
      if (
        key === "id" ||
        key === "type" ||
        key === "getView" ||
        typeof this[key] === "function"
      )
        continue;

      const value = this[key];

      if (value instanceof BlockModel) {
        obj[key] = value.serialize();
      } else if (Array.isArray(value)) {
        obj[key] = value.map((item) =>
          item instanceof BlockModel ? item.serialize() : item,
        );
      } else if (
        value &&
        value.constructor &&
        value.constructor.name === "OperandModel"
      ) {
        // Сериализуем OperandModel
        obj[key] = {
          value: value.value,
          variable: value.variable,
        };
      } else {
        obj[key] = value;
      }
    }

    return obj;
  }
}

class VarDeclModel extends BlockModel {
  constructor() {
    super("varDecl");
    this.isStatement = true;
    this.rawNames = "";
  }
}

class AssignModel extends BlockModel {
  constructor() {
    super("assign");
    this.isStatement = true;
    this.variable = "";
    this.expression = new OperandModel();
  }
}

class VarGetModel extends BlockModel {
  constructor() {
    super("varGet");
    this.isExpression = true;
    this.variable = "";
  }
}

class ArrayDeclModel extends BlockModel {
  constructor() {
    super("arrayDecl");
    this.isStatement = true;
    this.name = "";
    this.size = "";
  }
}

class ArrayGetModel extends BlockModel {
  constructor() {
    super("arrayGet");
    this.isExpression = true;
    this.arrayName = "";
    this.index = new OperandModel();
  }
}

class ArraySetModel extends BlockModel {
  constructor() {
    super("arraySet");
    this.isStatement = true;
    this.arrayName = "";
    this.index = new OperandModel();
    this.value = new OperandModel();
  }
}

class ArithmeticModel extends BlockModel {
  constructor() {
    super("arith");
    this.isExpression = true;
    this.operator = "+";
    this.left = new OperandModel();
    this.right = new OperandModel();
  }
}

class CompareModel extends BlockModel {
  constructor() {
    super("compare");
    this.operator = ">";
    this.left = new OperandModel();
    this.right = new OperandModel();
  }
}

class IfModel extends BlockModel {
  constructor() {
    super("if");
    this.comparator = ">";
    this.conditionChild = null;
    this.elseChildren = [];
    this.isStatement = true;
  }
}

class WhileModel extends BlockModel {
  constructor() {
    super("while");
    this.isStatement = true;
    this.conditionChild = null;
  }
}

export class Program {
  constructor() {
    this.nextId = 1;
    this.children = [];
  }

  generateId() {
    return this.nextId++;
  }

  isConditionBlockType(blockType) {
    return blockType === "compare";
  }

  isStatementBlockType(blockType) {
    return (
      blockType === "varDecl" ||
      blockType === "assign" ||
      blockType === "arrayDecl" ||
      blockType === "arraySet" ||
      blockType === "if" ||
      blockType === "while"
    );
  }

  isExpressionBlockType(blockType) {
    return (
      blockType === "arith" ||
      blockType === "varGet" ||
      blockType === "arrayGet"
    );
  }

  createBlockByType(blockType, assignId = true) {
    let newBlockModel;
    switch (blockType) {
      case "varDecl":
        newBlockModel = new VarDeclModel();
        break;
      case "assign":
        newBlockModel = new AssignModel();
        break;
      case "arith":
        newBlockModel = new ArithmeticModel();
        break;
      case "varGet":
        newBlockModel = new VarGetModel();
        break;
      case "arrayDecl":
        newBlockModel = new ArrayDeclModel();
        break;
      case "arrayGet":
        newBlockModel = new ArrayGetModel();
        break;
      case "arraySet":
        newBlockModel = new ArraySetModel();
        break;
      case "compare":
        newBlockModel = new CompareModel();
        break;
      case "if":
        newBlockModel = new IfModel();
        break;
      case "while":
        newBlockModel = new WhileModel();
        break;
      default:
        newBlockModel = null;
    }
    if (newBlockModel && assignId) {
      newBlockModel.id = this.generateId();
    }
    return newBlockModel;
  }

  serialize() {
    return {
      nextId: this.nextId,
      children: this.children.map((child) => child.serialize()),
    };
  }

  deserialize(data) {
    this.nextId = data.nextId;
    this.children = data.children
      .map((childData) => this.deserializeBlock(childData))
      .filter(Boolean);
  }

  deserializeBlock(data) {
    if (!data) return null;
    const block = this.createBlockByType(data.type, false);
    if (!block) return null;

    for (const [key, value] of Object.entries(data)) {
      if (key === "type" || key === "id" || key === "getView") continue;

      if (value.type) {
        block[key] = this.deserializeBlock(value);
      } else if (Array.isArray(value)) {
        block[key] = value
          .map((item) =>
            item && item.type ? this.deserializeBlock(item) : item,
          )
          .filter(Boolean);
      } else block[key] = value;
    }

    return block;
  }

  normalizeIndex(index, length) {
    return Math.max(0, Math.min(index, length));
  }

  canInsertExpressionIntoParent(parentBlock, operandType) {
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

  findBlockWithParentById(
    targetBlockId,
    currentBlock = this,
    parentBlock = null,
  ) {
    if (currentBlock === this) {
      for (const child of this.children) {
        const found = this.findBlockWithParentById(targetBlockId, child, this);
        if (found) return found;
      }
      return null;
    }

    if (currentBlock.id === targetBlockId) {
      return { blockModel: currentBlock, parentBlockModel: parentBlock };
    }

    const children = currentBlock.getAllChildren?.() || [];
    for (const child of children) {
      if (child) {
        const found = this.findBlockWithParentById(
          targetBlockId,
          child,
          currentBlock,
        );
        if (found) return found;
      }
    }

    return null;
  }

  putBlock(parentBlock, blockType, addIndex) {
    if (!this.isStatementBlockType(blockType)) return;

    const block = this.createBlockByType(blockType);
    if (!block) return;

    const index = this.normalizeIndex(addIndex, parentBlock.children.length);
    parentBlock.children.splice(index, 0, block);
  }

  putElseBlock(parentBlock, blockType, addIndex) {
    if (!this.isStatementBlockType(blockType)) return;

    const block = this.createBlockByType(blockType);
    if (!block) return;

    const index = this.normalizeIndex(
      addIndex,
      parentBlock.elseChildren.length,
    );
    parentBlock.elseChildren.splice(index, 0, block);
  }

  insertChildIntoParent(parentBlock, newBlock, operandType) {
    if (!newBlock || !this.isExpressionBlockType(newBlock.type)) return false;
    if (!this.canInsertExpressionIntoParent(parentBlock, operandType))
      return false;

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

  moveStatementBlock(blockId, newParent, newIndex) {
    const location = this.findBlockWithParentById(blockId);
    if (!location) return;

    const { blockModel, parentBlockModel } = location;
    if (!this.isStatementBlockType(blockModel.type)) return;
    if (blockModel.id === newParent.id) return;
    if (blockModel.hasDescendant(newParent.id)) return;

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

    let targetIndex = this.normalizeIndex(newIndex, newParent.children.length);

    if (parentBlockModel === newParent && targetIndex > oldIndex) targetIndex--;
    newParent.children.splice(targetIndex, 0, blockModel);
  }

  moveStatementBlockToElse(blockId, newParent, newIndex) {
    const location = this.findBlockWithParentById(blockId, this);
    if (!location) return;

    const { blockModel, parentBlockModel } = location;
    if (!this.isStatementBlockType(blockModel.type)) return;
    if (blockModel.id === newParent.id) return;
    if (blockModel.hasDescendant(newParent.id)) return;

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

    let targetIndex = this.normalizeIndex(
      newIndex,
      newParent.elseChildren.length,
    );

    if (parentBlockModel === newParent && targetIndex > oldIndex) targetIndex--;
    newParent.elseChildren.splice(targetIndex, 0, blockModel);
  }

  moveBlockToParent(blockId, newParent, operandType) {
    const location = this.findBlockWithParentById(blockId, this);
    if (!location) return;

    const { blockModel, parentBlockModel } = location;
    if (!this.isExpressionBlockType(blockModel.type)) return;
    if (blockModel.id === newParent.id) return;
    if (blockModel.hasDescendant(newParent.id)) return;
    if (!this.canInsertExpressionIntoParent(newParent, operandType)) return;

    if (
      (operandType === "expression" &&
        parentBlockModel?.children?.[0] === blockModel) ||
      (operandType === "left" &&
        parentBlockModel?.children?.[0] === blockModel) ||
      (operandType === "right" &&
        parentBlockModel?.children?.[1] === blockModel) ||
      (operandType === "index" &&
        parentBlockModel?.children[0] === blockModel) ||
      (operandType === "value" && parentBlockModel?.children[1] === blockModel)
    ) {
      return;
    }

    blockModel.removeFromParent(parentBlockModel);
    this.insertChildIntoParent(newParent, blockModel, operandType);
  }
}

export let program = new Program();
