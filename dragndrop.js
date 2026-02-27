const blockTools = document.querySelectorAll(".blockTool");

function getDropIndex(mouseY) {
  const elements = Array.from(programDiv.children);

  for (let i = 0; i < elements.length; i++) {
    const rect = elements[i].getBoundingClientRect();

    const mid = rect.top + rect.height / 2
    if (mouseY < mid) return i
  }
  return elements.length;
}

function moveBlockById(blockId, newIndex) {
  const oldIndex = program.findIndex((b) => b.id === blockId);
  if (oldIndex === -1) return;

  newIndex = Math.max(0, Math.min(newIndex, program.length));

  if (newIndex === oldIndex) return;

  const [blockObj] = program.splice(oldIndex, 1);
  if (newIndex > oldIndex) newIndex--;
  program.splice(newIndex, 0, blockObj);
  touch();
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
    const blockType = data.split(":")[1];
    addBlock(blockType);
  } else if (data.startsWith("move:")) {
    const blockId = parseInt(data.split(":")[1], 10);
    let newIndex = getDropIndex(e.clientY);
    moveBlockById(blockId, newIndex);
  }
});

document.addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
});
