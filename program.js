import * as Models from "./blockModels.js";

class Program {
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
      blockType === "arrayGet" ||
      blockType === "compare" ||
      blockType === "boolean" ||
      blockType === "logic" ||
      blockType === "not"
    );
  }

  isLogicalBlockType(blockType) {
    return (
      blockType === "compare" ||
      blockType === "boolean" ||
      blockType === "logic" ||
      blockType === "not"
    );
  }

  createBlockByType(blockType, assignId = true) {
    blockType = blockType[0].toUpperCase() + blockType.slice(1);
    let newBlockModel = new Models[`${blockType}`]();

    if (newBlockModel && assignId) newBlockModel.id = this.generateId();

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
      if (key === "type" || key === "getView") continue;

      if (value.type) {
        block[key] = this.deserializeBlock(value);
      } else if (Array.isArray(value)) {
        block[key] = value.map((item) =>
          item && item.type ? this.deserializeBlock(item) : item,
        );
      } else block[key] = value;
    }

    return block;
  }

  normalizeIndex(index, length) {
    return Math.max(0, Math.min(index, length));
  }

  canInsertExpressionIntoParent(parentBlock, operandType) {
    if (operandType === "condition")
      return parentBlock.type === "if" || parentBlock.type === "while";

    if (parentBlock.type === "logic")
      return operandType === "left" || operandType === "right";

    if (parentBlock.type === "not") return operandType === "operand";

    if (operandType === "expression" && parentBlock.type === "assign")
      return true;

    if (parentBlock.type === "arith")
      return operandType === "left" || operandType === "right";
    if (parentBlock.type === "compare")
      return operandType === "left" || operandType === "right";

    if (parentBlock.type === "arrayGet" || parentBlock.type === "arraySet")
      return (
        operandType === "index" ||
        (parentBlock.type === "arraySet" && operandType === "value")
      );

    return false;
  }

  canInsertBlockType(blockType, parentBlock, operandType) {
    if (parentBlock.type === "logic" || parentBlock.type === "not") {
      return this.isLogicalBlockType(blockType);
    }

    if (
      parentBlock.type === "arith" ||
      parentBlock.type === "assign" ||
      parentBlock.type === "arrayGet" ||
      parentBlock.type === "arraySet" ||
      parentBlock.type === "compare"
    ) {
      return (
        blockType === "arith" ||
        blockType === "varGet" ||
        blockType === "arrayGet"
      );
    }

    return false;
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

    if (currentBlock.conditionChild) {
      const found = this.findBlockWithParentById(
        targetBlockId,
        currentBlock.conditionChild,
        currentBlock,
      );
      if (found) return found;
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

  deleteBlock(blockId) {
  const location = this.findBlockWithParentById(blockId);
  if (!location) return false;

  const { blockModel, parentBlockModel } = location;
  if (!blockModel || !parentBlockModel) return false;

  return blockModel.removeFromParent(parentBlockModel);
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

    if (operandType === "condition" && !parentBlock.conditionChild) {
      parentBlock.conditionChild = newBlock;
      return true;
    }
    if (operandType === "operand" && !parentBlock.children[0]) {
      parentBlock.children[0] = newBlock;
      return true;
    }
    if (parentBlock.type === "logic" && !parentBlock.children[0]) {
      if (operandType === "left") {
        parentBlock.children[0] = newBlock;
        return true;
      }
      if (operandType === "right" && !parentBlock.children[1]) {
        parentBlock.children[1] = newBlock;
        return true;
      }
    }

    if (
      operandType === "expression" ||
      operandType === "left" ||
      operandType === "right" ||
      operandType === "index" ||
      operandType === "value"
    ) {
      const idx =
        operandType === "left" ||
        operandType === "index" ||
        operandType === "expression"
          ? 0
          : 1;
      if (!parentBlock.children[idx]) {
        parentBlock.children[idx] = newBlock;
        return true;
      }
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
      (operandType === "expression" && newParent.children[0] === blockModel) ||
      (operandType === "left" && newParent.children[0] === blockModel) ||
      (operandType === "right" && newParent.children[1] === blockModel) ||
      (operandType === "index" && newParent.children[0] === blockModel) ||
      (operandType === "value" && newParent.children[1] === blockModel) ||
      (operandType === "condition" && newParent.conditionChild === blockModel)
    ) {
      return;
    }

    if (operandType === "condition" && newParent.conditionChild === blockModel)
      return;
    if (operandType === "operand" && newParent.children[0] === blockModel)
      return;
    if (newParent.type === "logic") {
      if (operandType === "left" && newParent.children[0] === blockModel)
        return;
      if (operandType === "right" && newParent.children[1] === blockModel)
        return;
    }

    blockModel.removeFromParent(parentBlockModel);
    this.insertChildIntoParent(newParent, blockModel, operandType);
  }
}

export const program = new Program();
