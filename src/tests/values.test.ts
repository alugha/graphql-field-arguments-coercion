import { GraphQLField, GraphQLOutputType, GraphQLString, GraphQLArgument, GraphQLResolveInfo } from 'graphql';
import delay from 'delay';
import {
  coerceFieldArgumentsValues
} from '../values';

import { makeSchema, getFieldDefinitionByName } from './utils';
import { pathToArray } from '../utils';


const whateverContext = Symbol('context');
// @ts-ignore we won't really use this so we'll use a placeholder for which we can test equality
const whateverResolveInfo = Symbol('fieldInfo') as GraphQLResolveInfo;

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

      const coercedArguments = await coerceFieldArgumentsValues(
        field,
        { title: 'Le Rouge et le Noir' },
        whateverContext,
        whateverResolveInfo,
      );

      expect(coerceSpy).toHaveBeenCalled();
      expect(coerceSpy.mock.calls[0][0]).toEqual('Le Rouge et le Noir');
      const { path } = coerceSpy.mock.calls[0][2];
      expect(pathToArray(path)).toEqual(['title']);
      expect(coerceSpy.mock.calls[0][3]).toEqual(whateverResolveInfo);

      expect(coercedArguments).toEqual({ title: 'LE ROUGE ET LE NOIR' });
    });

    it('should report thrown error', async () => {
      const onErrorSpy = jest.fn();

      const error = new Error('hi');
      coerceSpy.mockImplementation(() => { throw error});

      const coercedArguments = await coerceFieldArgumentsValues(
        field,
        { title: 'Le Rouge et le Noir' },
        whateverContext,
        whateverResolveInfo,
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

        const coercedArguments = await coerceFieldArgumentsValues(
          field,
          { title: 'Le Rouge et le Noir' },
          whateverContext,
          whateverResolveInfo,
        );

        expect(coerceSpy).toHaveBeenCalled();
        expect(coerceSpy.mock.calls[0][0]).toEqual('Le Rouge et le Noir');
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
          whateverContext,
          whateverResolveInfo,

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

      const coercedArguments = await coerceFieldArgumentsValues(
        field,
        { title: 'Le Rouge et le Noir' },
        whateverContext,
        whateverResolveInfo,
      );
      
      expect(coerceSpy).toHaveBeenCalled();
      expect(coerceSpy.mock.calls[0][0]).toEqual('Le Rouge et le Noir');
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

      const coercedArguments = await coerceFieldArgumentsValues(
        field,
        { type: 'romantic' },
        whateverContext,
        whateverResolveInfo,
      );

      expect(coerceSpy).toHaveBeenCalled();
      expect(coerceSpy.mock.calls[0][0]).toEqual('romantic');
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

      const coercedArguments = await coerceFieldArgumentsValues(
        field,
        { tags: ['classic', 'French'] },
        whateverContext,
        whateverResolveInfo,
       );

      expect(coerceSpy).toHaveBeenCalled();
      expect(coerceSpy.mock.calls[0][0]).toEqual(['classic', 'French']);
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
      },
        whateverContext,
        whateverResolveInfo,
      );

      expect(coerceSpy).toHaveBeenCalled();
      expect(coerceSpy.mock.calls[0][0]).toEqual({ title: 'Le Rouge et le Noir' });
      const { path } = coerceSpy.mock.calls[0][2];
      expect(pathToArray(path)).toEqual(['book']);

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

      const coercedArguments = await coerceFieldArgumentsValues(
        field,
        {
          image: {
            url: 'fooooo',
          }
        },
        whateverContext,
        whateverResolveInfo,
      );

      expect(coerceSpy).toHaveBeenCalled();
      expect(coerceSpy.mock.calls[0][0]).toEqual({ url: 'fooooo' });
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

      const coercedArguments = await coerceFieldArgumentsValues(
        field,
        { image },
        whateverContext,
        whateverResolveInfo,
        onErrorSpy
      );
      
      expect(coerceSpy).toHaveBeenCalled();
      expect(coerceSpy.mock.calls[0][0]).toEqual(image);
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

      const coercedArguments = await coerceFieldArgumentsValues(field,
        {
          book: {
            image: {
              url: 'fooooo',
            }
          }
        },
        whateverContext,
        whateverResolveInfo,
      );

      expect(coerceSpy).toHaveBeenCalled();
      expect(coerceSpy.mock.calls[0][0]).toEqual({ url: 'fooooo' });
      const { path } = coerceSpy.mock.calls[0][2];
      expect(pathToArray(path)).toEqual(['book', 'image']);

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

  describe('as in a list', () => {
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
          illustrations: [ImageInput]
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
        illustrations: [
          {
            url: 'fooooo',
          },
          {
            url: 'barrr',
          },
        ],
      },
        whateverContext,
        whateverResolveInfo,
      );

      expect(coerceSpy).toHaveBeenCalledTimes(2);
      // first call
      expect(coerceSpy.mock.calls[0][0]).toEqual({ url: 'fooooo' });
      const { path: path1 } = coerceSpy.mock.calls[0][2];
      expect(pathToArray(path1)).toEqual(['illustrations', 0]);

      // second calll
      const { path: path2 } = coerceSpy.mock.calls[1][2];
      expect(pathToArray(path2)).toEqual(['illustrations', 1]);
      expect(coerceSpy.mock.calls[1][0]).toEqual({ url: 'barrr' });


      expect(coercedArguments).toEqual({
        illustrations: [
          {
            url: 'fooooo',
            _coerced: true
          },
          {
            url: 'barrr',
            _coerced: true
          },
          ],
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

  it('value should have been coerced', async () => {
    coerceSpy.mockImplementation((v: string) => v.toUpperCase());

    const coercedArguments = await coerceFieldArgumentsValues(field, {
      book: {
        title: 'Le Rouge et le Noir'
      }
    },
      whateverContext,
      whateverResolveInfo,
    );

    expect(coerceSpy).toHaveBeenCalled();
    expect(coerceSpy.mock.calls[0][0]).toEqual('Le Rouge et le Noir');
    const { path } = coerceSpy.mock.calls[0][2];
    expect(pathToArray(path)).toEqual(['book', 'title']);

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
      whateverContext,
      whateverResolveInfo,
      onErrorSpy
    );

    expect(onErrorSpy).toHaveBeenCalledWith(error);
    expect(coercedArguments).toEqual({book: {}});
  });

});