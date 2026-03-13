import { Views } from "./blockViews.js";

export class Operand {
  constructor() {
    this.value = "";
  }
}

export class Block {
  constructor(type) {
    this.id = -1;
    this.type = type;
    this.children = [];
    this.errors = [];

    this.getView = Views[`${this.type}View`];
  }

  getAllChildren() {
    const children = [];

    if (Array.isArray(this.children)) {
      for (const child of this.children) if (child) children.push(child);
    }
    if (this.conditionChild) children.push(this.conditionChild);
    if (Array.isArray(this.elseChildren)) {
      for (const child of this.elseChildren) if (child) children.push(child);
    }

    return children;
  }

  hasDescendant(targetId) {
    for (const child of this.getAllChildren()) {
      if (child.id === targetId) return true;
      if (child.hasDescendant(targetId)) return true;
    }
    return false;
  }

  removeFromParent(parent) {
    if (!parent) return false;
    if (parent.conditionChild === this) {
      parent.conditionChild = null;
      return true;
    }

    if (Array.isArray(parent.children)) {
      const idx = parent.children.indexOf(this);
      if (idx !== -1) {
        parent.children.splice(idx, 1);
        return true;
      }
    }

    if (Array.isArray(parent.elseChildren)) {
      const idx = parent.elseChildren.indexOf(this);
      if (idx !== -1) {
        parent.elseChildren.splice(idx, 1);
        return true;
      }
    }
    return false;
    }

  hasDescendant(targetId) {
    for (const child of this.getAllChildren()) {
      if (child.id === targetId) return true;
      if (child.hasDescendant(targetId)) return true;
    }
    return false;
  }

  serialize() {
    const obj = {
      id: this.id,
      type: this.type,
    };

    for (const key of Object.keys(this)) {
      if (
        key === "id" ||
        key === "type" ||
        key === "getView" ||
        typeof this[key] === "function"
      )
        continue;

      const value = this[key];

      if (value instanceof Block) {
        obj[key] = value.serialize();
      } else if (Array.isArray(value)) {
        obj[key] = value.map((item) =>
          item instanceof Block ? item.serialize() : item,
        );
      } else if (
        value &&
        value.constructor &&
        value.constructor.name === "Operand"
      ) {
        obj[key] = {
          value: value.value,
          variable: value.variable,
        };
      } else {
        obj[key] = value;
      }
    }

    return obj;
  }
}

export class VarDecl extends Block {
  constructor() {
    super("varDecl");
    this.rawNames = "";
  }
}

export class Assign extends Block {
  constructor() {
    super("assign");
    this.variable = "";
    this.expression = new Operand();
  }
}

export class VarGet extends Block {
  constructor() {
    super("varGet");
    this.variable = "";
  }
}

export class ArrayDecl extends Block {
  constructor() {
    super("arrayDecl");
    this.name = "";
    this.size = "";
  }
}

export class ArrayGet extends Block {
  constructor() {
    super("arrayGet");
    this.arrayName = "";
    this.index = new Operand();
  }
}

export class ArraySet extends Block {
  constructor() {
    super("arraySet");
    this.arrayName = "";
    this.index = new Operand();
    this.value = new Operand();
  }
}

export class Arith extends Block {
  constructor() {
    super("arith");
    this.operator = "+";
    this.left = new Operand();
    this.right = new Operand();
  }
}

export class Compare extends Block {
  constructor() {
    super("compare");
    this.operator = ">";
    this.left = new Operand();
    this.right = new Operand();
  }
}

export class If extends Block {
  constructor() {
    super("if");
    this.conditionChild = null;
    this.elseChildren = [];
  }
}

export class While extends Block {
  constructor() {
    super("while");
    this.conditionChild = null;
  }
}

export class Boolean extends Block {
  constructor() {
    super("boolean");
    this.value = true;
  }
}

export class Logic extends Block {
  constructor() {
    super("logic");
    this.operator = "&&";
  }
}

export class Not extends Block {
  constructor() {
    super("not");
  }
}
