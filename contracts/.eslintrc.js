module.exports = {
    ...require('../.eslintrc.js'),
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
};
