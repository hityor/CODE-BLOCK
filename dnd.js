import {
  program,
  putBlock,
  moveStatementBlock,
  makeArithmeticModel,
  makeVarGetModel,
  moveBlockToParent,
  insertChildIntoParent,
  isStatementBlockType,
} from "./state.js";

export class DnD {
  constructor(programDiv, touch) {
    this.programDiv = programDiv;
    this.touch = touch;
  }

  getDropIndex(zone, mouseY) {
    const elements = Array.from(zone.children);

    for (let i = 0; i < elements.length; i++) {
      const rect = elements[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (mouseY < mid) return i;
    }
    return elements.length;
  }

  init() {
    const blockTools = document.querySelectorAll(".blockTool");
    blockTools.forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", "add:" + item.id);
      });
    });

    document.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    document.addEventListener("drop", (e) => {
      e.preventDefault();
    });
  }

  makeDropZone(zone, place = program) {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();

      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;

      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];
        if (isStatementBlockType(blockType)) e.dataTransfer.dropEffect = "copy";
      } else if (data.startsWith("move:")) {
        e.dataTransfer.dropEffect = "move";
      }
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;

      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];
        if (!isStatementBlockType(blockType)) return;

        const addIndex = this.getDropIndex(zone, e.clientY);
        putBlock(place, blockType, addIndex);
        this.touch();
      } else if (data.startsWith("move:")) {
        const blockId = parseInt(data.split(":")[1], 10);
        const newIndex = this.getDropIndex(zone, e.clientY);
        moveStatementBlock(blockId, place, newIndex);
        this.touch();
      }
    });
  }

  makeExpressionDragOver(zone, e) {
    e.preventDefault();

    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    if (data.startsWith("add:")) {
      const blockType = data.split(":")[1];
      if (blockType === "arith" || blockType === "varGet")
        e.dataTransfer.dropEffect = "copy";
    } else if (data.startsWith("move:")) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  makeArithDropZone(zone, parent, operandType) {
    zone.addEventListener("dragover", (e) => this.makeExpressionDragOver(zone, e));

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;

      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];

        let newBlock;
        switch (blockType) {
          case "arith":
            newBlock = makeArithmeticModel();
            break;
          case "varGet":
            newBlock = makeVarGetModel();
            break;
          default:
            return;
        }

        insertChildIntoParent(parent, newBlock, operandType);
        this.touch();
      } else if (data.startsWith("move:")) {
        const blockId = parseInt(data.split(":")[1], 10);
        moveBlockToParent(blockId, parent, operandType);
        this.touch();
      }
    });
  }
}
