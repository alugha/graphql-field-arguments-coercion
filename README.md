# graphql-field-arguments-coercion

[![npm version](https://badge.fury.io/js/graphql-field-arguments-coercion.svg)](https://badge.fury.io/js/graphql-field-arguments-coercion)

Implementation of the support of coerce function on GraphQL Input types.

Used to implement directive-based validation and transformation of field arguments.

Originally developed by [Alexandre Lacheze](https://github.com/alexstrat/) who was kind enough to transfer the repository and npm package for future development.

## Install

```sh
npm install graphql-field-arguments-coercion -D
```

## Usage

Use `coerceFieldArgumentsValues(field, args, ...)` to coerce the arguments of the given field. To coerce the arguments' values, it will recursively use the `coerce` property, a coercer function, hold by `ArgumentDefinition`, `InputObject` and `InputObjectField`.

A coercer function receives 4 arguments:
- `value`: the value to be coerced.
- `context`: the `GraphQLContext` of the current execution
- `inputCoerceInfo`: an object holding info about the current argument, input or input field. See its type definition for more details.
- `fieldResolveInfo`: the received `GraphQLResolveInfo` of the field being resolved.

A coercer function can return the coerced value, a promise resolving the coerced value or throw an error.

### Example
Here's an implementation of a directive-based length validation `@length(max: Int!)`:

First, we need to add the coercer to evey argument definition and input definition targeted by the directive. To do so, we use `graphql-tools`'s `SchemaDirectiveVisitor`.

```ts
const directiveTypeDefs =  `
directive @length(max: Int!) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
`;

class LengthDirective<TContext> extends SchemaDirectiveVisitor<{ max: number }, TContext> {
  visitInputFieldDefinition(field: CoercibleGraphQLInputField<string, TContext>) {
    this.installCoercer(field);
  }

  visitArgumentDefinition(argument: CoercibleGraphQLArgument<string, TContext>) {
    this.installCoercer(argument);
  }

  installCoercer(
    input: 
      CoercibleGraphQLInputField<string, TContext> |
      CoercibleGraphQLArgument<string, TContext>
    ) {
      const { coerce = defaultCoercer } = input;
      input.coerce = async (value, ...args) => {
        // call previous coercers if any
        if (coerce) value = await coerce(value, ...args);

        const { path } = args[1]; // inputCoerceInfo
        const { max } = this.args;
        assert.isAtMost(value.length, max, `${pathToArray(path).join('.')} length exceeds ${max}`);

        return value;
      }
  }
}
```

We define the schema as usual but add the directive:

```ts
const typeDefs = `
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

const schema = makeExecutableSchema({
  typeDefs: [directiveTypeDefs, typeDefs],
  resolvers: {
    Mutation: {
      createBook: (_, { book }) => book,
    }
  },
  schemaDirectives: {
    length: LengthDirective
  }
});
```

Now we'll wrap all fields' resolvers with a use of `coerceFieldArgumentsValues` so that we make sure the arguments are valid before calling the resolver — otherwise, we throw the appropriate error.

To do so, we'll use `graphql-tools`'s `visitSchema` and `SchemaVisitor`:

```ts
class FieldResoverWrapperVisitor<TContext> extends SchemaVisitor {
  visitFieldDefinition(field: GraphQLField<any, TContext>) {
    const { resolve = defaultFieldResolver } = field;
    field.resolve = async (parent, argumentValues, context, info) => {

      const coercionErrors: Error[] = [];
      const onCoercionError = e => coercionErrors.push(e);

      const coercedArgumentValues = await coerceFieldArgumentsValues(
        field,
        argumentValues,
        context,
        info,
        onCoercionError,
      );

      if (coercionErrors.length > 0) {
        throw new UserInputError(`Arguments are incorrect: ${coercionErrors.join(',')}`);
      }

      return resolve(parent, coercedArgumentValues, context, info);
    }
  }
}

visitSchema(schema, new FieldResoverWrapperVisitor);
```

The full example is runnable [here](https://codesandbox.io/s/graphql-field-arguments-coercion-usage-gjppl?file=/index.ts).


## Related

- Validation in Input types proposal [(graphql-js#361)](https://github.com/graphql/graphql-js/issues/361)
- Support resolve on Input types [(graphql-js#747)](https://github.com/graphql/graphql-js/issues/747)
- Directive visitArgumentDefinition variable healing [(graphql-tools#789)](https://github.com/ardatan/graphql-tools/issues/789)
- SchemaDirectiveVisitor.visitInputFieldDefinition resolver doesn't fire [(graphql-tools#858)](https://github.com/ardatan/graphql-tools/issues/858)
