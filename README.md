# graphql-field-arguments-coercion

Utility to implement directive-based validation and transform of argument values in GraphQL. 

## Install

```sh
npm install graphql-field-arguments-coercion -D
```

## Usage

Use `coerceFieldArgumentsValues(field, args, ...)` to coerce the arguments of the given field. To coerce the arguments' values, it will recusrsively use the `coerce` property, a coercer function, hold by `ArgumentDefinition`, `InputObject` and `InputObjectField`.

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
      input.coerce = async (value, _, { path }) => {
        // call previous coercers if any
        if (coerce) value = await coerce(value, ...args);

        const { max } = this.args;
        assert.isAtMost(value.length, max, `${pathToArray(path).join('.')} length exceeds ${max}`);

        return value;
      }
  }
}
```

We define the schema as usual and with the directive:

```ts
const typeDefs = `
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

Now we'll wrap all the field's resolvers with a use of `coerceFieldArgumentsValues` so that we make sure the arguments are valid before calling the resolver and throw the appropriate error otherwise.

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
        throw new Error(`Arguments are incorrect: ${coercionErrors.join(',')}`);
      }

      return resolve(parent, coercedArgumentValues, context, info);
    }
  }
}

visitSchema(schema, new FieldResoverWrapperVisitor);
```

todo: add sandbox

The full example is runnable [here]().


## Related
Todo: clean this part
https://github.com/graphql/graphql-js/issues/361
https://github.com/graphql/graphql-js/issues/747