import { program } from "./program.js";
import { viewById } from "./blockViews.js";
import { validateProgram } from "./validate.js";
import { renderProgram, ensureNamesSelected } from "./render.js";
import { runProgram } from "./engine.js";
import { DnD } from "./dnd.js";
import { walkProgramTree } from "./utils.js";

export const programCanvasEl = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const fileInput = document.getElementById("fileInput");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");
const trashZone = document.getElementById("trashZone");
const logView = document.getElementById("logContent");
const memoryView = document.getElementById("memoryContent");
export const dnd = new DnD();

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
  const programJSON = JSON.stringify(program.serialize(), null, 2);
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
    const loadedData = JSON.parse(loadedProgramJSON);

    program.deserialize(loadedData);

    viewById.clear();
    programCanvasEl.innerHTML = "";
    validateAndRender();
  };

  reader.readAsText(file);
});

clearCanvasBtn.addEventListener("click", () => {
  if (!confirm("Вы действительно хотите очистить содержимое программы?"))
    return;

  program.children = [];
  program.nextId = 1;
  viewById.clear();

  memoryView.innerHTML = "";
  logView.innerHTML = "";

  validateAndRender();
});

function validateAndStoreErrors() {
  ensureNamesSelected();
  const errorsById = validateProgram(program);
  walkProgramTree(program, (blockModel) => {
    blockModel.errors = errorsById.get(blockModel.id) ?? [];
  });
}

export function validateAndRender() {
  validateAndStoreErrors();
  renderProgram(program, programCanvasEl);
}

function renderMemory(memory, memoryView) {
  memoryView.innerHTML = "";

  for (const [varName, varValue] of memory) {
    const item = document.createElement("div");
    item.innerHTML = `<b>${varName}</b>: <b>${varValue}</b>`;
    memoryView.appendChild(item);
  }
}

function appendLogs(...texts) {
  for (const text of texts) {
    const item = document.createElement("div");
    item.innerHTML = text;
    logView.appendChild(item);
  }

  logView.scrollTop = logView.scrollHeight;
}

export function initUI() {
  dnd.makeDropZone(programCanvasEl, program);
  dnd.makeTrashDropZone(trashZone);
  validateAndStoreErrors();
  renderProgram(program, programCanvasEl);
}
