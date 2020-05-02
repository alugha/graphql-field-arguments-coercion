import { GraphQLField, getNullableType, isInputObjectType } from "graphql";
import { Coercer, CoercibleGraphQLArgument, CoercibleGraphQLInputField } from "./types";

export const defaultCoercer = <T>(value: T) => value;


export const coerceFieldArgumentsValues = (
  field: GraphQLField<any, any>,
  argumentValues: { [key: string]: any },
  onError: (error: Error) => void,
): { [key: string]: any } => {
  const coercedValues: { [key: string]: any } = {};
  const { args: argDefs } = field;
  if (!argDefs) return coercedValues;

  for (let _argDef of argDefs) {
    const argDef = _argDef as CoercibleGraphQLArgument;

    const { name } = argDef;
    const argValue = argumentValues[name];
    let coercedArgValue: { [key: string]: any };

    if (!argValue) continue;

    const nullableType = getNullableType(argDef.type);

    if (isInputObjectType(nullableType)) {
      coercedArgValue = {};
      const fields = nullableType.getFields();
      for (let _field of Object.values(fields)) {
        const field = _field as CoercibleGraphQLInputField;

        // todo check for types other than Scalar
        if (field.type) {

        }
        const fieldValue = argValue[field.name];
        if (!fieldValue) continue;
        const { coerce = defaultCoercer } = field;
        try {
          coercedArgValue[field.name] = coerce(fieldValue)
        } catch (e) {
          onError(e);
        }
      }
    } else {
      throw new Error('not implemented');
    }

    coercedValues[name] = coercedArgValue
  }
  return argumentValues;
}