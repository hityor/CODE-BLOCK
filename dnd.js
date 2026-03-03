import {
  program,
  putBlock,
  moveBlockById,
  makeArithmeticModel,
  insertChildIntoParent,
  moveBlockToParent,
} from "./state.js";

export class DnD {
  constructor(programDiv, touch) {
    this.programDiv = programDiv;
    this.touch = touch;
  }

  getDropIndex(mouseY) {
    const elements = Array.from(this.programDiv.children);

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

  makeDropZone(zone) {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();

      const data = e.dataTransfer.getData("text/plain");

      if (data && data.startsWith("add:")) e.dataTransfer.dropEffect = "copy";
      else if (data && data.startsWith("move:"))
        e.dataTransfer.dropEffect = "move";
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;

      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];
        let addIndex = this.getDropIndex(e.clientY);
        putBlock(program, blockType, addIndex);
        this.touch();
      } else if (data.startsWith("move:")) {
        const blockId = parseInt(data.split(":")[1], 10);
        let newIndex = this.getDropIndex(e.clientY);
        moveBlockById(blockId, newIndex);
        this.touch();
      }
    });
  }

  makeArithDropZone(zone, parent, operandType) {
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;

      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];
        const newBlock = makeArithmeticModel();
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
