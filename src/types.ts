import {
  GraphQLInputField,
  GraphQLArgument,
  GraphQLInputObjectType,
} from 'graphql';

/**
 * Coerce a value.
 */
// todo: add promise support Promise<T>
// todo: add usefull info as argument like context
export type Coercer<T> = (value: T) => T | Promise<T>;

/**
 * A `GraphQLInputField` that can have a `coerce` property with a `Coercer`
 * used to coerce the value of this InputField.
 */
export interface CoercibleGraphQLInputField<TValue = unknown> extends GraphQLInputField {
  coerce?: Coercer<TValue>
};

/**
 * A `GraphQLArgument` that can have a `coerce` property with a `Coercer`
 * used to coerce the value of this Argument.
 */
export interface CoercibleGraphQLArgument<TValue = unknown> extends GraphQLArgument {
  coerce?: Coercer<TValue>
};

/**
 * A `GraphQLInputObject` that can have a `coerce` property with a `Coercer`
 * used to coerce the value of this InputObject.
 */
export interface CoercibleGraphQLInputObjectType<TValue = unknown> extends GraphQLInputObjectType {
  coerce?: Coercer<TValue>
};
