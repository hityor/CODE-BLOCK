import { program } from "./state.js";
import { validateAndRender } from "./ui.js";

export class DnD {
  constructor() {
    this.init();
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

  getDropIndex(zone, mouseY) {
    const elements = Array.from(zone.children);

    for (let i = 0; i < elements.length; i++) {
      const rect = elements[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (mouseY < mid) return i;
    }
    return elements.length;
  }

  makeDropZone(zone, place = program) {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();

      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;

      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];
        if (program.isStatementBlockType(blockType))
          e.dataTransfer.dropEffect = "copy";
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
        if (!program.isStatementBlockType(blockType)) return;

        const addIndex = this.getDropIndex(zone, e.clientY);
        program.putBlock(place, blockType, addIndex);
        validateAndRender();
      } else if (data.startsWith("move:")) {
        const blockId = parseInt(data.split(":")[1], 10);
        const newIndex = this.getDropIndex(zone, e.clientY);
        program.moveStatementBlock(blockId, place, newIndex);
        validateAndRender();
      }
    });
  }

  makeElseDropZone(zone, place = program) {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();

      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;

      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];
        if (program.isStatementBlockType(blockType))
          e.dataTransfer.dropEffect = "copy";
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
        if (!program.isStatementBlockType(blockType)) return;

        const addIndex = this.getDropIndex(zone, e.clientY);
        program.putElseBlock(place, blockType, addIndex);
        validateAndRender();
      } else if (data.startsWith("move:")) {
        const blockId = parseInt(data.split(":")[1], 10);
        const newIndex = this.getDropIndex(zone, e.clientY);
        program.moveStatementBlockToElse(blockId, place, newIndex);
        validateAndRender();
      }
    });
  }

  makeExpressionDragOver(e) {
    e.preventDefault();

    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    if (data.startsWith("add:")) {
      const blockType = data.split(":")[1];
      if (
        blockType === "arith" ||
        blockType === "varGet" ||
        blockType === "arrayGet"
      )
        e.dataTransfer.dropEffect = "copy";
    } else if (data.startsWith("move:")) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  makeExpressionDropZone(zone, parent, operandType) {
    zone.addEventListener("dragover", (e) => this.makeExpressionDragOver(e));

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;

      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];

        if (
          blockType === "arith" ||
          blockType === "varGet" ||
          blockType === "arrayGet"
        ) {
          const newBlock = program.createBlockByType(blockType);

          program.insertChildIntoParent(parent, newBlock, operandType);
          validateAndRender();
        }
      } else if (data.startsWith("move:")) {
        const blockId = parseInt(data.split(":")[1], 10);
        program.moveBlockToParent(blockId, parent, operandType);
        validateAndRender();
      }
    });
  }

  makeConditionDropZone(zone, parent) {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;
      if (data.startsWith("add:")) {
        const blockType = data.split(":")[1];
        if (blockType === "compare") {
          e.dataTransfer.dropEffect = "copy";
        }
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
        if (blockType !== "compare") return;

        parent.conditionChild = program.createBlockByType(blockType);
        validateAndRender();
      } else if (data.startsWith("move:")) {
        const blockId = parseInt(data.split(":")[1], 10);
        const location = program.findBlockWithParentById(blockId);

        if (!location) return;

        const { blockModel } = location;

        if (blockModel.type !== "compare") return;

        if (blockModel.hasDescendant(parent.id)) return;

        blockModel.removeFromParent(location.parentBlockModel);

        parent.conditionChild = blockModel;
        validateAndRender();
      }
    });
  }
}
