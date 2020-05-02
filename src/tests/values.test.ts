import { GraphQLField, GraphQLOutputType, GraphQLString, GraphQLArgument } from 'graphql';
import delay from 'delay';
import {
  coerceFieldArgumentsValues
} from '../values';

import { makeSchema, getFieldDefinitionByName } from './utils';

describe('Coercion of field arguments', () => {
  describe('of a scalar', () => {
    let coerceSpy: jest.Mock;
    let field: GraphQLField<any, any>;
  
    const typDefs = `type Mutation {
      createBook(
        title: String @coerceSpy
      ): Boolean
    }`;

    beforeEach(() => {
      coerceSpy = jest.fn();
      const schema = makeSchema(typDefs, coerceSpy);
      field = getFieldDefinitionByName(schema, 'createBook');
    });

    it('argument should have been coerced', async () => {
      coerceSpy.mockImplementation((v: string) => v.toUpperCase());

      const coercedArguments = await coerceFieldArgumentsValues(field, { title: 'Le Rouge et le Noir' });

      expect(coerceSpy).toHaveBeenCalledWith('Le Rouge et le Noir');
      expect(coercedArguments).toEqual({ title: 'LE ROUGE ET LE NOIR' });
    });

    it('should report thrown error', async () => {
      const onErrorSpy = jest.fn();

      const error = new Error('hi');
      coerceSpy.mockImplementation(() => { throw error});

      const coercedArguments = await coerceFieldArgumentsValues(
        field,
        { title: 'Le Rouge et le Noir' },
        onErrorSpy
      );

      expect(onErrorSpy).toHaveBeenCalledWith(error);
      expect(coercedArguments).toEqual({});
    });

    describe('async coercion', () => {
      it('argument should have been coerced', async() => {
        coerceSpy.mockImplementation(async (v: string) => {
          await delay(100);
          return v.toUpperCase()
        });

        const coercedArguments = await coerceFieldArgumentsValues(field, { title: 'Le Rouge et le Noir' });

        expect(coerceSpy).toHaveBeenCalledWith('Le Rouge et le Noir');
        expect(coercedArguments).toEqual({ title: 'LE ROUGE ET LE NOIR' });
      });

      it('should report thrown error', async () => {
        const onErrorSpy = jest.fn();

        const error = new Error('hi');
        coerceSpy.mockImplementation(async (v: string) => {
          await delay(100);
          throw error;
        });

        const coercedArguments = await coerceFieldArgumentsValues(
          field,
          { title: 'Le Rouge et le Noir' },
          onErrorSpy
        );

        expect(onErrorSpy).toHaveBeenCalledWith(error);
        expect(coercedArguments).toEqual({});
      });
    });
  });

  describe('of a non-nullable scalar', () => {
    let coerceSpy: jest.Mock;
    let field: GraphQLField<any, any>;

    const typDefs = `type Mutation {
      createBook(
        title: String! @coerceSpy
      ): Boolean
    }`;

    beforeEach(() => {
      coerceSpy = jest.fn();
      const schema = makeSchema(typDefs, coerceSpy);
      field = getFieldDefinitionByName(schema, 'createBook');
    });

    it('argument should have been coerced', async () => {
      coerceSpy.mockImplementation((v: string) => v.toUpperCase());

      const coercedArguments = await coerceFieldArgumentsValues(field, { title: 'Le Rouge et le Noir' });

      expect(coerceSpy).toHaveBeenCalledWith('Le Rouge et le Noir');
      expect(coercedArguments).toEqual({ title: 'LE ROUGE ET LE NOIR' });
    });

  });
  describe('of an enum', () => {
    let coerceSpy: jest.Mock;
    let field: GraphQLField<any, any>;

    const typDefs = `
    enum BookType {
      FANTASY,
      ROMANTIC,
      romantic
    }
    type Mutation {
      createBook(
        type: BookType @coerceSpy
      ): Boolean
    }`;

    beforeEach(() => {
      coerceSpy = jest.fn();
      const schema = makeSchema(typDefs, coerceSpy);
      field = getFieldDefinitionByName(schema, 'createBook');
    });

    it('argument should have been coerced', async () => {
      coerceSpy.mockImplementation((v: string) => v.toUpperCase());

      const coercedArguments = await coerceFieldArgumentsValues(field, { type: 'romantic' });

      expect(coerceSpy).toHaveBeenCalledWith('romantic');
      expect(coercedArguments).toEqual({ type: 'ROMANTIC' });
    });

  });

  describe('of a list', () => {
    let coerceSpy: jest.Mock;
    let field: GraphQLField<any, any>;

    const typDefs = `
    type Mutation {
      createBook(
        tags: [String] @coerceSpy
      ): Boolean
    }`;

    beforeEach(() => {
      coerceSpy = jest.fn();
      const schema = makeSchema(typDefs, coerceSpy);
      field = getFieldDefinitionByName(schema, 'createBook');
    });

    it('argument should have been coerced', async () => {
      coerceSpy.mockImplementation((v: string[]) => v.map(t => t.toLowerCase()));

      const coercedArguments = await coerceFieldArgumentsValues(field,{
        tags: ['classic', 'French']
      });

      expect(coerceSpy).toHaveBeenCalledWith(['classic', 'French']);
      expect(coercedArguments).toEqual({ tags : ['classic', 'french']});
    });

  });

  describe('of an input', () => {
    let coerceSpy: jest.Mock;
    let field: GraphQLField<any, any>;

    const typDefs = `
    input BookInput {
      title: String
    }
    type Mutation {
      createBook(
        book: BookInput @coerceSpy
      ): Boolean
    }`;

    beforeEach(() => {
      coerceSpy = jest.fn();
      const schema = makeSchema(typDefs, coerceSpy);
      field = getFieldDefinitionByName(schema, 'createBook');
    });

    it('argument should have been coerced', async () => {
      coerceSpy.mockImplementation((v) => ({ ...v , _new: true }));

      const coercedArguments = await coerceFieldArgumentsValues(field, {
        book: {
          title: 'Le Rouge et le Noir'
        }
      });

      expect(coerceSpy).toHaveBeenCalledWith({ title: 'Le Rouge et le Noir' });
      expect(coercedArguments).toEqual({
        book: {
          title: 'Le Rouge et le Noir',
          _new: true 
        }
      });
    });

  });
});

