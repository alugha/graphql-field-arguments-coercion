import { CoercibleGraphQLInputField, defaultCoercer, CoercibleGraphQLArgument, coerceFieldArgumentsValues } from './src';
import { assert } from 'chai';
import { SchemaDirectiveVisitor, makeExecutableSchema, visitSchema, SchemaVisitor } from 'graphql-tools';
import { GraphQLField, defaultFieldResolver, graphql } from 'graphql';

const typeDefs = `
directive @length(max: Int!) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

type Query {
  books: [Book]
}

type Book {
  title: String
}

type Mutation {
  createBook(book: BookInput): Book
}

input BookInput {
  title: String! @length(max: 50)
}`;

class LengthDirective extends SchemaDirectiveVisitor<{ max: number }> {
  visitInputFieldDefinition(field: CoercibleGraphQLInputField<string>) {
    const { coerce } = field;
    field.coerce = async (value, ...args) => {
      // called other coercers
      if (coerce) value = await coerce(value, ...args);
      assert.isAtMost(value.length, this.args.max);
      return value;
    }
  }

  visitArgumentDefinition(argument: CoercibleGraphQLArgument<string>) {
    const { coerce = defaultCoercer } = argument;
    argument.coerce = async (value, ...args) => {
      // called other coercers
      if (coerce) value = await coerce(value, ...args);
      assert.isAtMost(value.length, this.args.max);
      return value;
    }
  }

  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    field.resolve = async (...args) => {
      const value = await resolve(...args);
      value && assert.isAtMost(value.length, this.args.max);
      return value;
    }
  }
}


const schema = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Mutation: {
      createBook: (_, { book }) => book,
    }
  },
  schemaDirectives: {
    // @ts-ignore
    length: LengthDirective
  }
});

class FieldResoverWrapperVisitor extends SchemaVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    field.resolve = async (parent, argumentValues, context, info) => {
      const coercionErrors: Error[] = [];
      const coercedArgumentValues = await coerceFieldArgumentsValues(
        field,
        argumentValues,
        e => coercionErrors.push(e)
      );

      if (coercionErrors.length > 0) {
        throw new Error(`Arguments are incorrect: ${coercionErrors.join(',')}`);
      }
      return resolve(parent, coercedArgumentValues, context, info);
    }
  }
}

visitSchema(schema, new FieldResoverWrapperVisitor);

const query = `
mutation {
  createBook(book: {
    title: "sfsdfsdfsdfsdfsdfsdfsdfsdfsdfsdfsdjdjjdjddjdfsdfsdfsdfsdfdsfds"
  }) {
    title
  }
}
`

graphql(schema, query).then(res => console.log(res));
