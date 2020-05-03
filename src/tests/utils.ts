import { SchemaDirectiveVisitor, makeExecutableSchema, visitSchema, SchemaVisitor } from 'graphql-tools';
import { GraphQLField, defaultFieldResolver, GraphQLError, execute, graphql, GraphQLSchema } from 'graphql';
import { CoercibleGraphQLInputField, CoercibleGraphQLArgument, Coercer } from '..';
import { CoercibleGraphQLInputObjectType } from '../types';

const coerceSpyTypeDefs = `
directive @coerceSpy on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION | INPUT_OBJECT
`;

export const makeSchema = <TContext, T = unknown>(
  typeDefs: string,
  coerceSpy: Coercer<T, TContext>
) => {
  class CoerceSpyDirective extends SchemaDirectiveVisitor<{}> {
    visitInputFieldDefinition(field: CoercibleGraphQLInputField<unknown, TContext>) {
      // @ts-ignore
      field.coerce = coerceSpy;
    }

    visitArgumentDefinition(argument: CoercibleGraphQLArgument<unknown, TContext>) {
      // @ts-ignore
      argument.coerce = coerceSpy;
    }

    visitInputObject(object: CoercibleGraphQLInputObjectType<unknown, TContext>) {
      // @ts-ignore
      object.coerce = coerceSpy;
    }
  };


  return makeExecutableSchema<TContext>({
    typeDefs: [coerceSpyTypeDefs, typeDefs],
    schemaDirectives: {
      // @ts-ignore
      coerceSpy: CoerceSpyDirective,
    }
  });
};

/**
 * Will return a the FieldDefinition from the schema with the given name.
 */
export const getFieldDefinitionByName = (schema: GraphQLSchema, fieldName: string) => {
  const matchingFields: GraphQLField<any, any>[] = []
  class FieldDefExtractor extends SchemaVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
      if (field.name === fieldName) {
        matchingFields.push(field);
      }
    }
  }
  
  visitSchema(schema, new FieldDefExtractor());

  if (matchingFields.length === 0 ) {
    throw new Error(`No field def found matching ${fieldName}`);
  }
  if (matchingFields.length > 1 ) {
    throw new Error(`Several fields matching ${fieldName}`);
  }
  return matchingFields[0];
}
