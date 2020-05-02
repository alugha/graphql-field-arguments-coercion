import {GraphQLField, getNullableType, isInputObjectType, isScalarType } from "graphql";
import { Coercer, CoercibleGraphQLArgument, CoercibleGraphQLInputField, CoercibleGraphQLInputObjectType } from "./types";
import { forEach } from "./utils";

/**
 * Default coerce function.
 */
export const defaultCoercer = async <T>(value: T) => value;

/**
 * Coerce the given argument values for the given field and
 * returm the coerced argument.
 * 
 * Will browse through all the Argument, the InputObject
 * and InputField and run the coerce functions.
 *
 * If coercers throw errors, they'll be called on `onError`.
 */
export const coerceFieldArgumentsValues = async (
  field: GraphQLField<any, any>,
  values: { [key: string]: any },
  onError?: (error: Error) => void,
): Promise<{ [key: string]: any }> => {
  const coercedValues: { [key: string]: any } = {};
  
  await forEach(
    field.args || [],
    async (argDef: CoercibleGraphQLArgument
  ) => {
    const { name } = argDef;
    const argValue = values[name];
    if (!argValue) return;

    const coercedArgValue = await coerceArgumentValue(
      argDef,
      argValue,
      onError
    );

    coercedValues[name] = coercedArgValue
  });

  return coercedValues;
}

const coerceInputValue = async (
  def: CoercibleGraphQLInputObjectType,
  values: { [key: string]: any },
  onError?: (error: Error) => void,
) => {
  let coercedValues: { [key: string]: any } = {};
  const fields = def.getFields();

  await forEach(Object.values(fields), async (field: CoercibleGraphQLInputField) => {
    const { name } = field;

    const value = values[name];
    if (!value) return;

    try {
      coercedValues[name] = await coerceInputFieldValue(
        field,
        value,
        onError
      );
    } catch (e) {
      onError?.(e);
    }
  });

  const { coerce = defaultCoercer } = def;

  try {
    // @ts-ignore
    coercedValues = await coerce(coercedValues);
  } catch (e) {
    onError?.(e);
  }

  return coercedValues;
}

// coerceArgumentValue and coerceInputFieldValue share
// the same logic
const coerceArgumentValue = async (
  def: CoercibleGraphQLArgument,
  value: any,
  onError?: (error: Error) => void,
) => coerceInputFieldOrArgumentValue(
  def,
  value,
  onError
);

const coerceInputFieldValue = async (
  def: CoercibleGraphQLInputField,
  value: any,
  onError?: (error: Error) => void,
) => coerceInputFieldOrArgumentValue(
  def,
  value,
  onError,
);

const coerceInputFieldOrArgumentValue = async (
  def: CoercibleGraphQLInputField | CoercibleGraphQLArgument,
  value: any,
  onError?: (error: Error) => void,
) => {
  let coercedValue: any;

  const nullableType = getNullableType(def.type);

  if (isInputObjectType(nullableType)) {
    value = await coerceInputValue(
      nullableType,
      value,
      onError
    );
  }

  const { coerce = defaultCoercer } = def;
  try {
    coercedValue = await coerce(value);
  } catch (e) {
    onError?.(e);
  }

  return coercedValue;
}
