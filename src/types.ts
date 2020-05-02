import {
  GraphQLInputField,
  GraphQLArgument,
  GraphQLInputObjectType,
  GraphQLResolveInfo,
  GraphQLInputType,
} from 'graphql';

export type Path = {
  prev: Path | undefined,
  key: string | number;
};

/**
 * Information about the current
 * value 
 */
type InputCoerceInfo = {
  inputType: GraphQLInputType | null,
  /**
   * Path to the value being in the given
   * argument values.
   */
  path: Path
}
/**
 * Coerce a value.
 */
export type Coercer<TValue, TContext> = (
  value: TValue,
  context: TContext,
  inputCoerceInfo: InputCoerceInfo,
  /**
   * The `GraphQLResolveInfo` of the field being resolved.
   */
  fieldResolveInfo: GraphQLResolveInfo,
  ) => TValue | Promise<TValue>;

/**
 * A `GraphQLInputField` that can have a `coerce` property with a `Coercer`
 * used to coerce the value of this InputField.
 */
export interface CoercibleGraphQLInputField<TValue, TContext> extends GraphQLInputField {
  coerce?: Coercer<TValue, TContext>
};

/**
 * A `GraphQLArgument` that can have a `coerce` property with a `Coercer`
 * used to coerce the value of this Argument.
 */
export interface CoercibleGraphQLArgument<TValue, TContext> extends GraphQLArgument {
  coerce?: Coercer<TValue, TContext>
};

/**
 * A `GraphQLInputObject` that can have a `coerce` property with a `Coercer`
 * used to coerce the value of this InputObject.
 */
export interface CoercibleGraphQLInputObjectType<TValue, TContext> extends GraphQLInputObjectType {
  coerce?: Coercer<TValue, TContext>
};
