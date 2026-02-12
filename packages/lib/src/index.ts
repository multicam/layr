/**
 * Standard Library
 * 97 formulas + 19 actions
 */

import type { FormulaContext } from '@layr/core';

// Array formulas
export { map } from './formulas/array/map';
export { filter } from './formulas/array/filter';
export { reduce } from './formulas/array/reduce';
export { find } from './formulas/array/find';
export { first } from './formulas/array/first';
export { last } from './formulas/array/last';
export { append } from './formulas/array/append';
export { prepend } from './formulas/array/prepend';

// String formulas
export { concatenate } from './formulas/string/concatenate';
export { lowercase } from './formulas/string/lowercase';
export { uppercase } from './formulas/string/uppercase';
export { split } from './formulas/string/split';
export { join } from './formulas/string/join';

// Number formulas
export { add } from './formulas/number/add';
export { subtract } from './formulas/number/subtract';
export { multiply } from './formulas/number/multiply';
export { divide } from './formulas/number/divide';

// Logic formulas
export { equals } from './formulas/logic/equals';
export { not } from './formulas/logic/not';
export { boolean } from './formulas/logic/boolean';

// Object formulas
export { get } from './formulas/object/get';
export { set } from './formulas/object/set';
export { keys } from './formulas/object/keys';

// Formula registry
export const formulas: Record<string, Function> = {};
