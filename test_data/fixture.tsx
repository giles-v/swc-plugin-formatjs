import {defineMessages, FormattedMessage} from 'react-intl';
import React from 'react';

export const foo1 = <FormattedMessage defaultMessage="a" description="b" />;

export const foo2 = <Intl.FormattedMessage defaultMessage="a" description="b" />;

export const msgs = defineMessages({
  bar: {
    defaultMessage: 'c',
    description: 'd',
  },
});

export const x = _i18N.intl.formatMessage({
  defaultMessage: 'e',
});

export const y = formatMessage({
  defaultMessage: 'e',
});
