import {CallExpression, Expression, JSXElement, KeyValueProperty} from '@swc/core';
import Visitor from '@swc/core/Visitor';
import {createHash} from 'crypto';

const DEFAULT_COMPONENT_NAMES = ['FormattedMessage', 'FormattedHTMLMessage'];
const FUNCTION_NAMES = ['defineMessages', 'formatMessage'];

export function generateOverrideId(defaultMessage: string, description = '') {
  const content = description ? `${defaultMessage}#${description}` : defaultMessage;
  const hasher = createHash('sha1');
  hasher.update(content);
  return hasher.digest('base64').slice(0, 6);
}

export class FormatJsTransformer extends Visitor {
  visitJSXElement(element: JSXElement): JSXElement {
    let openingNameIdentifier: string;
    if (
      element.opening.type === 'JSXOpeningElement' &&
      element.opening.name.type === 'Identifier'
    ) {
      // bare component names, e.g. <FormattedMessage>
      openingNameIdentifier = element.opening.name.value;
    }
    if (
      element.opening.type === 'JSXOpeningElement' &&
      element.opening.name.type === 'JSXMemberExpression'
    ) {
      // nested component names, e.g. <Intl.FormattedMessage>
      openingNameIdentifier = element.opening.name.property.value;
    }
    if (!DEFAULT_COMPONENT_NAMES.includes(openingNameIdentifier)) {
      return element;
    }

    const newElement = JSON.parse(JSON.stringify(element)) as JSXElement;

    const attributes = newElement.opening.attributes;
    let description = '';
    let defaultMessage: string;
    let idIndex: number;

    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      if (
        attribute.type !== 'JSXAttribute' ||
        attribute.name.type !== 'Identifier' ||
        attribute.value.type !== 'StringLiteral'
      ) {
        continue;
      }
      const key = attribute.name.value;
      const value = attribute.value.value;
      if (key === 'description') {
        description = value;
      }
      if (key === 'defaultMessage') {
        defaultMessage = value;
      }
      if (key === 'id') {
        idIndex = i;
      }
    }

    const computedId = generateOverrideId(defaultMessage, description);
    if (idIndex !== undefined) {
      const idAttribute = attributes[idIndex];
      if (
        idAttribute.type === 'JSXAttribute' &&
        idAttribute.name.type === 'Identifier' &&
        idAttribute.value.type === 'StringLiteral'
      ) {
        idAttribute.value.value = computedId;
        // We reset the span width to zero deliberately. Otherwise, the transformer
        // uses the old value to the provided span width.
        idAttribute.value.span.end = idAttribute.value.span.start;
      }
    } else {
      const lastAttribute = attributes[attributes.length - 1];
      if (
        lastAttribute.type === 'JSXAttribute' &&
        lastAttribute.name.type === 'Identifier' &&
        lastAttribute.value.type === 'StringLiteral'
      ) {
        const lastSpanEnd = lastAttribute.value.span.end;
        attributes.push({
          type: 'JSXAttribute',
          span: {
            start: 30,
            end: 50,
            ctxt: 0,
          },
          name: {
            type: 'Identifier',
            span: {
              start: lastSpanEnd + 1,
              end: lastSpanEnd + 1,
              ctxt: 0,
            },
            value: 'id',
            optional: false,
          },
          value: {
            type: 'StringLiteral',
            span: {
              start: lastSpanEnd + 1,
              end: lastSpanEnd + 1,
              ctxt: 0,
            },
            value: computedId,
            has_escape: false,
          },
        });
      }
    }

    return newElement;
  }

  visitCallExpression(expression: CallExpression): Expression {
    let calleeIdentifier: string;
    if (expression.callee.type === 'Identifier') {
      // direct calls to e.g. `formatMessage`
      calleeIdentifier = expression.callee.value;
    }
    if (
      expression.callee.type === 'MemberExpression' &&
      expression.callee.property.type === 'Identifier'
    ) {
      // nested calls to e.g. `intl.formatMessage`
      calleeIdentifier = expression.callee.property.value;
    }
    if (!FUNCTION_NAMES.includes(calleeIdentifier)) {
      return expression;
    }

    const newExpression = JSON.parse(JSON.stringify(expression)) as CallExpression;
    const argsExpression = newExpression.arguments[0].expression;
    if (argsExpression.type !== 'ObjectExpression') {
      return expression;
    }

    // Inspect the first property on the list to determine whether
    // expression.arguments[0].expression.properties is a nested list
    // of keyed messages, or a single message.
    const firstProperty = argsExpression.properties[0];
    if (firstProperty.type !== 'KeyValueProperty') {
      return expression;
    }
    if (firstProperty.value.type === 'ObjectExpression') {
      // then this is a nested list of keyed properties
      for (let i = 0; i < argsExpression.properties.length; i++) {
        const keyedProperty = argsExpression.properties[i];
        if (
          keyedProperty.type !== 'KeyValueProperty' ||
          keyedProperty.value.type !== 'ObjectExpression'
        ) {
          continue;
        }
        transformMessage(keyedProperty.value.properties as KeyValueProperty[]);
      }
    } else {
      // this is a single message object
      transformMessage(argsExpression.properties as KeyValueProperty[]);
    }

    return newExpression;
  }
}

/**
 * Take a "message" -- a.k.a. something which originally looks like
 * { id: "foo", defaultMessage: "bar" }
 * and which is expressed in the AST as an array of key-value properties
 * and either override the ID property or append a new ID property.
 */
function transformMessage(properties: KeyValueProperty[]) {
  let description = '';
  let defaultMessage: string;
  let idIndex: number;

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (
      property.type !== 'KeyValueProperty' ||
      property.key.type !== 'Identifier' ||
      property.value.type !== 'StringLiteral'
    ) {
      return;
    }
    const key = property.key.value;
    const value = property.value.value;
    if (key === 'description') {
      description = value;
    }
    if (key === 'defaultMessage') {
      defaultMessage = value;
    }
    if (key === 'id') {
      idIndex = i;
    }
  }

  const computedId = generateOverrideId(defaultMessage, description);
  if (idIndex !== undefined) {
    const idProperty = properties[idIndex];
    if (
      idProperty.type === 'KeyValueProperty' &&
      idProperty.key.type === 'Identifier' &&
      idProperty.value.type === 'StringLiteral'
    ) {
      idProperty.value.value = computedId;
      // We reset the span width to zero deliberately. Otherwise, the transformer
      // uses the old value to the provided span width.
      idProperty.value.span.end = idProperty.value.span.start;
    }
  } else {
    const lastProperty = properties[properties.length - 1];
    if (
      lastProperty.type === 'KeyValueProperty' &&
      lastProperty.key.type === 'Identifier' &&
      lastProperty.value.type === 'StringLiteral'
    ) {
      const lastSpanEnd = lastProperty.value.span.end;
      properties.push({
        type: 'KeyValueProperty',
        key: {
          type: 'Identifier',
          span: {
            start: lastSpanEnd + 1,
            end: lastSpanEnd + 1,
            ctxt: 0,
          },
          value: 'id',
          optional: false,
        },
        value: {
          type: 'StringLiteral',
          span: {
            start: lastSpanEnd + 1,
            end: lastSpanEnd + 1,
            ctxt: 0,
          },
          value: computedId,
          has_escape: false,
        },
      });
    }
  }
}
