import { parseNames, isValidVarName } from "./utils.js";

const COMPARE_OPERATORS = new Set([">", "<", "==", "!=", ">=", "<="]);
const ARITH_OPERATORS = new Set(["+", "-", "*", "/", "%"]);

function validateIntegerOperand(operandModel, errors, operandSide) {
  const n = Number(operandModel.value);

  if (operandModel.value === "") {
    errors.push(`${operandSide}: пустой операнд`);
    return;
  }

  if (Number.isNaN(n)) {
    errors.push(`${operandSide}: должно быть число`);
    return;
  }

  if (!Number.isInteger(n)) {
    errors.push(`${operandSide}: должно быть целое число`);
  }
}

function validateBoolean(blockModel, errors) {
  if (blockModel.value === undefined) {
    errors.push("Значение не выбрано");
  }
}

function validateLogic(blockModel, scope, errorsById, errors) {
  if (
    !blockModel.operator ||
    (blockModel.operator !== "&&" && blockModel.operator !== "||")
  ) {
    errors.push("Неизвестный логический оператор");
  }
  if (blockModel.children[0]) {
    validateLogicalExpression(blockModel.children[0], scope, errorsById);
  } else {
    errors.push("Левый операнд отсутствует");
  }
  if (blockModel.children[1]) {
    validateLogicalExpression(blockModel.children[1], scope, errorsById);
  } else {
    errors.push("Правый операнд отсутствует");
  }
}

function validateNot(blockModel, scope, errorsById, errors) {
  if (blockModel.children[0]) {
    validateLogicalExpression(blockModel.children[0], scope, errorsById);
  } else {
    errors.push("Операнд отсутствует");
  }
}

function validateLogicalExpression(blockModel, scope, errorsById) {
  if (blockModel.type === "compare") {
    validateCompare(blockModel, scope, errorsById);
  } else if (blockModel.type === "boolean") {
    const errors = [];
    validateBoolean(blockModel, errors);
    errorsById.set(blockModel.id, errors);
  } else if (blockModel.type === "logic") {
    const errors = [];
    validateLogic(blockModel, scope, errorsById, errors);
    errorsById.set(blockModel.id, errors);
  } else if (blockModel.type === "not") {
    const errors = [];
    validateNot(blockModel, scope, errorsById, errors);
    errorsById.set(blockModel.id, errors);
  } else {
    const errors = [
      `Блок "${blockModel.type}" нельзя использовать как логическое выражение`,
    ];
    errorsById.set(blockModel.id, errors);
  }
}

function validateOperand(
  childBlock,
  operandModel,
  scope,
  errorsById,
  errors,
  side,
) {
  if (childBlock) {
    validateExpressionBlock(childBlock, scope, errorsById);
  } else {
    validateIntegerOperand(operandModel, errors, side);
  }
}

function validateExpressionBlock(blockModel, scope, errorsById) {
  const errors = [];

  if (
    blockModel.type === "boolean" ||
    blockModel.type === "logic" ||
    blockModel.type === "not"
  ) {
    errors.push(
      `Блок "${blockModel.type}" нельзя использовать в арифметическом выражении`,
    );
    errorsById.set(blockModel.id, errors);
    return;
  }

  if (blockModel.type === "varGet") {
    if (!blockModel.variable) {
      errors.push("Переменная не выбрана");
    } else if (!scope.has(blockModel.variable)) {
      errors.push(`Переменная не объявлена: ${blockModel.variable}`);
    }

    errorsById.set(blockModel.id, errors);
    return;
  }

  if (blockModel.type === "arith") {
    validateOperand(
      blockModel.children[0],
      blockModel.left,
      scope,
      errorsById,
      errors,
      "Левый",
    );
    validateOperand(
      blockModel.children[1],
      blockModel.right,
      scope,
      errorsById,
      errors,
      "Правый",
    );

    if (!ARITH_OPERATORS.has(blockModel.operator)) {
      errors.push(
        `Неизвестный арифметический оператор: ${blockModel.operator}`,
      );
    }

    if (
      (blockModel.operator === "/" || blockModel.operator === "%") &&
      !blockModel.children[1]
    ) {
      const rightValue = Number(blockModel.right.value);
      if (!Number.isNaN(rightValue) && rightValue === 0) {
        errors.push("Деление на ноль");
      }
    }

    errorsById.set(blockModel.id, errors);
    return;
  }

  if (blockModel.type === "arrayGet") {
    validateArrayGet(blockModel, scope, errorsById);
    return;
  }

  errors.push(`Блок "${blockModel.type}" нельзя использовать как выражение`);
  errorsById.set(blockModel.id, errors);
}

function validateVarDecl(blockModel, scope, errors) {
  const names = parseNames(blockModel.rawNames);
  if (names.length === 0) errors.push("Объявление переменной пустое");

  const localScope = new Set();
  for (const name of names) {
    if (!isValidVarName(name)) {
      errors.push(`Некорректное имя переменной: ${name}`);
    } else if (localScope.has(name)) {
      errors.push(`Дубликат переменной в объявлении: ${name}`);
    } else if (scope.has(name)) {
      errors.push(`Переменная уже объявлена в другом блоке: ${name}`);
    } else {
      localScope.add(name);
    }
  }

  for (const name of localScope) {
    scope.add(name);
  }
}

