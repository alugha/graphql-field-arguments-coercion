import {GraphQLField, getNullableType, isInputObjectType, GraphQLResolveInfo, isListType } from "graphql";
import {  CoercibleGraphQLArgument, CoercibleGraphQLInputField, CoercibleGraphQLInputObjectType, Path } from "./types";
import { forEach, addPath } from "./utils";

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
export const coerceFieldArgumentsValues = async <TSource, TContext>(
  field: GraphQLField<TSource, TContext, { [key: string]: any }>,
  values: { [key: string]: any },
  context: TContext,
  fieldResolveInfo: GraphQLResolveInfo,
  onError?: (error: Error) => void,
): Promise<{ [key: string]: any }> => {
  const coercedValues: { [key: string]: any } = {};
  
  await forEach(
    field.args || [],
    async (argDef: CoercibleGraphQLArgument<any, TContext>
  ) => {
    const { name } = argDef;
    const argValue = values[name];
    if (argValue == null) {
      coercedValues[name] = argValue;
      return;
    }

    const coercedArgValue = await coerceArgumentValue(
      argDef,
      argValue,
      context,
      addPath(undefined, name),
      fieldResolveInfo,
      onError
    );

    coercedValues[name] = coercedArgValue
  });

  return coercedValues;
}

const coerceInputValue = async <TContext>(
  def: CoercibleGraphQLInputObjectType<{ [key: string]: any }, TContext>,
  values: { [key: string]: any },
  context: TContext,
  path: Path,
  fieldResolveInfo: GraphQLResolveInfo,
  onError?: (error: Error) => void,
) => {
  let coercedValues: { [key: string]: any } = {};
  const fields = def.getFields();

  await forEach(Object.values(fields), async (field: CoercibleGraphQLInputField<any, TContext>) => {
    const { name } = field;

    const value = values[name];
    if (value == null) {
      coercedValues[name] = value;
      return;
    }

    try {
      coercedValues[name] = await coerceInputFieldValue(
        field,
        value,
        context,
        addPath(path, name),
        fieldResolveInfo,
        onError
      );
    } catch (e) {
      onError?.(e);
    }
  });

  const { coerce = defaultCoercer } = def;

  try {
    coercedValues = await coerce(
      coercedValues,
      context,
      {
        path,
        inputType: null,
      },
      fieldResolveInfo,
    );
  } catch (e) {
    onError?.(e);
  }

  return coercedValues;
}

// coerceArgumentValue and coerceInputFieldValue share
// the same logic
const coerceArgumentValue = async <TValue, TContext>(
  def: CoercibleGraphQLArgument<TValue, TContext>,
  value: any,
  context: TContext,
  path: Path,
  fieldResolveInfo: GraphQLResolveInfo,
  onError?: (error: Error) => void,
) => coerceInputFieldOrArgumentValue(
  def,
  value,
  context,
  path,
  fieldResolveInfo,
  onError,
);

const coerceInputFieldValue = async <TValue, TContext>(
  def: CoercibleGraphQLInputField<TValue, TContext>,
  value: any,
  context: TContext,
  path: Path,
  fieldResolveInfo: GraphQLResolveInfo,
  onError?: (error: Error) => void,
) => coerceInputFieldOrArgumentValue(
  def,
  value,
  context,
  path,
  fieldResolveInfo,
  onError,
);

const coerceInputFieldOrArgumentValue = async <TValue, TContext>(
  def: CoercibleGraphQLInputField<TValue, TContext> | CoercibleGraphQLArgument<TValue, TContext>,
  value: any,
  context: TContext,
  path: Path,
  fieldResolveInfo: GraphQLResolveInfo,
  onError?: (error: Error) => void,
) => {
  let coercedValue: any;

  const nullableType = getNullableType(def.type);

  if (isInputObjectType(nullableType)) {
    value = await coerceInputValue(
      nullableType,
      value,
      context,
      path,
      fieldResolveInfo,
      onError
    );
  } else if (isListType(nullableType)) {
    if (!Array.isArray(value)) throw new Error('Should be an array');

    const nonNullableItemType = getNullableType(nullableType.ofType);
    if (isInputObjectType(nonNullableItemType)) {
      value = await Promise.all(
        value.map((itemValue, index) => coerceInputValue(
          nonNullableItemType,
          itemValue,
          context,
          addPath(path, index),
          fieldResolveInfo,
          onError
        ))
      );
    }
  };

  const { coerce = defaultCoercer } = def;
  try {
    coercedValue = await coerce(
      value,
      context,
      {
        inputType: def.type,
        path,
      },
      fieldResolveInfo,
    );
  } catch (e) {
    onError?.(e);
  }

  return coercedValue;
}
