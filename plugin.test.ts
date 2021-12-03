import fs from 'fs';
import path from 'path';
import {Options, transformSync, transformFile} from '@swc/core';
import {FormatJsTransformer, generateOverrideId} from './plugin';

const swcConfig: Options = {
  jsc: {
    parser: {
      syntax: 'typescript',
      tsx: true,
      decorators: true,
    },
    target: 'es2016',
  },
  plugin: (m) => new FormatJsTransformer().visitProgram(m),
};
const fooId = generateOverrideId('foo');

describe('FormatJsTransformer', () => {
  describe('transformFile', () => {
    it('provides a computed id when one is missing', async () => {
      const expectedOut = fs.readFileSync(
        path.join(__dirname, 'test_data', 'fixture_out.js.txt'),
        'utf-8'
      );
      const out = await transformFile(path.join(__dirname, 'test_data', 'fixture.tsx'), swcConfig);
      expect(out.code.trim()).toEqual(expectedOut);
    });
  });
  describe('transformSync', () => {
    describe('<FormattedMessage>', () => {
      it('provides a computed id when one is missing', () => {
        const out = transformSync(
          'const msg = <FormattedMessage defaultMessage="foo" />;',
          swcConfig
        );
        expect(out.code.trim())
          .toEqual(`const msg = /*#__PURE__*/ React.createElement(FormattedMessage, {
    defaultMessage: "foo",
    id: "${fooId}"
});`);
      });
      it('overrides an existing ID', () => {
        const out = transformSync(
          'const msg = <FormattedMessage id="abc" defaultMessage="foo" />;',
          swcConfig
        );
        expect(out.code.trim())
          .toEqual(`const msg = /*#__PURE__*/ React.createElement(FormattedMessage, {
    id: "${fooId}",
    defaultMessage: "foo"
});`);
      });
    });
    describe('<FormattedHTMLMessage>', () => {
      it('provides a computed id when one is missing', () => {
        const out = transformSync(
          'const msg = <FormattedHTMLMessage defaultMessage="foo" />;',
          swcConfig
        );
        expect(out.code.trim())
          .toEqual(`const msg = /*#__PURE__*/ React.createElement(FormattedHTMLMessage, {
    defaultMessage: "foo",
    id: "${fooId}"
});`);
      });
      it('overrides an existing ID', () => {
        const out = transformSync(
          'const msg = <FormattedHTMLMessage id="abc" defaultMessage="foo" />;',
          swcConfig
        );
        expect(out.code.trim())
          .toEqual(`const msg = /*#__PURE__*/ React.createElement(FormattedHTMLMessage, {
    id: "${fooId}",
    defaultMessage: "foo"
});`);
      });
    });
    describe('defineMessages', () => {
      it('provides a computed id when one is missing', () => {
        const out = transformSync(
          "const msgs = defineMessages({ bar: { defaultMessage: 'foo' }, });",
          swcConfig
        );
        expect(out.code.trim()).toEqual(`const msgs = defineMessages({
    bar: {
        defaultMessage: 'foo',
        id: "${fooId}"
    }
});`);
      });
      it('overrides an existing ID', () => {
        const out = transformSync(
          "const msgs = defineMessages({ bar: { id: 'aaaaaa', defaultMessage: 'foo' }, });",
          swcConfig
        );
        expect(out.code.trim()).toEqual(`const msgs = defineMessages({
    bar: {
        id: "${fooId}",
        defaultMessage: 'foo'
    }
});`);
      });
    });
  });
});
