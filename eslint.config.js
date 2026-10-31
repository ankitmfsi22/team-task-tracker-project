import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const TICKET_ID = /\bDEV-\d+\b/;
const DISABLE_DIRECTIVE = /^\s*eslint-disable(?:-next-line|-line)?\b/;

// Local rule: every eslint-disable directive must cite a ticket ID such as DEV-1234.
const requireTicketId = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      missingTicket: 'eslint-disable requires a ticket ID (for example DEV-1234) in the comment.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (DISABLE_DIRECTIVE.test(comment.value) && !TICKET_ID.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'missingTicket' });
          }
        }
      },
    };
  },
};

export default defineConfig(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/generated/**'] },
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,js,mjs}'],
    plugins: { local: { rules: { 'require-ticket-id': requireTicketId } } },
    rules: {
      'local/require-ticket-id': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
    },
  },
);