describe('Coercion of an input object', () => {
  describe('as field argument', () => {
    let coerceSpy: jest.Mock;
    let field: GraphQLField<any, any>;

    type ImageInput = {
      url?: string,
      file?: Buffer
    }

    const typDefs = `
      scalar Upload

      input ImageInput @coerceSpy {
        url: String,
        file: Upload
      }
    
      type Mutation {
        createBook(
          image: ImageInput!
        ): Boolean
      }
    `;

    beforeEach(() => {
      coerceSpy = jest.fn();
      const schema = makeSchema(typDefs, coerceSpy);
      field = getFieldDefinitionByName(schema, 'createBook');
    });

    it('should coerce value', async () => {
      coerceSpy.mockImplementation(({ url, file }: ImageInput) => {
        return { url, file, _coerced: true };
      });

      const coercedArguments = await coerceFieldArgumentsValues(field, {
        image: {
          url: 'fooooo',
        }
      });

      expect(coerceSpy).toHaveBeenCalledWith({ url: 'fooooo' });
      expect(coercedArguments).toEqual({
        image: {
          url: 'fooooo',
          _coerced: true
        }
      });
    });

    it('should report thrown error', async () => {
      const onErrorSpy = jest.fn();

      const error = new Error('hi');
      coerceSpy.mockImplementation(({ url, file }: ImageInput) => {
        if (!url && !file) throw error;
        if (url && file) throw error;

        return { url , file };
      });

      const image = {
        url: 'fooooo',
        file: Buffer.from('blah'),
      };

      const coercedArguments = await coerceFieldArgumentsValues(field, {
        image
      }, onErrorSpy);

      expect(coerceSpy).toHaveBeenCalledWith(image);
      expect(onErrorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('as input field', () => {
    let coerceSpy: jest.Mock;
    let field: GraphQLField<any, any>;

    type ImageInput = {
      url?: string,
      file?: Buffer
    }

    const typDefs = `
      scalar Upload

      input ImageInput @coerceSpy {
        url: String,
        file: Upload
      }

      input BookInput {
        image: ImageInput,
      }
    
      type Mutation {
        createBook(
          book: BookInput
        ): Boolean
      }
    `;

    beforeEach(() => {
      coerceSpy = jest.fn();
      const schema = makeSchema(typDefs, coerceSpy);
      field = getFieldDefinitionByName(schema, 'createBook');
    });


    it('should coerce value', async () => {
      coerceSpy.mockImplementation((input: ImageInput) => {
        return { ...input, _coerced: true };
      });

      const coercedArguments = await coerceFieldArgumentsValues(field, {
        book: {
          image: {
            url: 'fooooo',
          }
        }
      });

      expect(coerceSpy).toHaveBeenCalledWith({ url: 'fooooo' });
      expect(coercedArguments).toEqual({
        book: {
          image: {
            url: 'fooooo',
            _coerced: true
          }
        }
      });
    });

  });
});

describe('Coercion of input field', () => {
  let coerceSpy: jest.Mock;
  let field: GraphQLField<any, any>;

  const typDefs = `
  input BookInput {
    title: String @coerceSpy
  }
  type Mutation {
    createBook(
      book: BookInput
    ): Boolean
  }`;

  beforeEach(() => {
    coerceSpy = jest.fn();
    const schema = makeSchema(typDefs, coerceSpy);
    field = getFieldDefinitionByName(schema, 'createBook');
  });

  it('argument should have been coerced', async () => {
    coerceSpy.mockImplementation((v: string) => v.toUpperCase());

    const coercedArguments = await coerceFieldArgumentsValues(field, {
      book: {
        title: 'Le Rouge et le Noir'
      }
    });

    expect(coerceSpy).toHaveBeenCalledWith('Le Rouge et le Noir');
    expect(coercedArguments).toEqual({
      book: { 
        title: 'LE ROUGE ET LE NOIR'
      }
    });
  });
  it('should report thrown error', async () => {
    const onErrorSpy = jest.fn();

    const error = new Error('hi');
    coerceSpy.mockImplementation(() => { throw error });

    const coercedArguments = await coerceFieldArgumentsValues(
      field,
      {
        book: {
          title: 'Le Rouge et le Noir'
        }
      },
      onErrorSpy
    );

    expect(onErrorSpy).toHaveBeenCalledWith(error);
    expect(coercedArguments).toEqual({book: {}});
  });

});