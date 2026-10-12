import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts'],
		rules: {
			'array-bracket-spacing': ['error', 'always'],
			curly: ['error', 'multi'],
			'object-curly-spacing': ['error', 'always'],
			'space-before-blocks': ['error', 'always'],
			'space-before-function-paren': ['error', 'always'],
			yoda: ['error', 'always'],
		},
	},
);
