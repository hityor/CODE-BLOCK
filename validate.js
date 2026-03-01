import { parseNames, isValidVarName } from "./utils.js";

function validateOperand(operand, declared, errors, sideName) {
  if (operand.kind === "const") {
    const n = Number(operand.value);
    if (operand.value === "") errors.push(`Пустое ${sideName} значение`);
    else if (Number.isNaN(n)) errors.push(`${sideName} должно быть числом`);
    else if (!Number.isInteger(n)) errors.push(`${sideName} должно быть целым`);
    return;
  }

  if (!operand.variable) {
    errors.push(`Не выбрана ${sideName} переменная`);
    return;
  }

  if (!declared.has(operand.variable)) {
    errors.push(`Не объявлена ${sideName} переменная: ${operand.variable}`);
  }
}

export function validateProgram(program) {
  const errorsById = new Map();
  const declared = new Set();

  for (const block of program) {
    const errors = [];

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

      validateOperand(block.expression.left, declared, errors, "left");

      if (block.expression.mode === "binary") {
        validateOperand(block.expression.right, declared, errors, "right");

        if (
          (block.expression.operator === "/" ||
            block.expression.operator === "%") &&
          block.expression.right.kind === "const"
        ) {
          const rightValue = Number(block.expression.right.value);
          if (!Number.isNaN(rightValue) && rightValue === 0) {
            errors.push("Деление на ноль");
          }
        }
      } else if (block.expression.mode !== "single") {
        errors.push("Некорректный режим выражения");
      }
    }

    errorsById.set(block.id, errors);
  }

  return errorsById;
}
