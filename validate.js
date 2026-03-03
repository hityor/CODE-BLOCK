import { parseNames, isValidVarName } from "./utils.js";

function validateAssign(assign, declared, errors) {
  if (assign.children[0]) return;

  const n = Number(assign.expression.value);
  if (assign.expression.value === "")
    errors.push(`Пустое присваиваемое значение`);
  else if (Number.isNaN(n))
    errors.push(`Присваиваемое значение должно быть числом`);
  else if (!Number.isInteger(n))
    errors.push(`Присваиваемое значение должно быть целым числом`);

  // if (!operand.variable) {
  //   errors.push(`Не выбрана переменная`);
  //   return;
  // }

  // if (!declared.has(operand.variable)) {
  //   errors.push(`Не объявлена ${operandSide} переменная: ${operand.variable}`);
  // }
}

function validateArithOperand(operand, errors, operandSide) {
  const n = Number(operand.value);
  if (operand.value === "") errors.push(`Пустой ${operandSide} операнд`);
  else if (Number.isNaN(n))
    errors.push(`${operandSide} операнд должен быть числом`);
  else if (!Number.isInteger(n))
    errors.push(`${operandSide} должен быть целым числом`);
}

function validateBlock(block, declared, errorsById) {
  for (const child of block.children)
    if (child) validateBlock(child, declared, errorsById);
  let errors = [];

  if (block.type === "varDecl") {
    const names = parseNames(block.raw);
    for (const name of names)
      if (!isValidVarName(name)) errors.push(`Некорректное имя: ${name}`);
      else if (declared.has(name)) errors.push(`Дубликат: ${name}`);
      else declared.add(name);
  }

  if (block.type === "assign") {
    if (!block.variable) errors.push("Не выбрана переменная");
    else if (!declared.has(block.variable))
      errors.push(`Не объявлена: ${block.variable}`);

    validateAssign(block, declared, errors);
  }

  if (block.type === "arith") {
    validateArithOperand(block.left, errors, "левый");
    validateArithOperand(block.right, errors, "правый");

    if (block.operator === "/" || block.operator === "%") {
      const rightValue = Number(block.right.value);
      if (!Number.isNaN(rightValue) && rightValue === 0) {
        errors.push("Деление на ноль");
      }
    }
  }

  errorsById.set(block.id, errors);
}

export function validateProgram(program) {
  const errorsById = new Map();
  const declared = new Set();

  for (const block of program.children)
    validateBlock(block, declared, errorsById);

  return errorsById;
}
