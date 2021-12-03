import {CallExpression, Expression, JSXElement} from '@swc/core';
import Visitor from '@swc/core/Visitor';
import {createHash} from 'crypto';

const DEFAULT_COMPONENT_NAMES = ['FormattedMessage', 'FormattedHTMLMessage'];
const FUNCTION_NAMES = ['defineMessages'];

export function generateOverrideId(defaultMessage: string, description = '') {
  const content = description ? `${defaultMessage}#${description}` : defaultMessage;
  const hasher = createHash('sha1');
  hasher.update(content);
  return hasher.digest('base64').slice(0, 6);
}

export class FormatJsTransformer extends Visitor {
  visitJSXElement(element: JSXElement): JSXElement {
    if (
      element.opening.type !== 'JSXOpeningElement' ||
      element.opening.name.type !== 'Identifier' ||
      !DEFAULT_COMPONENT_NAMES.includes(element.opening.name.value)
    ) {
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
    if (
      expression.callee.type !== 'Identifier' ||
      !FUNCTION_NAMES.includes(expression.callee.value)
    ) {
      return expression;
    }

    const newExpression = JSON.parse(JSON.stringify(expression)) as CallExpression;

    const argsExpression = newExpression.arguments[0].expression;
    if (argsExpression.type !== 'ObjectExpression') {
      return expression;
    }

    const messages = argsExpression.properties;
    for (const message of messages) {
      if (
        message.type !== 'KeyValueProperty' ||
        message.key.type !== 'Identifier' ||
        message.value.type !== 'ObjectExpression'
      ) {
        continue;
      }

      const messageProperties = message.value.properties;
      let description = '';
      let defaultMessage: string;
      let idIndex: number;

      for (let i = 0; i < messageProperties.length; i++) {
        const property = messageProperties[i];
        if (
          property.type !== 'KeyValueProperty' ||
          property.key.type !== 'Identifier' ||
          property.value.type !== 'StringLiteral'
        ) {
          continue;
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
        const idProperty = messageProperties[idIndex];
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
        const lastProperty = messageProperties[messageProperties.length - 1];
        if (
          lastProperty.type === 'KeyValueProperty' &&
          lastProperty.key.type === 'Identifier' &&
          lastProperty.value.type === 'StringLiteral'
        ) {
          const lastSpanEnd = lastProperty.value.span.end;
          messageProperties.push({
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

    return newExpression;
  }
}