function validateAssign(blockModel, scope, errorsById, errors) {
  if (!blockModel.variable) {
    errors.push("Переменная для присваивания не выбрана");
  } else if (!scope.has(blockModel.variable)) {
    errors.push(`Переменная не объявлена: ${blockModel.variable}`);
  }

  if (blockModel.children[0]) {
    validateExpressionBlock(blockModel.children[0], scope, errorsById);
  } else {
    validateIntegerOperand(
      blockModel.expression,
      errors,
      "Присваиваемое значение",
    );
  }
}

function validateCompare(blockModel, scope, errorsById) {
  const errors = [];

  validateOperand(
    blockModel.children[0],
    blockModel.left,
    scope,
    errorsById,
    errors,
    "Левый",
  );

  validateOperand(
    blockModel.children[1],
    blockModel.right,
    scope,
    errorsById,
    errors,
    "Правый",
  );

  if (!COMPARE_OPERATORS.has(blockModel.operator)) {
    errors.push(`Неизвестный оператор сравнения: ${blockModel.operator}`);
  }

  errorsById.set(blockModel.id, errors);
}

function validateArrayDecl(blockModel, scope, errors) {
  if (!blockModel.name) {
    errors.push("Имя массива не задано");
  } else if (!isValidVarName(blockModel.name)) {
    errors.push(`Некоррктное имя массива: ${blockModel.name}`);
  } else if (scope.has(blockModel.name)) {
    errors.push(`Имя уже занято: ${blockModel.name}`);
  } else {
    scope.add(blockModel.name);
  }

  if (blockModel.size === "") {
    errors.push("Размер массива не задан");
    return;
  }

  const n = Number(blockModel.size);

  if (Number.isNaN(n)) {
    errors.push("Размер массива должен быть числом");
    return;
  }

  if (!Number.isInteger(n)) {
    errors.push("Размер массива должен быть целым числом");
    return;
  }

  if (n <= 0) {
    errors.push("Размер массива должен быть больше 0");
  }
}

function validateArrayGet(blockModel, scope, errorsById) {
  const errors = [];

  if (!blockModel.arrayName) {
    errors.push("Массив не выбран");
  } else if (!scope.has(blockModel.arrayName)) {
    errors.push(`Массив не объявлен: ${blockModel.arrayName}`);
  }

  validateOperand(
    blockModel.children[0],
    blockModel.index,
    scope,
    errorsById,
    errors,
    "Индекс",
  );

  errorsById.set(blockModel.id, errors);
}

function validateArraySet(blockModel, scope, errorsById, errors) {
  if (!blockModel.arrayName) {
    errors.push("Массив не выбран");
  } else if (!scope.has(blockModel.arrayName)) {
    errors.push(`Массив не объявлен: ${blockModel.arrayName}`);
  }

  validateOperand(
    blockModel.children[0],
    blockModel.index,
    scope,
    errorsById,
    errors,
    "Индекс",
  );
  validateOperand(
    blockModel.children[1],
    blockModel.value,
    scope,
    errorsById,
    errors,
    "Значение",
  );
}

function validateIf(blockModel, scope, errorsById, errors) {
  const childScope = new Set(scope);
  if (!blockModel.conditionChild) {
    errors.push("Условие не задано");
  } else {
    validateLogicalExpression(
      blockModel.conditionChild,
      childScope,
      errorsById,
    );
  }
  for (const child of blockModel.children) {
    validateStatementBlock(child, childScope, errorsById);
  }
  for (const child of blockModel.elseChildren) {
    validateStatementBlock(child, childScope, errorsById);
  }
}

function validateWhile(blockModel, scope, errorsById, errors) {
  const childScope = new Set(scope);
  if (!blockModel.conditionChild) {
    errors.push("Условие не задано");
  } else {
    validateLogicalExpression(
      blockModel.conditionChild,
      childScope,
      errorsById,
    );
  }
  for (const child of blockModel.children) {
    validateStatementBlock(child, childScope, errorsById);
  }
}

function validateStatementBlock(blockModel, scope, errorsById) {
  const errors = [];

  if (blockModel.type === "varDecl") validateVarDecl(blockModel, scope, errors);
  else if (blockModel.type === "assign")
    validateAssign(blockModel, scope, errorsById, errors);
  else if (blockModel.type === "arrayDecl")
    validateArrayDecl(blockModel, scope, errors);
  else if (blockModel.type === "arraySet")
    validateArraySet(blockModel, scope, errorsById, errors);
  else if (blockModel.type === "if")
    validateIf(blockModel, scope, errorsById, errors);
  else if (blockModel.type === "while")
    validateWhile(blockModel, scope, errorsById, errors);
  else errors.push(`Неизвестный тип блока: ${blockModel.type}`);

  errorsById.set(blockModel.id, errors);
}

export function validateProgram(program) {
  const errorsById = new Map();
  const scope = new Set();

  for (const blockModel of program.children) {
    validateStatementBlock(blockModel, scope, errorsById);
  }
  return errorsById;
}
