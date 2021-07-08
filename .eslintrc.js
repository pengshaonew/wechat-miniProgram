module.exports = {
  'extends': [
    'airbnb-base',
    'plugin:promise/recommended'
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 9,
    'ecmaFeatures': {
      'jsx': false
    },
    'sourceType': 'module'
  },
  'env': {
    'es6': true,
    'node': true,
    'jest': true
  },
  'plugins': [
    'import',
    'node',
    'promise'
  ],
  'rules': {
    'arrow-parens': 'off',
    'complexity': ['error', 20],
    'func-names': 'off',
    'global-require': 'off',
    'linebreak-style': 'off',
    'no-catch-shadow': 'error',
    'no-else-return': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-shadow': 'off',
    'no-multi-assign': 'off',
    'no-underscore-dangle': 'off',
    'prefer-arrow-callback': 'off',
    'prefer-destructuring': 'off',
    'prefer-template': 'off',
    'no-await-in-loop': 'off',
    'no-restricted-syntax': 'off',
    'promise/always-return': 'off',
  },
  'globals': {
    'window': true,
    'document': true,
    'App': true,
    'Page': true,
    'Component': true,
    'Behavior': true,
    'wx': true,
    'getCurrentPages': true,
  }
}
