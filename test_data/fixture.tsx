import {defineMessages, FormattedMessage} from 'react-intl';
import React from 'react';

export const foo = <FormattedMessage defaultMessage="a" description="b" />;

export const msgs = defineMessages({
  bar: {
    defaultMessage: 'c',
    description: 'd',
  },
});
