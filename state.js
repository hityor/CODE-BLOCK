export const program = [];
export let nextId = 1;

export function makeOperandModel() {
  return { kind: "const", value: "0", variable: "" };
}

export function makeVarDeclModel() {
  return { id: nextId++, type: "varDecl", raw: "", errors: [] };
}

function makeAssignModel() {
  return {
    id: nextId++,
    type: "assign",
    variable: "",
    expression: {
      mode: "single",
      operator: "+",
      left: makeOperandModel(),
      right: makeOperandModel(),
    },
    errors: [],
  };
}

export function addBlock(blockType) {
  if (blockType === "varDecl") program.push(makeVarDeclModel());
  else if (blockType == "assign") program.push(makeAssignModel());
}

export function moveBlockById(blockId, newIndex) {
  const oldIndex = program.findIndex((b) => b.id === blockId);
  if (oldIndex === -1) return;

  newIndex = Math.max(0, Math.min(newIndex, program.length));

  if (newIndex === oldIndex) return;

  const [blockObj] = program.splice(oldIndex, 1);
  if (newIndex > oldIndex) newIndex--;
  program.splice(newIndex, 0, blockObj);
}