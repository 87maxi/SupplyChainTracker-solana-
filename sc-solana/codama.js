export default {
    idl: 'target/idl/sc_solana.json',
    before: [],
    scripts: {
        js: {
            from: '@codama/renderers-js',
            args: [
                'src/generated'
            ]
        }
    }
}
