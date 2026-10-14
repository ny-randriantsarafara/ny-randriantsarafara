export interface OperationOptions {
  [key: string]: OperationOptionValue;
}

export type OperationOptionValue =
  | string
  | number
  | boolean
  | null
  | OperationOptions
  | OperationOptionValue[];

export type OperationFields = {
  type: string;
  name: string;
  position_x: number;
  position_y: number;
  options: OperationOptions | null;
};

export function operationFieldsDiffer(
  current: OperationFields,
  declared: OperationFields
): boolean {
  return (
    current.type !== declared.type ||
    current.name !== declared.name ||
    current.position_x !== declared.position_x ||
    current.position_y !== declared.position_y ||
    optionsJson(current.options) !== optionsJson(declared.options)
  );
}

function optionsJson(options: OperationOptions | null): string {
  return JSON.stringify(options ?? {});
}
