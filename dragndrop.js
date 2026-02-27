const blockTools = document.querySelectorAll(".blockTool");

function getDropIndex(mouseY) {
  const elements = Array.from(programDiv.children);

  for (let i = 0; i < elements.length; i++) {
    const rect = elements[i].getBoundingClientRect();

    if (rect.top < mouseY && mouseY < rect.top + rect.height) return i;
  }
  return elements.length;
}

blockTools.forEach((item) => {
  item.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", "add:" + item.id);
  });
});

programDiv.addEventListener("dragover", (e) => {
  e.preventDefault();

  const data = e.dataTransfer.getData("text/plain");

  if (data && data.startsWith("add:")) e.dataTransfer.dropEffect = "copy";
  else if (data && data.startsWith("move:")) e.dataTransfer.dropEffect = "move";
});

programDiv.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const data = e.dataTransfer.getData("text/plain");
  if (!data) return;

  if (data.startsWith("add:")) {
    // Создание нового блока
    const blockType = data.split(":")[1];
    if (blockType === "varDecl") {
      createVarBlock();
    } else if (blockType === "assign") {
      createAssignBlock();
    }

    run();
  } else if (data.startsWith("move:")) {
    // Перемещение существующего блока
    const blockId = parseInt(data.split(":")[1], 10);
    const oldIndex = program.findIndex((b) => b.id === blockId);
    if (oldIndex === -1) return;

    const blockObj = program[oldIndex];
    const element = domById.get(blockObj.id).block;
    if (!element) return;

    let newIndex = getDropIndex(e.clientY);

    if (newIndex >= oldIndex) ++newIndex;

    program.splice(oldIndex, 1);

    program.splice(newIndex, 0, blockObj);

    if (newIndex >= programDiv.children.length) programDiv.appendChild(element);
    else programDiv.insertBefore(element, programDiv.children[newIndex]);

    run();
  }
});

document.addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
});
