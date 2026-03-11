import { program } from "./state.js";
import { viewById } from "./blocksView.js";
import { validateProgram } from "./validate.js";
import { renderProgram } from "./render.js";
import { runProgram } from "./engine.js";
import { DnD } from "./dnd.js";

export const programCanvasEl = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const fileInput = document.getElementById("fileInput");
const memoryView = document.getElementById("logContent");
export const dnd = new DnD();

function getChildBlocks(blockModel) {
  const children = [];

  if (blockModel.type === "assign") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
  }

  if (blockModel.type === "arith") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
    if (blockModel.children[1]) children.push(blockModel.children[1]);
  }

  if (blockModel.type === "arrayGet") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
  }

  if (blockModel.type === "arraySet") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
    if (blockModel.children[1]) children.push(blockModel.children[1]);
  }

  if (blockModel.type === "compare") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
    if (blockModel.children[1]) children.push(blockModel.children[1]);
  }

  if (blockModel.type === "if") {
    if (blockModel.conditionChild) children.push(blockModel.conditionChild);

    for (const child of blockModel.children) children.push(child);
    for (const child of blockModel.elseChildren) children.push(child);
  }

  if (blockModel.type === "while") {
    if (blockModel.conditionChild) children.push(blockModel.conditionChild);

    for (const child of blockModel.children) children.push(child);
  }

  return children;
}

function walkBlockTree(blockModel, visit) {
  visit(blockModel);

  for (const child of getChildBlocks(blockModel)) {
    walkBlockTree(child, visit);
  }
}

function walkProgramTree(visit) {
  for (const blockModel of program.children) walkBlockTree(blockModel, visit);
}

runBtn.addEventListener("click", function () {
  runProgram(program, {
    validateAndStoreErrors,
    render: renderProgram,
    appendLogs,
    renderMemory,
    memoryView,
  });
});

saveBtn.addEventListener("click", function () {
  const programJSON = JSON.stringify(program, null, 2);
  const programFile = new Blob([programJSON], { type: "application/json" });
  const fileDownloadURl = URL.createObjectURL(programFile);

  const fileDownloadLink = document.createElement("a");
  fileDownloadLink.href = fileDownloadURl;
  fileDownloadLink.download = "program.json";

  document.body.appendChild(fileDownloadLink);
  fileDownloadLink.click();
  document.body.removeChild(fileDownloadLink);

  URL.revokeObjectURL(fileDownloadURl);
});

loadBtn.addEventListener("click", function () {
  document.getElementById("fileInput").click();
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const loadedProgramJSON = e.target.result;
    program.children = JSON.parse(loadedProgramJSON).children;
    program.nextId = JSON.parse(loadedProgramJSON).nextId;

    viewById.clear();
    programCanvasEl.innerHTML = "";
    validateAndRender();
  };

  reader.readAsText(file);
});

function validateAndStoreErrors() {
  const errorsById = validateProgram(program);
  walkProgramTree((blockModel) => {
    blockModel.errors = errorsById.get(blockModel.id) ?? [];
  });
}

export function validateAndRender() {
  validateAndStoreErrors();
  renderProgram(program, programCanvasEl);
}

function renderMemory(memory, memoryView) {
  for (const [varName, varValue] of memory) {
    const item = document.createElement("div");
    item.innerHTML = `<b>${varName}</b>: <b>${varValue}</b>`;
    memoryView.appendChild(item);
  }
}

function appendLogs(text) {
  const item = document.createElement("div");
  item.innerHTML = text;
  memoryView.appendChild(item);
}

export function initUI() {
  dnd.makeDropZone(programCanvasEl, program);
  validateAndStoreErrors();
  renderProgram(program, programCanvasEl);
}
