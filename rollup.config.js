import terser from '@rollup/plugin-terser';

export default [
    {
        input: 'src/index.js',
        external: [
            'lexgui',
            'lexgui/extensions/DocMaker.js'
        ],
        output: {
            file: 'build/app.js',
            format: 'esm',
            sourcemap: false,
            plugins: [terser()]
        }
    }
];
